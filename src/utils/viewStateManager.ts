/**
 * Centralized view state management for App.tsx
 * Reduces complexity from 9+ state variables to a single state object
 */

export type ViewType = 
  | 'home' 
  | 'calendar' 
  | 'reports' 
  | 'settings' 
  | 'new-sale' 
  | 'new-expense' 
  | 'transaction-detail'
  | 'inventory'
  | 'libreta';

export type InventoryViewMode = 'list' | 'create' | 'edit' | 'detail';
export type LibretaViewMode = 'list' | 'create' | 'edit' | 'detail';

export interface ViewState {
  // Main view
  currentView: ViewType;
  
  // Inventory state
  inventoryMode: InventoryViewMode;
  editingProductId: string | null;
  selectedProductId: string | null;
  
  // Libreta state
  libretaMode: LibretaViewMode;
  editingDebtId: string | null;
  selectedDebtId: string | null;
  
  // Transaction state
  selectedTransactionId: string | null;
}

// Initial state factory
export const createInitialViewState = (): ViewState => ({
  currentView: 'home',
  inventoryMode: 'list',
  editingProductId: null,
  selectedProductId: null,
  libretaMode: 'list',
  editingDebtId: null,
  selectedDebtId: null,
  selectedTransactionId: null,
});

// Action types for state updates
export type ViewAction =
  | { type: 'SET_VIEW'; view: ViewType }
  | { type: 'SET_INVENTORY_MODE'; mode: InventoryViewMode; productId?: string }
  | { type: 'SET_LIBRETA_MODE'; mode: LibretaViewMode; debtId?: string }
  | { type: 'SELECT_TRANSACTION'; transactionId: string }
  | { type: 'RESET_INVENTORY' }
  | { type: 'RESET_LIBRETA' }
  | { type: 'RESET_ALL' };

// Reducer for view state management
export const viewStateReducer = (state: ViewState, action: ViewAction): ViewState => {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.view };
      
    case 'SET_INVENTORY_MODE':
      return {
        ...state,
        currentView: 'inventory',
        inventoryMode: action.mode,
        editingProductId: action.mode === 'edit' ? action.productId || null : null,
        selectedProductId: action.mode === 'detail' ? action.productId || null : null,
      };
      
    case 'SET_LIBRETA_MODE':
      return {
        ...state,
        currentView: 'libreta',
        libretaMode: action.mode,
        editingDebtId: action.mode === 'edit' ? action.debtId || null : null,
        selectedDebtId: action.mode === 'detail' ? action.debtId || null : null,
      };
      
    case 'SELECT_TRANSACTION':
      return {
        ...state,
        currentView: 'transaction-detail',
        selectedTransactionId: action.transactionId,
      };
      
    case 'RESET_INVENTORY':
      return {
        ...state,
        inventoryMode: 'list',
        editingProductId: null,
        selectedProductId: null,
      };
      
    case 'RESET_LIBRETA':
      return {
        ...state,
        libretaMode: 'list',
        editingDebtId: null,
        selectedDebtId: null,
      };
      
    case 'RESET_ALL':
      return createInitialViewState();
      
    default:
      return state;
  }
};

// Helper functions for common view transitions
export const viewActions = {
  goToHome: (): ViewAction => ({ type: 'SET_VIEW', view: 'home' }),
  
  goToInventory: (): ViewAction => ({ type: 'SET_INVENTORY_MODE', mode: 'list' }),
  
  createProduct: (): ViewAction => ({ type: 'SET_INVENTORY_MODE', mode: 'create' }),
  
  editProduct: (productId: string): ViewAction => 
    ({ type: 'SET_INVENTORY_MODE', mode: 'edit', productId }),
  
  viewProduct: (productId: string): ViewAction => 
    ({ type: 'SET_INVENTORY_MODE', mode: 'detail', productId }),
  
  goToLibreta: (): ViewAction => ({ type: 'SET_LIBRETA_MODE', mode: 'list' }),
  
  createDebt: (): ViewAction => ({ type: 'SET_LIBRETA_MODE', mode: 'create' }),
  
  editDebt: (debtId: string): ViewAction => 
    ({ type: 'SET_LIBRETA_MODE', mode: 'edit', debtId }),
  
  viewDebt: (debtId: string): ViewAction => 
    ({ type: 'SET_LIBRETA_MODE', mode: 'detail', debtId }),
  
  viewTransaction: (transactionId: string): ViewAction => 
    ({ type: 'SELECT_TRANSACTION', transactionId }),
  
  goToNewSale: (): ViewAction => ({ type: 'SET_VIEW', view: 'new-sale' }),
  
  goToNewExpense: (): ViewAction => ({ type: 'SET_VIEW', view: 'new-expense' }),
  
  goToSettings: (): ViewAction => ({ type: 'SET_VIEW', view: 'settings' }),
};
