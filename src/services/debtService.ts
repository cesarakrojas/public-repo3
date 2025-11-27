import type { DebtEntry } from '../types';
import * as dataService from './dataService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { generateId } from '../utils/idGenerator';
import { reportError, createError, ERROR_MESSAGES } from '../utils/errorHandler';
import { storageCache } from '../utils/performanceUtils';

const STORAGE_KEY = STORAGE_KEYS.DEBTS;

// Get all debts from localStorage with error handling and caching
const getDebts = (): DebtEntry[] => {
  try {
    // Try cache first
    const cached = storageCache.get<DebtEntry[]>(STORAGE_KEY);
    if (cached) return cached;
    
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    const debts = Array.isArray(parsed) ? parsed : [];
    
    // Cache the result
    storageCache.set(STORAGE_KEY, debts);
    
    return debts;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reportError(createError('storage', 'Error al cargar deudas', errorMsg));
    return [];
  }
};

// Save debts to localStorage with error handling
const saveDebts = (debts: DebtEntry[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
    
    // Invalidate cache
    storageCache.invalidate(STORAGE_KEY);
    
    // Trigger storage event for multi-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(debts)
    }));
    
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      reportError(createError('storage', ERROR_MESSAGES.STORAGE_FULL, errorMsg));
    } else {
      reportError(createError('storage', 'Error al guardar deudas', errorMsg));
    }
    
    return false;
  }
};

// Get all debts with optional filters
export const getAllDebts = (filters?: {
  type?: 'receivable' | 'payable';
  status?: 'pending' | 'paid' | 'overdue';
  searchTerm?: string;
}): DebtEntry[] => {
  let debts = getDebts();

  // Update overdue status
  const now = new Date();
  debts = debts.map(debt => {
    if (debt.status === 'pending' && new Date(debt.dueDate) < now) {
      return { ...debt, status: 'overdue' as const };
    }
    return debt;
  });

  // Filter by type
  if (filters?.type) {
    debts = debts.filter(d => d.type === filters.type);
  }

  // Filter by status
  if (filters?.status) {
    debts = debts.filter(d => d.status === filters.status);
  }

  // Filter by search term
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    debts = debts.filter(d =>
      d.counterparty.toLowerCase().includes(term) ||
      d.description.toLowerCase().includes(term) ||
      d.category?.toLowerCase().includes(term)
    );
  }

  return debts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Get a single debt by ID
export const getDebtById = (debtId: string): DebtEntry | undefined => {
  const debts = getDebts();
  return debts.find(d => d.id === debtId);
};

// Create a new debt
export const createDebt = async (
  type: 'receivable' | 'payable',
  counterparty: string,
  amount: number,
  description: string,
  dueDate: string,
  category?: string,
  notes?: string
): Promise<DebtEntry> => {
  const debts = getDebts();
  
  const newDebt: DebtEntry = {
    id: generateId(),
    type,
    counterparty: counterparty.trim(),
    amount,
    description: description.trim(),
    dueDate,
    status: new Date(dueDate) < new Date() ? 'overdue' : 'pending',
    createdAt: new Date().toISOString(),
    category: category?.trim() || undefined,
    notes: notes?.trim() || undefined
  };
  
  debts.push(newDebt);
  saveDebts(debts);
  
  return newDebt;
};

// Update an existing debt
export const updateDebt = async (
  debtId: string,
  updates: Partial<Omit<DebtEntry, 'id' | 'createdAt' | 'linkedTransactionId' | 'paidAt'>>
): Promise<DebtEntry> => {
  const debts = getDebts();
  const debtIndex = debts.findIndex(d => d.id === debtId);
  
  if (debtIndex === -1) {
    throw new Error('Debt not found');
  }
  
  const updatedDebt: DebtEntry = {
    ...debts[debtIndex],
    ...updates,
    counterparty: updates.counterparty?.trim() || debts[debtIndex].counterparty,
    description: updates.description?.trim() || debts[debtIndex].description,
    category: updates.category?.trim() || undefined,
    notes: updates.notes?.trim() || undefined
  };
  
  // Update status based on due date if changed
  if (updates.dueDate && updatedDebt.status === 'pending') {
    updatedDebt.status = new Date(updates.dueDate) < new Date() ? 'overdue' : 'pending';
  }
  
  debts[debtIndex] = updatedDebt;
  saveDebts(debts);
  
  return updatedDebt;
};

// Delete a debt
export const deleteDebt = async (debtId: string): Promise<void> => {
  const debts = getDebts();
  const filteredDebts = debts.filter(d => d.id !== debtId);
  
  saveDebts(filteredDebts);
};

// Mark debt as paid and create corresponding transaction
export const markAsPaid = async (debtId: string): Promise<{ debt: DebtEntry; transaction: any }> => {
  const debts = getDebts();
  const debtIndex = debts.findIndex(d => d.id === debtId);
  
  if (debtIndex === -1) {
    throw new Error('Debt not found');
  }
  
  const debt = debts[debtIndex];
  
  if (debt.status === 'paid') {
    throw new Error('Debt is already marked as paid');
  }
  
  // Create corresponding transaction
  const transactionType = debt.type === 'receivable' ? 'inflow' : 'outflow';
  const transactionDescription = debt.type === 'receivable'
    ? `Cobro: ${debt.counterparty} - ${debt.description}`
    : `Pago: ${debt.counterparty} - ${debt.description}`;
  
  const transaction = await dataService.addTransaction(
    transactionType,
    transactionDescription,
    debt.amount,
    debt.category,
    undefined, // paymentMethod
    undefined  // items
  );
  
  // Update debt status
  const updatedDebt: DebtEntry = {
    ...debt,
    status: 'paid',
    paidAt: new Date().toISOString(),
    linkedTransactionId: transaction.id
  };
  
  debts[debtIndex] = updatedDebt;
  saveDebts(debts);
  
  return { debt: updatedDebt, transaction };
};

// Subscribe to debt changes
export const subscribeToDebts = (callback: (debts: DebtEntry[]) => void): () => void => {
  // Initial call
  callback(getAllDebts());
  
  // Listen for storage changes
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getAllDebts());
    }
  };
  
  window.addEventListener('storage', handler);
  
  return () => window.removeEventListener('storage', handler);
};

// Get summary statistics
export const getDebtStats = () => {
  const debts = getAllDebts();
  
  const receivables = debts.filter(d => d.type === 'receivable');
  const payables = debts.filter(d => d.type === 'payable');
  
  const totalReceivablesPending = receivables
    .filter(d => d.status === 'pending' || d.status === 'overdue')
    .reduce((sum, d) => sum + d.amount, 0);
  
  const totalPayablesPending = payables
    .filter(d => d.status === 'pending' || d.status === 'overdue')
    .reduce((sum, d) => sum + d.amount, 0);
  
  const overdueReceivables = receivables.filter(d => d.status === 'overdue').length;
  const overduePayables = payables.filter(d => d.status === 'overdue').length;
  
  return {
    totalReceivablesPending,
    totalPayablesPending,
    netBalance: totalReceivablesPending - totalPayablesPending,
    overdueReceivables,
    overduePayables,
    totalPendingDebts: debts.filter(d => d.status === 'pending' || d.status === 'overdue').length
  };
};
