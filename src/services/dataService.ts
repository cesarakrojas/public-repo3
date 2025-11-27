import type { Transaction } from '../types';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { generateId } from '../utils/idGenerator';
import { reportError, createError, ERROR_MESSAGES } from '../utils/errorHandler';
import { storageCache } from '../utils/performanceUtils';

// Get all transactions from localStorage with error handling and caching
const getTransactions = (): Transaction[] => {
  try {
    // Try cache first
    const cached = storageCache.get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS);
    if (cached) return cached;
    
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    const transactions = Array.isArray(parsed) ? parsed : [];
    
    // Cache the result
    storageCache.set(STORAGE_KEYS.TRANSACTIONS, transactions);
    
    return transactions;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reportError(createError('storage', 'Error al cargar transacciones', errorMsg));
    return [];
  }
};

// Save transactions to localStorage with error handling
const saveTransactions = (transactions: Transaction[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    
    // Invalidate cache
    storageCache.invalidate(STORAGE_KEYS.TRANSACTIONS);
    
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      reportError(createError('storage', ERROR_MESSAGES.STORAGE_FULL, errorMsg));
    } else {
      reportError(createError('storage', 'Error al guardar transacciones', errorMsg));
    }
    
    return false;
  }
};

// Add a transaction
export const addTransaction = async (
  type: 'inflow' | 'outflow',
  description: string,
  amount: number,
  category?: string,
  paymentMethod?: string,
  items?: { productId: string; productName: string; quantity: number; variantName?: string; price: number; }[]
): Promise<Transaction> => {
  const transactions = getTransactions();
  
  const newTransaction: Transaction = {
    id: generateId(),
    type,
    description,
    amount,
    timestamp: new Date().toISOString(),
    category,
    paymentMethod,
    items
  };
  
  transactions.push(newTransaction);
  saveTransactions(transactions);
  
  // Trigger storage event for subscribers
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEYS.TRANSACTIONS,
    newValue: JSON.stringify(transactions)
  }));
  
  return newTransaction;
};

// Get all transactions with filters
export const getTransactionsWithFilters = async (filters: {
  startDate?: string;
  endDate?: string;
  type?: 'inflow' | 'outflow';
  searchTerm?: string;
}): Promise<Transaction[]> => {
  let transactions = getTransactions();
  
  // Filter by date range
  if (filters.startDate) {
    transactions = transactions.filter(t => t.timestamp >= filters.startDate!);
  }
  if (filters.endDate) {
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    transactions = transactions.filter(t => t.timestamp <= endOfDay.toISOString());
  }
  
  // Filter by type
  if (filters.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }
  
  // Filter by search term
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    transactions = transactions.filter(t =>
      t.description.toLowerCase().includes(term) ||
      t.category?.toLowerCase().includes(term)
    );
  }
  
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
