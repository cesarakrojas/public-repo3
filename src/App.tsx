import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Transaction, CategoryConfig, Product } from './types';
import { STORAGE_KEYS } from './utils/storageKeys';
import { storageService } from './utils/storageService';
import { CARD_STYLES, CARD_EMPTY_STATE, CARD_FORM } from './utils/styleConstants';
import { CashIcon, BookOpenIcon, InventoryIcon, ArrowUpIcon, ArrowDownIcon, Cog6ToothIcon, Bars3Icon, BellIcon, XMarkIcon, UserIcon } from './components/icons';
import { CategorySettings } from './components/CategorySettings';
import { InventoryView } from './components/InventoryView';
import { NewSaleForm } from './components/NewSaleForm';
import { ProductForm } from './components/ProductForm';
import { NewExpenseForm } from './components/NewExpenseForm';
import { TransactionDetailView } from './components/TransactionDetailView';
import { ProductDetailView } from './components/ProductDetailView';
import { LibretaView } from './components/LibretaView';
import { DebtHistoryView } from './components/DebtHistoryView';
import { FormViewWrapper } from './components/FormViewWrapper';
import { DebtForm } from './components/DebtForm';
import { DebtDetailView } from './components/DebtDetailView';
import { ErrorNotification } from './components/ErrorNotification';
import { SuccessModal } from './components/SuccessModal';
import { TransactionHistoryView } from './components/TransactionHistoryView';
import * as inventoryService from './services/inventoryService';
import * as debtService from './services/debtService';
import { calculateTotalInflows, calculateTotalOutflows } from './utils/calculations';
import { formatCurrency, formatTime } from './utils/formatters';
import * as dataService from './services/dataService';
import { populateSampleData } from './utils/sampleData';
import { useAppNavigation } from './hooks/useAppNavigation';

