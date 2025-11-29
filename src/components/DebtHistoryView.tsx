import React, { useMemo, useState } from 'react';
import type { CategoryConfig, DebtEntry } from '../types';
import { CARD_STYLES } from '../utils/styleConstants';
import { formatCurrency } from '../utils/formatters';
import * as debtService from '../services/debtService';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300';
    case 'overdue': return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
    case 'pending': return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
    default: return 'bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Pagado';
    case 'overdue': return 'Vencido';
    case 'pending': return 'Pendiente';
    default: return status;
  }
};
interface Props {
  categoryConfig: CategoryConfig;
  onOpenDebt: (id: string) => void;
}

export const DebtHistoryView: React.FC<Props> = ({ categoryConfig, onOpenDebt }) => {
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<'receivable' | 'payable' | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'paid' | 'overdue' | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [debts, setDebts] = useState<DebtEntry[]>([]);
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
      const tx = debtService.getAllDebts({
        type: typeFilter === undefined ? undefined : typeFilter,
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
      });

      // Apply date filtering (createdAt) and category filter locally
      let filtered = tx;
      if (startDate) {
        filtered = filtered.filter(d => new Date(d.createdAt) >= new Date(startDate));
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filtered = filtered.filter(d => new Date(d.createdAt) <= endOfDay);
      }
      if (categoryFilter) {
        filtered = filtered.filter(d => d.category === categoryFilter);
      }

      setDebts(filtered);
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
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
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
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Historial de Deudas</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Filtra y busca deudas por fecha, categoría o tipo.</p>
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
            <input className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" placeholder="Nombre, descripción o categoría" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-slate-500">Tipo</label>
            <div className="flex gap-2">
              <button className={`px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 ${typeFilter === undefined ? 'bg-emerald-50' : 'bg-slate-100'}`} onClick={() => setTypeFilter(undefined)}>Todos</button>
              <button className={`px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 ${typeFilter === 'receivable' ? 'bg-emerald-100' : 'bg-slate-100'}`} onClick={() => setTypeFilter('receivable')}>Cobrar</button>
              <button className={`px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 ${typeFilter === 'payable' ? 'bg-red-100' : 'bg-slate-100'}`} onClick={() => setTypeFilter('payable')}>Pagar</button>
            </div>
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
            ) : debts.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">No se encontraron deudas.</div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700 -mx-2">
                {debts.map(d => {
                  const isReceivable = d.type === 'receivable';
                  return (
                    <li key={d.id} onClick={() => onOpenDebt(d.id)} className="group flex items-center justify-between py-4 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 cursor-pointer">
                      <div className="flex items-center justify-between gap-4 w-full">

                        <div className="flex flex-1 items-center gap-3 min-w-0">
                          <div className={`p-3 rounded-xl shrink-0 ${isReceivable ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                            {isReceivable ? <ArrowUpIcon className="w-6 h-6" /> : <ArrowDownIcon className="w-6 h-6" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{d.counterparty}</h3>
                            {d.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate mb-1">{d.description}</p>
                            )}

                            <div className="flex items-center gap-3 mt-1.5">
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${getStatusColor(d.status)}`}>
                                {getStatusLabel(d.status)}
                              </span>

                              {d.category && (
                                <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-600">
                                  {d.category}
                                </span>
                              )}

                              <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                                <svg className="h-3.5 w-3.5 mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="whitespace-nowrap">
                                   {new Date(d.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 ml-2">
                          <div className={`text-xl sm:text-2xl font-bold whitespace-nowrap flex items-baseline gap-1 ${isReceivable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            <span className="text-lg opacity-80">$</span>
                            <span>{d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">
                            {isReceivable ? 'Por cobrar' : 'Por pagar'}
                          </span>
                        </div>

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

export default DebtHistoryView;
