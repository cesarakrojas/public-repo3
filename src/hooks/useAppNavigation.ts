import { useCallback, useEffect, useState } from 'react';

type AppView = 'home' | 'inventory' | 'reports' | 'settings' | 'new-sale' | 'new-expense' | 'transaction-detail' | 'transaction-history' | 'debt-history';

export function useAppNavigation() {
  const [view, setView] = useState<AppView>('home');

  // Inventory navigation
  const [inventoryViewMode, setInventoryViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Libreta/debt navigation
  const [libretaViewMode, setLibretaViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  // Transaction selection
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const navigate = useCallback((to: AppView) => {
    setView(to);
  }, []);

  const changeInventoryView = useCallback((mode: 'list' | 'create' | 'edit' | 'detail', productId?: string) => {
    setInventoryViewMode(mode);
    if (mode === 'edit' && productId) {
      setEditingProductId(productId);
      setSelectedProductId(null);
    } else if (mode === 'detail' && productId) {
      setSelectedProductId(productId);
      setEditingProductId(null);
    } else {
      setEditingProductId(null);
      setSelectedProductId(null);
    }
  }, []);

  const changeLibretaView = useCallback((mode: 'list' | 'create' | 'edit' | 'detail', debtId?: string) => {
    setLibretaViewMode(mode);
    if (mode === 'edit' && debtId) {
      setEditingDebtId(debtId);
      setSelectedDebtId(null);
    } else if (mode === 'detail' && debtId) {
      setSelectedDebtId(debtId);
      setEditingDebtId(null);
    } else {
      setEditingDebtId(null);
      setSelectedDebtId(null);
    }
  }, []);

  // When top-level `view` changes, reset child module states when leaving their modules.
  useEffect(() => {
    if (view !== 'inventory') {
      setInventoryViewMode('list');
      setEditingProductId(null);
      setSelectedProductId(null);
    }

    if (view !== 'reports') {
      setLibretaViewMode('list');
      setEditingDebtId(null);
      setSelectedDebtId(null);
    }
  }, [view]);

  return {
    // top level
    view,
    navigate,

    // inventory
    inventoryViewMode,
    changeInventoryView,
    editingProductId,
    selectedProductId,

    // libreta
    libretaViewMode,
    changeLibretaView,
    editingDebtId,
    selectedDebtId,

    // transactions
    selectedTransactionId,
    setSelectedTransactionId,
  } as const;
}
