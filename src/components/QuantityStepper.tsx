import React from 'react';
import type { Product } from '../types';

interface QuantityStepperProps {
  product: Product;
  currentQuantity: number;
  selectedVariantId?: string | undefined;
  onQuantityChange: (newQuantity: number, variantId?: string) => void;
  onVariantChange?: (variantId: string) => void;
}

const QuantityStepper: React.FC<QuantityStepperProps> = ({
  product,
  currentQuantity,
  selectedVariantId,
  onQuantityChange,
  onVariantChange
}) => {
  const maxStock = selectedVariantId
    ? (product.variants.find(v => v.id === selectedVariantId)?.quantity || 0)
    : product.totalQuantity;

  return (
    <div className="flex items-center gap-0">
      {product.hasVariants && product.variants.length > 0 && onVariantChange && (
        <select
          value={selectedVariantId}
          onChange={(e) => onVariantChange(e.target.value)}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {product.variants.map(variant => (
            <option key={variant.id} value={variant.id} disabled={variant.quantity === 0}>
              {variant.name} ({variant.quantity})
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => onQuantityChange(Math.max(0, currentQuantity - 1), selectedVariantId)}
        disabled={currentQuantity === 0}
        className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-lg disabled:opacity-50 transition text-lg font-bold"
      >
        −
      </button>
      <span className="w-10 text-center font-bold text-slate-800 dark:text-white">{currentQuantity}</span>
      <button
        type="button"
        onClick={() => onQuantityChange(currentQuantity + 1, selectedVariantId)}
        disabled={currentQuantity >= maxStock}
        className="w-8 h-8 flex items-center justify-center bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 transition text-lg font-bold"
      >
        +
      </button>
    </div>
  );
};

export default QuantityStepper;
