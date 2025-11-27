import React, { useState, useRef } from 'react';
import type { Product, ProductQuantity } from '../types';
import { INPUT_BASE_CLASSES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import * as inventoryService from '../services/inventoryService';
import { getTopProducts } from '../utils/commerce';
import QuantityStepper from './QuantityStepper';


interface NewSaleFormProps {
  products: Product[];
  onAddTransaction: (transaction: { description: string; amount: number; type: 'inflow'; category?: string; paymentMethod?: string; items?: { productId: string; productName: string; quantity: number; variantName?: string; price: number; }[] }) => void;
  onClose?: () => void;
  onSuccess?: (title: string, message: string) => void;
}

export const NewSaleForm: React.FC<NewSaleFormProps> = ({ products, onAddTransaction, onClose, onSuccess }) => {
  // Mode State: 'inventory' (default) or 'manual'
  const [mode, setMode] = useState<'inventory' | 'manual'>('inventory');
  
  const [productQuantities, setProductQuantities] = useState<ProductQuantity>({});
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCartConfirmed, setIsCartConfirmed] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Reset states when switching modes
  const handleModeSwitch = (newMode: 'inventory' | 'manual') => {
    setMode(newMode);
    setFormError(null);
    if (newMode === 'manual') {
      setProductQuantities({});
      setIsCartConfirmed(false);
      setSearchTerm('');
    } else {
      setManualDescription('');
      setManualAmount('');
    }
  };

  // Use shared top-products helper

  const filteredProducts = searchTerm.trim()
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : getTopProducts(products);

  const updateProductQuantity = (productId: string, newQuantity: number, variantId?: string) => {
    if (newQuantity === 0) {
      const newQuantities = { ...productQuantities };
      delete newQuantities[productId];
      setProductQuantities(newQuantities);
    } else {
      setProductQuantities({
        ...productQuantities,
        [productId]: {
          quantity: newQuantity,
          selectedVariantId: variantId
        }
      });
    }
  };

  const updateProductVariant = (productId: string, variantId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const variant = product.variants.find(v => v.id === variantId);
    if (variant && variant.quantity > 0) {
      setProductQuantities({
        ...productQuantities,
        [productId]: {
          quantity: 1,
          selectedVariantId: variantId
        }
      });
    }
  };

  const getMaxStock = (product: Product, variantId?: string) => {
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      return variant?.quantity || 0;
    }
    return product.totalQuantity;
  };

  const calculateTotal = () => {
    return Object.entries(productQuantities).reduce((sum, [productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return sum;
      return sum + (product.price * data.quantity);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const itemCount = Object.keys(productQuantities).length;
    const hasManualEntry = manualAmount && parseFloat(manualAmount) > 0;

    // Validation
    if (mode === 'inventory' && itemCount === 0) {
      setFormError('Agrega al menos un producto para la venta.');
      return;
    }
    if (mode === 'manual' && !hasManualEntry) {
      setFormError('Ingresa un monto válido.');
      return;
    }

    // Handle Manual Entry
    if (mode === 'manual') {
      const amount = parseFloat(manualAmount);
      const description = manualDescription.trim() || 'Venta Rápida';

      onAddTransaction({
        description,
        amount,
        type: 'inflow',
        paymentMethod: paymentMethod || undefined
      });

      setManualDescription('');
      setManualAmount('');
      setPaymentMethod('Efectivo');

      if (onSuccess) {
        onSuccess('¡Venta Completada!', `Venta de ${formatCurrency(amount)} registrada`);
      }
      if (onClose) onClose();
      return;
    }

    // Handle Inventory Sale
    // Re-read latest persisted product state to avoid races and validate availability
    const total = calculateTotal();

    const latestProductsMap: Record<string, Product> = {};

    for (const [productId, data] of Object.entries(productQuantities)) {
      const latest = await inventoryService.getProductById(productId);
      if (!latest) {
        setFormError('Producto no encontrado. Actualiza la lista e intenta de nuevo.');
        return;
      }
      latestProductsMap[productId] = latest;

      if (data.selectedVariantId) {
        const variant = latest.variants.find(v => v.id === data.selectedVariantId);
        const available = variant ? variant.quantity : 0;
        if (data.quantity > available) {
          setFormError(`Stock insuficiente para ${latest.name}${variant ? ` (${variant.name})` : ''}. Disponibles: ${available}`);
          return;
        }
      } else {
        const available = latest.totalQuantity;
        if (data.quantity > available) {
          setFormError(`Stock insuficiente para ${latest.name}. Disponibles: ${available}`);
          return;
        }
      }
    }

    // Update inventory for each item using latest persisted quantities
    for (const [productId, data] of Object.entries(productQuantities)) {
      const latest = latestProductsMap[productId];
      if (!latest) continue;

      if (data.selectedVariantId) {
        const variant = latest.variants.find(v => v.id === data.selectedVariantId);
        if (variant) {
          await inventoryService.updateVariantQuantity(
            productId,
            data.selectedVariantId,
            Math.max(0, variant.quantity - data.quantity)
          );
        }
      } else {
        await inventoryService.updateProduct(productId, {
          standaloneQuantity: Math.max(0, latest.totalQuantity - data.quantity)
        });
      }
    }

    const description = itemCount === 1 
      ? `Venta: ${products.find(p => p.id === Object.keys(productQuantities)[0])?.name}${Object.values(productQuantities)[0].quantity > 1 ? ` x${Object.values(productQuantities)[0].quantity}` : ''}`
      : `Venta: ${itemCount} productos`;

    const items = Object.entries(productQuantities).map(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return null;
      
      let variantName: string | undefined;
      if (data.selectedVariantId) {
        const variant = product.variants.find(v => v.id === data.selectedVariantId);
        variantName = variant?.name;
      }
      
      return {
        productId: product.id,
        productName: product.name,
        quantity: data.quantity,
        variantName,
        price: product.price
      };
    }).filter(item => item !== null) as { productId: string; productName: string; quantity: number; variantName?: string; price: number; }[];

    onAddTransaction({
      description,
      amount: total,
      type: 'inflow',
      paymentMethod: paymentMethod || undefined,
      items
    });

    setProductQuantities({});
    setPaymentMethod('Efectivo');
    setSearchTerm('');

    if (onSuccess) {
      const message = itemCount === 1 
        ? `Venta de ${formatCurrency(total)} registrada`
        : `Venta de ${itemCount} productos por ${formatCurrency(total)}`;
      onSuccess('¡Venta Completada!', message);
    }
    
    if (onClose) onClose();
  };

  const handleConfirmCart = () => {
    setFormError(null);
    if (Object.keys(productQuantities).length > 0) {
      setIsCartConfirmed(true);
    } else {
      setFormError('Agrega al menos un producto antes de confirmar');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        
        {/* 1. MODE TOGGLE */}
        <div className="bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl flex mb-4">
            <button
                type="button"
                onClick={() => handleModeSwitch('inventory')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    mode === 'inventory' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Inventario
            </button>
            <button
                type="button"
                onClick={() => handleModeSwitch('manual')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    mode === 'manual' 
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Venta Rápida
            </button>
        </div>

        {/* Validation Error Message */}
        {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formError}
            </div>
        )}

        {/* --- INVENTORY MODE --- */}
        {mode === 'inventory' && (
          <>
            {!isCartConfirmed && (
              <>
                {/* Product Search */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Buscar Producto
                  </label>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o categoría..."
                    className={INPUT_BASE_CLASSES}
                    // AutoFocus removed for better mobile UX
                  />
                  {!searchTerm.trim() && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Top productos más frecuentes
                    </p>
                  )}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                      <p>No se encontraron productos</p>
                    </div>
                  ) : (
                    filteredProducts.map(product => {
                      const productData = productQuantities[product.id];
                      const currentQuantity = productData?.quantity || 0;
                      const selectedVariantId = productData?.selectedVariantId || (product.hasVariants && product.variants.length > 0 ? product.variants[0].id : undefined);
                      const maxStock = getMaxStock(product, selectedVariantId);
                      const isOutOfStock = maxStock === 0;

                      return (
                        <div
                          key={product.id}
                          className={`bg-white dark:bg-slate-800 shadow-md rounded-xl overflow-hidden flex relative ${isOutOfStock ? 'opacity-60' : ''}`}
                        >
                          {/* Image */}
                          <div className="w-24 flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                          </div>

                          {/* Variant selector and stepper handled by QuantityStepper */}

                          {/* Info & Controls */}
                          <div className="flex-1 p-3 flex flex-col justify-between">
                            <div className={product.hasVariants ? "pr-20" : ""}>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                            </div>

                            <div className="flex justify-between items-end gap-3">
                              <div>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(product.price)}</p>
                                <p className={`text-xs ${isOutOfStock ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {isOutOfStock ? 'Agotado' : `Stock: ${maxStock}`}
                                </p>
                              </div>

                              {!isOutOfStock && (
                                <QuantityStepper
                                  product={product}
                                  currentQuantity={currentQuantity}
                                  selectedVariantId={selectedVariantId}
                                  onQuantityChange={(q, variantId) => updateProductQuantity(product.id, q, variantId)}
                                  onVariantChange={(variantId) => updateProductVariant(product.id, variantId)}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Confirm Button */}
                {Object.keys(productQuantities).length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmCart}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg"
                  >
                    Ver Resumen ({Object.keys(productQuantities).length})
                  </button>
                )}
              </>
            )}

            {isCartConfirmed && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-800 dark:text-white">Productos en Carrito</h3>
                  <button
                    type="button"
                    onClick={() => setIsCartConfirmed(false)}
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    Seguir agregando
                  </button>
                </div>
                <div className="space-y-2 mb-3">
                  {Object.entries(productQuantities).map(([productId, data]) => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return null;
                    const variant = data.selectedVariantId ? product.variants.find(v => v.id === data.selectedVariantId) : null;
                    return (
                      <div key={productId} className="flex justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">
                          {product.name} {variant && `(${variant.name})`} x{data.quantity}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {formatCurrency(product.price * data.quantity)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-700 flex justify-between font-bold">
                    <span className="text-slate-800 dark:text-white">Subtotal:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- MANUAL MODE --- */}
        {mode === 'manual' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Descripción
              </label>
              <input
                type="text"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Ej: Servicio de instalación"
                className={INPUT_BASE_CLASSES}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Monto
              </label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className={INPUT_BASE_CLASSES}
              />
            </div>
          </>
        )}

        {/* Payment Method - Always Visible if applicable */}
        {(mode === 'manual' || isCartConfirmed) && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={INPUT_BASE_CLASSES}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cheque">Cheque</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        )}
      </div>

      {/* Footer */}
      {(mode === 'manual' || isCartConfirmed) && (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 pt-6 px-6 space-y-4 bg-white dark:bg-slate-800 pb-6 -mx-6">
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Total a Cobrar:</span>
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {mode === 'manual' 
                  ? formatCurrency(parseFloat(manualAmount || '0')) 
                  : formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
          >
            Cobrar
          </button>
        </div>
      )}
    </form>
  );
};