// --- CHILD COMPONENTS ---

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onClick }) => {
  const is_inflow = transaction.type === 'inflow';

  return (
    <li
      onClick={onClick}
      className="group flex items-center justify-between py-4 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 cursor-pointer"
    >
      {/* LEFT SIDE: Description & Icon */}
      {/* Added min-w-0 and flex-1 to allow truncation */}
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        
        {/* Icon - Added shrink-0 so it doesn't get squished */}
        <div
          className={`p-2 rounded-full shrink-0 ${
            is_inflow
              ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
          }`}
        >
          {is_inflow ? (
            <ArrowUpIcon className="w-5 h-5" />
          ) : (
            <ArrowDownIcon className="w-5 h-5" />
          )}
        </div>

        {/* Text Details - Wrapped in min-w-0 to enable text truncation */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
            {transaction.description}
          </p>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="whitespace-nowrap">{formatTime(transaction.timestamp)}</span>
            {transaction.category && (
              <>
                <span>•</span>
                <span className="italic truncate text-slate-400 dark:text-slate-500">
                  {transaction.category}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Amount */}
      {/* Added whitespace-nowrap and shrink-0 to prevent line breaks */}
      <div className={`shrink-0 font-bold text-lg whitespace-nowrap text-right ${
          is_inflow 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        <span>{is_inflow ? '+' : '-'}</span>
        {/* Added a small margin for visual breathing room */}
        <span className="ml-1">
            {formatCurrency(transaction.amount)}
        </span>
      </div>
    </li>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const {
    view,
    navigate,

    inventoryViewMode,
    changeInventoryView,
    editingProductId,
    selectedProductId,

    libretaViewMode,
    changeLibretaView,
    editingDebtId,
    selectedDebtId,

    selectedTransactionId,
    setSelectedTransactionId,
  } = useAppNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuSlideIn, setMenuSlideIn] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfig>({
    enabled: true,
    inflowCategories: ['Ventas', 'Servicios', 'Otras Ventas'],
    outflowCategories: ['Gastos Operativos', 'Salarios', 'Suministros', 'Servicios Públicos', 'Mantenimiento', 'Transporte', 'Otros Gastos']
  });

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [successModalType, setSuccessModalType] = useState<'sale' | 'expense' | 'purchase'>('sale');

  // Centralized data loading function - memoized to prevent re-creation on every render
  const loadAllData = useCallback(async () => {
    // Auto-populate sample data if no data exists
    const existingProducts = storageService.getItem(STORAGE_KEYS.PRODUCTS);
    const existingTransactions = storageService.getItem(STORAGE_KEYS.TRANSACTIONS);
    
    if (!existingProducts || !existingTransactions || 
        JSON.parse(existingProducts || '[]').length === 0) {
      console.log('No data found, populating sample data...');
      await populateSampleData();
    }
    
    // Load products
    const prods = await inventoryService.getAllProducts();
    setProducts(prods);
    
    // Load transactions
    const txs = await dataService.getTransactionsWithFilters({});
    setTransactions(txs);
    
    // Load category config (already parsed by storageService)
    const savedConfig = storageService.getCategoryConfig();
    if (savedConfig) {
      setCategoryConfig(savedConfig);
    }
    
    // Load currency
    const savedCurrency = storageService.getCurrencyCode();
    if (savedCurrency) {
      setCurrencyCode(savedCurrency);
    }
  }, []);

  // Load theme and initial data
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    
    loadAllData();

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = () => {
      loadAllData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle body scroll lock and trigger slide-in animation for the mobile menu
  useEffect(() => {
    if (isMenuOpen) {
      // lock background scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Use setTimeout instead of requestAnimationFrame for more reliable animation
      const timer = setTimeout(() => setMenuSlideIn(true), 10);
      return () => {
        document.body.style.overflow = originalOverflow;
        setMenuSlideIn(false);
        clearTimeout(timer);
      };
    } else {
      setMenuSlideIn(false);
    }
  }, [isMenuOpen]);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      storageService.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      storageService.setItem(STORAGE_KEYS.THEME, 'light');
    }
    
    setIsDarkMode(newDarkMode);
  };

  const handleSaveCategoryConfig = (config: CategoryConfig) => {
    setCategoryConfig(config);
    storageService.setItem(STORAGE_KEYS.CATEGORY_CONFIG, JSON.stringify(config));
  };

  const handleCurrencyChange = (newCurrencyCode: string) => {
    setCurrencyCode(newCurrencyCode);
    storageService.setItem(STORAGE_KEYS.CURRENCY_CODE, newCurrencyCode);
  };

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    try {
      await dataService.addTransaction(
        transaction.type,
        transaction.description,
        transaction.amount,
        transaction.category,
        transaction.paymentMethod,
        transaction.items
      );
      // Reload all transactions
      const txs = await dataService.getTransactionsWithFilters({});
      setTransactions(txs);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error al agregar la transacción.');
    }
  };

  const loadProducts = async () => {
    const prods = await inventoryService.getAllProducts();
    setProducts(prods);
  };

  const handleInventoryViewChange = (mode: 'list' | 'create' | 'edit' | 'detail', productId?: string) => {
    // delegate to navigation hook which centralizes reset logic
    changeInventoryView(mode, productId);
  };

  const handleLibretaViewChange = (mode: 'list' | 'create' | 'edit' | 'detail', debtId?: string) => {
    // delegate to navigation hook which centralizes reset logic
    changeLibretaView(mode, debtId);
  };

  // Reset inventory view mode when leaving inventory - only run cleanup on view change
  // Navigation state resets are handled inside `useAppNavigation`.

  const totalInflows = useMemo(() => calculateTotalInflows(transactions), [transactions]);
  const totalOutflows = useMemo(() => calculateTotalOutflows(transactions), [transactions]);
  const netBalance = useMemo(() => totalInflows - totalOutflows, [totalInflows, totalOutflows]);

  const MainView = () => {
    useEffect(() => {
      // Reset scroll position to the top of the page
      window.scrollTo(0, 0);
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in space-y-6">
            <header className={CARD_STYLES}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Punto de Venta</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className="w-full sm:w-auto grid grid-cols-2 gap-2">
                    <button onClick={() => navigate('new-sale')} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-emerald-500/30 transition-transform transform hover:scale-105">
                      <ArrowUpIcon className="w-5 h-5"/> Venta
                    </button>
                    <button onClick={() => navigate('new-expense')} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-red-500/30 transition-transform transform hover:scale-105">
                      <ArrowDownIcon className="w-5 h-5"/> Gasto
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-xl">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Ventas</p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalInflows)}</p>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-xl">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">Total Gastos</p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalOutflows)}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${netBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-orange-100 dark:bg-orange-900/50'}`}>
                        <p className={`text-sm font-medium ${netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-300'}`}>Balance Neto</p>
                        <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'}`}>{formatCurrency(netBalance)}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <div>
                    <div className={CARD_STYLES}>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Transacciones</h3>
                         {transactions.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                                <p>No se han registrado transacciones todavía.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700 -mx-2">
                                {transactions.map(t => (
                                  <TransactionItem 
                                    key={t.id} 
                                    transaction={t} 
                                    onClick={() => {
                                      setSelectedTransactionId(t.id);
                                      navigate('transaction-detail');
                                    }}
                                  />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  };



  const SettingsView = () => {
    useEffect(() => {
      // Reset scroll position to the top of the page
      window.scrollTo(0, 0);
    }, []);

    return (
      <CategorySettings
        onSave={handleSaveCategoryConfig}
        initialConfig={categoryConfig}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        currencyCode={currencyCode}
        onCurrencyChange={handleCurrencyChange}
      />
    );
  };

  // Placeholder shown when a module is intentionally deactivated/unmounted
  const DisabledModule: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-full max-w-4xl mx-auto animate-fade-in space-y-6">
      <div className={CARD_EMPTY_STATE}>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Este módulo está temporalmente desactivado.</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Puedes reactivar el componente en el futuro si lo necesitas.</p>
      </div>
    </div>
  );

  const ProductFormView: React.FC<{ mode: 'create' | 'edit'; productId: string | null; onBack: () => void }> = ({ mode, productId, onBack }) => {
    const [product, setProduct] = useState<Product | null>(null);

    useEffect(() => {
      const loadProduct = async () => {
        if (mode === 'edit' && productId) {
          const allProducts = await inventoryService.getAllProducts();
          const foundProduct = allProducts.find(p => p.id === productId);
          setProduct(foundProduct || null);
        } else {
          setProduct(null);
        }
      };
      loadProduct();
    }, [mode, productId]);

    const handleSave = async () => {
      onBack();
    };

    return (
      <div className="w-full h-full mx-auto animate-fade-in flex items-stretch">
        <div className={`w-full max-w-4xl mx-auto ${CARD_FORM}`}>
          <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden px-6">
            <ProductForm
              product={product}
              onSave={handleSave}
              onCancel={onBack}
            />
          </div>
        </div>
      </div>
    );
  };

  const InventoryModule = () => {
    useEffect(() => {
      // Reset scroll position to the top of the page
      window.scrollTo(0, 0);
    }, []);

    if (inventoryViewMode === 'create' || inventoryViewMode === 'edit') {
      return <ProductFormView mode={inventoryViewMode} productId={editingProductId} onBack={() => handleInventoryViewChange('list')} />;
    }

    if (inventoryViewMode === 'detail') {
      return <ProductDetailPageView />;
    }

    return <InventoryView viewMode={inventoryViewMode} editingProductId={editingProductId} onChangeView={handleInventoryViewChange} />;
  };

  const NewSaleView = () => {
    return (
      <FormViewWrapper title="Nueva Venta" onClose={() => navigate('home')}>
        <NewSaleForm 
          products={products}
          onAddTransaction={handleAddTransaction} 
          onClose={() => navigate('home')}
          onSuccess={(title, message) => {
            setSuccessModalTitle(title);
            setSuccessModalMessage(message);
            setSuccessModalType('sale');
            setShowSuccessModal(true);
          }}
        />
      </FormViewWrapper>
    );
  };

  const NewExpenseView = () => {
    return (
      <FormViewWrapper title="Nuevo Gasto" onClose={() => navigate('home')}>
        <div className="pb-6">
          <NewExpenseForm 
            onAddTransaction={handleAddTransaction} 
            categoryConfig={categoryConfig}
            onClose={() => navigate('home')}
            onSuccess={(title, message, type) => {
              setSuccessModalTitle(title);
              setSuccessModalMessage(message);
              setSuccessModalType(type as 'expense' | 'purchase');
              setShowSuccessModal(true);
            }}
          />
        </div>
      </FormViewWrapper>
    );
  };

  const TransactionDetailPageView = () => {
    const transaction = transactions.find(t => t.id === selectedTransactionId);
    
    if (!transaction) {
      return (
        <div className="w-full h-full max-w-4xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-slate-600 dark:text-slate-400">Transacción no encontrada</p>
            <button
              onClick={() => navigate('home')}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      );
    }

    const handleEdit = () => {
      // TODO: Implement edit functionality
      // For now, just show an alert
      alert('La función de editar estará disponible próximamente');
    };

    return (
      <div className="w-full h-full mx-auto animate-fade-in flex items-stretch">
        <TransactionDetailView
          transaction={transaction}
          onClose={() => navigate('home')}
          onEdit={handleEdit}
          currencyCode={currencyCode}
        />
      </div>
    );
  };

  const ProductDetailPageView = () => {
    const product = products.find(p => p.id === selectedProductId);
    
    if (!product) {
      return (
        <div className="w-full h-full max-w-4xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-slate-600 dark:text-slate-400">Producto no encontrado</p>
            <button
              onClick={() => handleInventoryViewChange('list')}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            >
              Volver al Inventario
            </button>
          </div>
        </div>
      );
    }

    const handleEdit = () => {
      handleInventoryViewChange('edit', product.id);
    };

    const handleDelete = async () => {
      if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        await inventoryService.deleteProduct(product.id);
        loadProducts();
        handleInventoryViewChange('list');
      }
    };

    return (
      <div className="w-full h-full mx-auto animate-fade-in flex items-stretch">
        <ProductDetailView
          product={product}
          onClose={() => handleInventoryViewChange('list')}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    );
  };

  const DebtFormView = () => {
    const handleSave = () => {
      handleLibretaViewChange('list');
    };

    return (
      <FormViewWrapper 
        title={editingDebtId ? 'Editar Deuda' : 'Nueva Deuda'} 
        onClose={() => handleLibretaViewChange('list')}
      >
        <DebtForm
          mode={editingDebtId ? 'edit' : 'create'}
          debtId={editingDebtId || undefined}
          onSave={handleSave}
          onCancel={() => handleLibretaViewChange('list')}
        />
      </FormViewWrapper>
    );
  };

  const DebtDetailPageView = () => {
    const debt = selectedDebtId ? debtService.getDebtById(selectedDebtId) : null;
    
    if (!debt) {
      return (
        <div className="w-full h-full max-w-4xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-slate-600 dark:text-slate-400">Deuda no encontrada</p>
            <button
              onClick={() => handleLibretaViewChange('list')}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            >
              Volver a Libreta
            </button>
          </div>
        </div>
      );
    }

    const handleEdit = () => {
      handleLibretaViewChange('edit', debt.id);
    };

    const handleDelete = async () => {
      if (confirm('¿Estás seguro de que deseas eliminar esta deuda?')) {
        await debtService.deleteDebt(debt.id);
        handleLibretaViewChange('list');
      }
    };

    const handleMarkAsPaid = async () => {
      if (confirm('¿Marcar esta deuda como pagada? Se creará una transacción correspondiente.')) {
        await debtService.markAsPaid(debt.id);
        handleLibretaViewChange('list');
      }
    };

    return (
      <div className="w-full h-full mx-auto animate-fade-in flex items-stretch">
        <DebtDetailView
          debt={debt}
          onClose={() => handleLibretaViewChange('list')}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMarkAsPaid={handleMarkAsPaid}
        />
      </div>
    );
  };

  const LibretaModule = () => {
    if (libretaViewMode === 'create' || libretaViewMode === 'edit') {
      return <DebtFormView />;
    }

    if (libretaViewMode === 'detail') {
      return <DebtDetailPageView />;
    }

    return (
      <LibretaView
        onChangeView={handleLibretaViewChange}
      />
    );
  };

  return (
    <div className="h-screen text-slate-900 dark:text-slate-200 transition-colors duration-300 font-sans flex flex-col">
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-800 dark:to-teal-900 rounded-b-[3rem]"></div>
      <div className="relative p-4 sm:p-6 md:p-8 flex flex-col flex-1">
        <nav className="flex justify-between items-center mb-10 relative z-10 flex-shrink-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition"
            aria-label="Menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Mi Empresa S.A</h1>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (confirm('¿Recargar datos de ejemplo? Esto borrará todos los datos actuales.')) {
                  localStorage.clear();
                  await populateSampleData();
                  window.location.reload();
                }
              }}
              className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
            >
              Recargar Datos
            </button>
            <button
              className="p-2 text-white hover:bg-white/20 rounded-lg transition relative"
              aria-label="Notificaciones"
            >
              <BellIcon className="w-6 h-6" />
            </button>
          </div>
        </nav>

        {/* Mobile-first slide-in drawer menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsMenuOpen(false)}
            />
            {/* Drawer panel */}
            <div
              className={`relative ml-0 h-full w-[80vw] max-w-sm sm:max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${menuSlideIn ? 'translate-x-0' : '-translate-x-full'}`}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Bars3Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Menú</h3>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  aria-label="Cerrar menú"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Items with large touch targets */}
              <div className="py-2">
                <nav aria-label="Menú principal" className="py-2">
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => { setIsMenuOpen(false); navigate('home'); }}
                        aria-current={view === 'home' || undefined}
                        className="w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-800 dark:text-slate-100 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition"
                      >
                        <CashIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        <span>Registro</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => { setIsMenuOpen(false); navigate('transaction-history'); }}
                        aria-current={view === 'transaction-history' || undefined}
                        className={`w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition`}
                      >
                        <BookOpenIcon className="w-6 h-6 text-slate-400" />
                        <span>Historial Transacciones</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => { setIsMenuOpen(false); navigate('debt-history'); }}
                        aria-current={view === 'debt-history' || undefined}
                        className={`w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition`}
                      >
                        <BookOpenIcon className="w-6 h-6 text-slate-400" />
                        <span>Historial Deudas</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => { setIsMenuOpen(false); alert('Módulo de Productos próximamente'); }}
                        className="w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                      >
                        <span className="w-6 h-6 text-slate-400 inline-flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                        </span>
                        <span>Productos</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => { setIsMenuOpen(false); alert('Módulo de Clientes próximamente'); }}
                        className="w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                      >
                        <UserIcon className="w-6 h-6 text-slate-400" />
                        <span>Clientes</span>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
            {/* Spacer to catch clicks on the right area; click closes via backdrop */}
            <div className="flex-1" />
          </div>
        )}

        <main className="flex flex-col items-center flex-1 overflow-y-auto overflow-x-hidden pb-20">
          {view === 'home' ? <MainView /> : 
           view === 'new-sale' ? <NewSaleView /> :
           view === 'new-expense' ? <NewExpenseView /> :
           view === 'transaction-detail' ? <TransactionDetailPageView /> :
           view === 'transaction-history' ? <TransactionHistoryView categoryConfig={categoryConfig} currencyCode={currencyCode} onOpenTransaction={(id) => { setSelectedTransactionId(id); navigate('transaction-detail'); }} /> :
           view === 'debt-history' ? <DebtHistoryView categoryConfig={categoryConfig} onOpenDebt={(id) => { changeLibretaView('detail', id); navigate('reports'); }} /> :
           view === 'reports' ? <LibretaModule /> : 
           view === 'settings' ? <SettingsView /> : 
           view === 'inventory' ? <InventoryModule /> : 
           <DisabledModule name="Módulo desactivado" />}
        </main>
      </div>
      
      {/* Success Modal - Rendered at app root level */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('home');
        }}
        title={successModalTitle}
        message={successModalMessage}
        type={successModalType}
      />
      
      {/* Bottom Navigation Bar - Hidden on form pages and detail views */}
      {view !== 'new-sale' && view !== 'new-expense' && view !== 'transaction-detail' && inventoryViewMode === 'list' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg z-50">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex justify-around items-center">
            <button
              onClick={() => navigate('home')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'home' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <CashIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Inicio</span>
            </button>
            <button
              onClick={() => navigate('reports')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'reports' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <BookOpenIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Libreta</span>
            </button>
            <button
              onClick={() => navigate('inventory')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'inventory' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <InventoryIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Inventario</span>
            </button>
            <button
              onClick={() => navigate('settings')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Cog6ToothIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Ajustes</span>
            </button>
          </div>
        </div>
      </nav>
      )}
      
      {/* Global Error Notifications */}
      <ErrorNotification />
    </div>
  );
}