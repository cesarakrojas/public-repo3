import React, { useEffect } from 'react';
import type { Product } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CloseIcon, PencilIcon, TrashIcon } from './icons';

interface ProductDetailViewProps {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onClose,
  onEdit,
  onDelete
}) => {
  useEffect(() => {
    // Reset scroll position to the top of the page
    window.scrollTo(0, 0);
  }, []);

  const isLowStock = product.totalQuantity <= 10;

  return (
    /* MAIN CONTAINER: Matches TransactionView style (Rounded top, shadow, hidden overflow) */
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 rounded-t-[2rem] overflow-hidden shadow-2xl">
      
      {/* 1. COMPACT HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0 z-10">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white ml-2">Producto</h2>
        <button 
          onClick={onClose} 
          className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        
        {/* HERO SECTION: Image & Key Stats */}
        <div className="bg-white dark:bg-slate-800 shadow-sm mb-4">


          {/* Title & Price Block */}
          <div className="px-6 py-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-2">
              {product.name}
            </h1>
            
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(product.price)}
              </span>
            </div>

            {/* Stock Pill */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isLowStock 
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' 
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              {isLowStock ? '⚠️ Stock Bajo: ' : 'Stock Disponible: '} 
              <span className="font-bold ml-1">{product.totalQuantity}</span>
            </div>
          </div>
        </div>

        {/* DETAILS LIST */}
        <div className="bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 px-4">
          {product.description && (
            <div className="py-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Descripción
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 py-4">
             <div>
                <span className="block text-xs text-slate-500 mb-1">Creado</span>
                <span className="text-sm font-medium text-slate-800 dark:text-white">{formatDate(product.createdAt)}</span>
             </div>
             <div>
                <span className="block text-xs text-slate-500 mb-1">Actualizado</span>
                <span className="text-sm font-medium text-slate-800 dark:text-white">{formatDate(product.updatedAt)}</span>
             </div>
          </div>
        </div>

        {/* VARIANTS LIST (If applicable) */}
        {product.hasVariants && product.variants.length > 0 && (
          <div className="mt-4 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 px-4 py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Variantes ({product.variants.length})
            </h3>
            <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700">
              {product.variants.map(variant => (
                <div key={variant.id} className="flex justify-between items-center py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {variant.name}
                    </p>
                    {variant.sku && (
                      <p className="text-xs text-slate-400 font-mono">SKU: {variant.sku}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      variant.quantity <= 5 ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {variant.quantity}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">unds.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Spacer for bottom scroll */}
        <div className="h-6"></div>
      </div>

      {/* 3. COMPACT FOOTER (Action Grid) */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 safe-area-bottom flex-shrink-0">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-xl font-semibold transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
            <span>Eliminar</span>
          </button>
          
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-colors"
          >
            <PencilIcon className="w-5 h-5" />
            <span>Editar</span>
          </button>
        </div>
      </div>

    </div>
  );
};