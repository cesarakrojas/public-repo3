import React, { useMemo, useState } from 'react';
import type { CategoryConfig, Transaction } from '../types';
import { CARD_STYLES } from '../utils/styleConstants';
import { formatCurrency, formatTime } from '../utils/formatters';
import * as dataService from '../services/dataService';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

interface Props {
  categoryConfig: CategoryConfig;
  currencyCode: string;
  onOpenTransaction: (id: string) => void;
}

export const TransactionHistoryView: React.FC<Props> = ({ categoryConfig, currencyCode, onOpenTransaction }) => {
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<'inflow' | 'outflow' | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const allCategories = useMemo(() => {
    const inflows = categoryConfig?.inflowCategories || [];
    const outflows = categoryConfig?.outflowCategories || [];
    return Array.from(new Set([...inflows, ...outflows]));
  }, [categoryConfig]);

  const load = async () => {
    try {
      setIsLoading(true);
      const txs = await dataService.getTransactionsWithFilters({
        startDate,
        endDate,
        type: typeFilter,
        searchTerm: searchTerm || undefined,
      });

      // Apply category filter locally if provided
      const filtered = categoryFilter ? txs.filter(t => t.category === categoryFilter) : txs;
      setTransactions(filtered);
    } finally {
      setIsLoading(false);
      setGenerated(true);
    }
  };

  const handleGenerate = async () => {
    await load();
  };

  const setPreset = (preset: 'today' | 'yesterday' | 'this-week') => {
    const now = new Date();
    if (preset === 'today') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setStartDate(s.toISOString());
      setEndDate(s.toISOString());
    } else if (preset === 'yesterday') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      setStartDate(y.toISOString());
      setEndDate(y.toISOString());
    } else if (preset === 'this-week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      setStartDate(monday.toISOString());
      setEndDate(now.toISOString());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in space-y-6">
      <header className={CARD_STYLES}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Historial de Transacciones</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Filtra y busca transacciones por fecha, categoría o tipo.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-500">Rango inicio</label>
            <input
              type="date"
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-500">Rango fin</label>
            <input
              type="date"
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-500">Presets</label>
            <div className="flex gap-2">
              <button onClick={() => setPreset('today')} className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100">Hoy</button>
              <button onClick={() => setPreset('yesterday')} className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100">Ayer</button>
              <button onClick={() => setPreset('this-week')} className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100">Esta semana</button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-sm text-slate-500">Categoría</label>
            <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" value={categoryFilter || ''} onChange={(e) => setCategoryFilter(e.target.value || undefined)}>
              <option value="">Todas</option>
              {allCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-500">Buscar</label>
            <input className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" placeholder="Descripción o categoría" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex items-center md:justify-end">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg"
            >
              {isLoading ? 'Generando...' : 'Generar'}
            </button>
          </div>


        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className={CARD_STYLES}>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Resultados</h3>
            {!generated ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">Presiona <strong>Generar</strong> para ver resultados.</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">No se encontraron transacciones.</div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700 -mx-2">
                {transactions.map(t => {
                  const isInflow = t.type === 'inflow';
                  return (
                    <li key={t.id} onClick={() => onOpenTransaction(t.id)} className="group flex items-center justify-between py-4 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 cursor-pointer">
                      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <div className={`p-2 rounded-full shrink-0 ${isInflow ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                          {isInflow ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowDownIcon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{t.description}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <span className="whitespace-nowrap">{formatTime(t.timestamp)}</span>
                            {t.category && (
                              <>
                                <span>•</span>
                                <span className="italic truncate text-slate-400 dark:text-slate-500">{t.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`shrink-0 font-bold text-lg whitespace-nowrap text-right ${isInflow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        <span>{isInflow ? '+' : '-'}</span>
                        <span className="ml-1">{formatCurrency(t.amount)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryView;
