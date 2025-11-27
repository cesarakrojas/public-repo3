import React, { useState, useRef } from 'react';
import type { CategoryConfig, Product, ProductQuantity } from '../types';
import { INPUT_BASE_CLASSES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import * as inventoryService from '../services/inventoryService';
import { getTopProducts } from '../utils/commerce';
import QuantityStepper from './QuantityStepper';


interface NewExpenseFormProps {
  onAddTransaction: (transaction: { 
    description: string; 
    amount: number; 
    type: 'outflow'; 
    category?: string; 
    paymentMethod?: string;
    items?: { productId: string; productName: string; quantity: number; variantName?: string; price: number; }[];
  }) => void;
  categoryConfig: CategoryConfig;
  onClose?: () => void;
  onSuccess?: (title: string, message: string, type: 'expense' | 'purchase') => void;
}

export const NewExpenseForm: React.FC<NewExpenseFormProps> = ({ 
  onAddTransaction, 
  categoryConfig, 
  onClose,
  onSuccess
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Product purchase states
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<ProductQuantity>({});
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [isCartConfirmed, setIsCartConfirmed] = useState(false);

  // Derived state for the mode
  const isProductPurchase = category === 'Compra de Productos';

  // Use shared top-products helper

  // Mode Switcher Logic
  const handleModeSwitch = async (mode: 'expense' | 'purchase') => {
    setFormError(null);
    if (mode === 'purchase') {
      setCategory('Compra de Productos');
      const loadedProducts = await inventoryService.getAllProducts();
      setProducts(loadedProducts);
      setProductQuantities({});
      setSearchTerm('');
      setShowProductSelection(true); // Open selection immediately
      setIsCartConfirmed(false);
    } else {
      setCategory('');
      setProducts([]);
      setProductQuantities({});
      setShowProductSelection(false);
      setIsCartConfirmed(false);
    }
  };

  // Handle standard category change (for regular expenses)
  const handleCategoryChange = (newCategory: string) => {
    // Prevent manual selection of "Compra de Productos" via dropdown to enforce the toggle UX
    if (newCategory === 'Compra de Productos') {
        handleModeSwitch('purchase');
    } else {
        setCategory(newCategory);
    }
  };

  const handleConfirmCart = () => {
    setFormError(null);
    if (Object.keys(productQuantities).length > 0) {
      setIsCartConfirmed(true);
      setShowProductSelection(false);
    } else {
      setFormError('Agrega al menos un producto antes de confirmar.');
    }
  };

  const handleEditCart = () => {
    setFormError(null);
    setShowProductSelection(true);
  };

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

    setProductQuantities({
      ...productQuantities,
      [productId]: {
        quantity: 1,
        selectedVariantId: variantId
      }
    });
  };

  const calculateProductsTotal = () => {
    return Object.entries(productQuantities).reduce((sum, [productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return sum;
      return sum + (product.price * data.quantity);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Logic for Product Purchase (Inventory Restock)
    if (isProductPurchase) {
      const itemCount = Object.keys(productQuantities).length;
      if (itemCount === 0) {
        setFormError('Agrega al menos un producto a la compra.');
        return;
      }

      const total = calculateProductsTotal();

      // Update inventory for each item (add to stock)
      for (const [productId, data] of Object.entries(productQuantities)) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        if (data.selectedVariantId) {
          // Update variant quantity
          const variant = product.variants.find(v => v.id === data.selectedVariantId);
          if (variant) {
            await inventoryService.updateVariantQuantity(
              productId,
              data.selectedVariantId,
              variant.quantity + data.quantity
            );
          }
        } else {
          // Update standalone product quantity
          await inventoryService.updateProduct(productId, {
            standaloneQuantity: product.totalQuantity + data.quantity
          });
        }
      }

      // Create transaction description
      const transactionDescription = itemCount === 1 
        ? `Compra: ${products.find(p => p.id === Object.keys(productQuantities)[0])?.name}${Object.values(productQuantities)[0].quantity > 1 ? ` x${Object.values(productQuantities)[0].quantity}` : ''}`
        : `Compra: ${itemCount} productos`;

      // Build items array
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
        description: transactionDescription,
        amount: total,
        type: 'outflow',
        category: 'Compra de Productos',
        paymentMethod: paymentMethod || undefined,
        items
      });

      // Cleanup
      resetForm();

      if (onSuccess) {
        const message = itemCount === 1 
          ? `Compra de ${formatCurrency(total)} registrada`
          : `Compra de ${itemCount} productos por ${formatCurrency(total)}`;
        onSuccess('¡Compra Completada!', message, 'purchase');
      }
      
      if (onClose) onClose();

    } else {
      // Logic for Regular Expense
      if (description.trim() && parseFloat(amount) > 0) {
        const expenseAmount = parseFloat(amount);
        
        onAddTransaction({ 
          description, 
          amount: expenseAmount, 
          type: 'outflow',
          category: category || undefined,
          paymentMethod: paymentMethod || undefined
        });
        
        // Cleanup
        resetForm();
        
        if (onSuccess) {
          onSuccess('¡Gasto Registrado!', `Gasto de ${formatCurrency(expenseAmount)} registrado`, 'expense');
        }
        
        if (onClose) onClose();
      }
    }
  };

  const resetForm = () => {
      setDescription('');
      setCategory('');
      setPaymentMethod('');
      setAmount('');
      setProductQuantities({});
      setProducts([]);
      setSearchTerm('');
      setFormError(null);
  };

  const filteredProducts = isProductPurchase 
    ? (searchTerm.trim()
        ? products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : getTopProducts(products))
    : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        
        {/* 1. EXPLICIT TYPE TOGGLE (New UX) */}
        <div className="bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl flex mb-4">
            <button
                type="button"
                onClick={() => handleModeSwitch('expense')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    !isProductPurchase 
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Gasto Simple
            </button>
            <button
                type="button"
                onClick={() => handleModeSwitch('purchase')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    isProductPurchase 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                + Inventario
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

        {/* Category Selection - Only show for Regular Expenses */}
        {categoryConfig.enabled && !isProductPurchase && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Categoría
            </label>
            <select 
              value={category} 
              onChange={e => handleCategoryChange(e.target.value)} 
              className={INPUT_BASE_CLASSES}
            >
              <option value="">Seleccionar categoría (opcional)</option>
              {categoryConfig.outflowCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Product Purchase Section */}
        {isProductPurchase ? (
          <>
            {showProductSelection && (
              <>
                {/* Product Search - Removed autoFocus for Mobile UX */}
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
                  />
                  {!searchTerm.trim() && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mostrando los 5 productos más frecuentes
                    </p>
                  )}
                </div>

                {/* Product Cards Grid */}
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

                  return (
                    <div
                      key={product.id}
                      className="bg-white dark:bg-slate-800 shadow-md rounded-xl overflow-hidden flex relative"
                    >
                      {/* Product Image */}
                      <div className="w-24 flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        )}
                      </div>

                      {/* Variant selector and quantity stepper rendered by QuantityStepper */}

                      {/* Product Info */}
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div className={product.hasVariants && product.variants.length > 0 ? "pr-20" : ""}>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                        </div>

                        <div className="flex justify-between items-end gap-3">
                          <div>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(product.price)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Stock actual: {product.totalQuantity}</p>
                          </div>

                          <QuantityStepper
                            product={product}
                            currentQuantity={currentQuantity}
                            selectedVariantId={selectedVariantId}
                            onQuantityChange={(q, variantId) => updateProductQuantity(product.id, q, variantId)}
                            onVariantChange={(variantId) => updateProductVariant(product.id, variantId)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

                {/* Confirm Cart Button */}
                <button
                  type="button"
                  onClick={handleConfirmCart}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Ver Resumen ({Object.keys(productQuantities).length})
                </button>
              </>
            )}

            {isCartConfirmed && (
              /* Cart Summary */
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Productos en Compra
                  </h3>
                  <button
                    type="button"
                    onClick={handleEditCart}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold"
                  >
                    + Agregar más
                  </button>
                </div>
                
                <div className="space-y-2 mb-3">
                  {Object.entries(productQuantities).map(([productId, data]) => {
                    const product = products.find(p => p.id === productId);
                    if (!product || data.quantity === 0) return null;
                    const variant = data.selectedVariantId ? product.variants.find(v => v.id === data.selectedVariantId) : null;
                    return (
                      <div key={productId} className="flex justify-between items-center text-sm bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
                        <span className="text-slate-700 dark:text-slate-300">
                          {product.name} {variant && `(${variant.name})`} × {data.quantity}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {formatCurrency(product.price * data.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-red-300 dark:border-red-700 pt-2 flex justify-between items-center font-bold text-slate-800 dark:text-white">
                  <span>Subtotal:</span>
                  <span className="text-lg">{formatCurrency(calculateProductsTotal())}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Regular Expense Fields */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Descripción
              </label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Descripción del gasto" 
                required 
                className={INPUT_BASE_CLASSES}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Monto
              </label>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                placeholder="0.00" 
                min="0.01" 
                step="0.01" 
                required 
                className={INPUT_BASE_CLASSES}
              />
            </div>
          </>
        )}

        {/* Payment Method - Only show for regular expenses OR when cart is confirmed for product purchases */}
        {(!isProductPurchase || isCartConfirmed) && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Método de Pago
            </label>
            <select 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)} 
              className={INPUT_BASE_CLASSES}
            >
              <option value="">Seleccionar medio de pago (opcional)</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cheque">Cheque</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        )}
      </div>

      {/* Fixed Footer: Total and Submit - Only show for regular expenses OR when cart is confirmed for product purchases */}
      {(!isProductPurchase || isCartConfirmed) && (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 pt-6 px-6 space-y-4 bg-white dark:bg-slate-800 pb-6 -mx-6">
          {isProductPurchase && Object.keys(productQuantities).length > 0 && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Total Compra:</span>
                <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(calculateProductsTotal())}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
          >
            {isProductPurchase ? 'Registrar Compra' : 'Registrar Gasto'}
          </button>
        </div>
      )}
    </form>
  );
};