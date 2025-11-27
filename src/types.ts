export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  variantName?: string;
  price: number;
}

export interface Transaction {
  id: string;
  type: 'inflow' | 'outflow';
  description: string;
  category?: string;
  paymentMethod?: string;
  amount: number;
  timestamp: string;
  items?: TransactionItem[];
}

export interface CategoryConfig {
  enabled: boolean;
  inflowCategories: string[];
  outflowCategories: string[];
}

export interface ProductVariant {
  id: string;
  name: string;
  quantity: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  totalQuantity: number;
  hasVariants: boolean;
  variants: ProductVariant[];
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Reusable product quantity map used by sale/purchase forms
export interface ProductQuantity {
  [productId: string]: {
    quantity: number;
    selectedVariantId?: string;
  };
}

export interface InventoryFilters {
  searchTerm?: string;
  category?: string;
  lowStock?: boolean;
}

export interface DebtEntry {
  id: string;
  type: 'receivable' | 'payable'; // cobro pendiente | pago pendiente
  counterparty: string; // client name or supplier name
  amount: number;
  description: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: string;
  paidAt?: string;
  linkedTransactionId?: string; // links to Transaction.id when paid
  category?: string;
  notes?: string;
}
