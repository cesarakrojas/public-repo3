import React, { useState, useEffect, useCallback, memo } from 'react';
import type { Product } from '../types';
import { PlusIcon } from './icons';
import { formatCurrency } from '../utils/formatters';
import * as inventoryService from '../services/inventoryService';
import { CARD_STYLES, CARD_EMPTY_STATE, CARD_INTERACTIVE } from '../utils/styleConstants';
import { useDebouncedValue } from '../utils/performanceUtils';

interface InventoryViewProps {
  viewMode?: 'list' | 'create' | 'edit' | 'detail';
  editingProductId?: string | null;
  onChangeView?: (mode: 'list' | 'create' | 'edit' | 'detail', productId?: string) => void;
}

// Memoized filter controls
interface InventoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  showLowStock: boolean;
  setShowLowStock: (show: boolean) => void;
  categories: string[];
}

const InventoryFilters = memo<InventoryFiltersProps>(({ 
  searchTerm, 
  setSearchTerm, 
  selectedCategory, 
  setSelectedCategory, 
  showLowStock, 
  setShowLowStock, 
  categories 
}) => {
  return (
    <div className={CARD_STYLES}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
          />
          <span className="text-slate-700 dark:text-slate-200">Solo stock bajo</span>
        </label>
      </div>
    </div>
  );
});

InventoryFilters.displayName = 'InventoryFilters';

export const InventoryView: React.FC<InventoryViewProps> = ({ 
  onChangeView 
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Load products
  const loadProducts = useCallback(async () => {
    const filters = {
      searchTerm: debouncedSearchTerm || undefined,
      category: selectedCategory || undefined,
      lowStock: showLowStock || undefined
    };
    const loadedProducts = await inventoryService.getAllProducts(filters);
    setProducts(loadedProducts);
  }, [debouncedSearchTerm, selectedCategory, showLowStock]);

  useEffect(() => {
    loadProducts();
    setCategories(inventoryService.getCategories());

    // Subscribe to changes
    const unsubscribe = inventoryService.subscribeToInventory(() => {
      loadProducts();
      setCategories(inventoryService.getCategories());
    });

    return unsubscribe;
  }, [debouncedSearchTerm, selectedCategory, showLowStock]);

  const handleCreateProduct = () => {
    if (onChangeView) onChangeView('create');
  };

  const handleViewProduct = (product: Product) => {
    if (onChangeView) onChangeView('detail', product.id);
  };

  const getTotalValue = () => {
    return products.reduce((sum, p) => sum + (p.price * p.totalQuantity), 0);
  };

  const getLowStockCount = () => {
    return products.filter(p => p.totalQuantity <= 10).length;
  };

  // Reset scroll position to the top of the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className={CARD_STYLES}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventario</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gestiona tus productos y existencias
            </p>
          </div>
          <button
            onClick={handleCreateProduct}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-emerald-500/30 transition-transform transform hover:scale-105"
          >
            <PlusIcon className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-xl">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Productos</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{products.length}</p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-xl">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Valor Total</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(getTotalValue())}</p>
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/50 p-4 rounded-xl">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Stock Bajo</p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{getLowStockCount()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <InventoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        showLowStock={showLowStock}
        setShowLowStock={setShowLowStock}
        categories={categories}
      />

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className={`col-span-full ${CARD_EMPTY_STATE}`}>
            {/* ... (empty state code remains the same) ... */}
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">No hay productos en el inventario</p>
            <button
              onClick={handleCreateProduct}
              className="mt-4 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Crear tu primer producto
            </button>
          </div>
        ) : (
          products.map(product => {
            // 1. Determine Status Logic per product
            let statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
            let statusText = "En Stock";

            if (product.totalQuantity === 0) {
              statusColor = "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400";
              statusText = "Sin Stock";
            } else if (product.totalQuantity <= 10) {
              statusColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
              statusText = "Stock Bajo";
            }

            return (
              <div
                key={product.id}
                className={`relative ${CARD_INTERACTIVE} overflow-hidden flex bg-white dark:bg-slate-800 rounded-lg shadow-sm h-32`}
                onClick={() => handleViewProduct(product)}
              >
                {/* Product Image */}
                <div className="w-32 h-32 flex-shrink-0 bg-gray-100 dark:bg-slate-700 relative">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className={`w-full h-full object-cover ${product.totalQuantity === 0 ? 'grayscale opacity-70' : ''}`} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                       {/* SVG Icon */}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 p-3 flex flex-col justify-between">
                  
                  {/* --- TOP ROW: Title & Price --- */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {product.category || 'General'}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className="block text-lg font-bold text-slate-800 dark:text-slate-200">
                         {formatCurrency(product.price)}
                      </span>
                    </div>
                  </div>

                  {/* --- BOTTOM ROW: Status Pill & Exact Count --- */}
                  <div className="flex justify-between items-end">
                    
                    {/* LEFT: The Status Pill (Fills the void) */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                      {statusText}
                    </span>

                    {/* RIGHT: Exact Stock Count */}
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Disponibles</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {product.totalQuantity}
                      </p>
                    </div>
                    
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
