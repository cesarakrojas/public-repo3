import React from 'react';
import type { Transaction } from '../types';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';
import { CloseIcon, ArrowUpIcon, ArrowDownIcon, PrinterIcon, PencilIcon } from './icons';

interface TransactionDetailViewProps {
  transaction: Transaction;
  onClose: () => void;
  onEdit: () => void;
  currencyCode?: string;
}

export const TransactionDetailView: React.FC<TransactionDetailViewProps> = ({
  transaction,
  onClose,
  onEdit,
  currencyCode
}) => {
  const isInflow = transaction.type === 'inflow';

  const handlePrintReceipt = () => {
    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - ${transaction.description}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              max-width: 300px;
              margin: 20px auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
            }
            .label {
              font-weight: bold;
            }
            .amount {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
              padding: 15px;
              border: 2px solid #000;
            }
            .footer {
              text-align: center;
              border-top: 2px dashed #000;
              padding-top: 10px;
              margin-top: 15px;
              font-size: 12px;
            }
            .type-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-weight: bold;
              ${
                transaction.type === 'inflow'
                  ? 'background-color: #d1fae5; color: #065f46;'
                  : 'background-color: #fee2e2; color: #991b1b;'
              }
            }
            .items-section {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 10px 0;
              margin: 15px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              font-size: 14px;
            }
            .item-name {
              flex: 1;
            }
            .item-variant {
              font-size: 12px;
              color: #666;
              margin-left: 4px;
            }
            .item-qty {
              margin: 0 8px;
            }
            .item-price {
              text-align: right;
              min-width: 70px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RECIBO DE ${transaction.type === 'inflow' ? 'VENTA' : 'GASTO'}</h2>
            <p>ID: ${transaction.id}</p>
          </div>

          <div class="row">
            <span class="label">Tipo:</span>
            <span class="type-badge">${transaction.type === 'inflow' ? 'Venta' : 'Gasto'}</span>
          </div>

          <div class="row">
            <span class="label">Fecha:</span>
            <span>${formatDate(transaction.timestamp)}</span>
          </div>

          <div class="row">
            <span class="label">Hora:</span>
            <span>${formatTime(transaction.timestamp)}</span>
          </div>

          ${
            transaction.items && transaction.items.length > 0
              ? `
                <div class="items-section">
                  <div style="font-weight: bold; margin-bottom: 8px;">PRODUCTOS:</div>
                  ${transaction.items
                    .map(item => {
                      return `
                        <div class="item-row">
                          <span class="item-name">
                            ${item.productName}
                            ${
                              item.variantName
                                ? `<span class="item-variant">(${item.variantName})</span>`
                                : ''
                            }
                          </span>
                          <span class="item-qty">x${item.quantity}</span>
                          <span class="item-price">
                            ${formatCurrency(item.price * item.quantity, currencyCode)}
                          </span>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
              : `
                <div class="row">
                  <span class="label">Descripción:</span>
                  <span>${transaction.description}</span>
                </div>
              `
          }

          ${
            transaction.category
              ? `
                <div class="row">
                  <span class="label">Categoría:</span>
                  <span>${transaction.category}</span>
                </div>
              `
              : ''
          }

          ${
            transaction.paymentMethod
              ? `
                <div class="row">
                  <span class="label">Método de Pago:</span>
                  <span>${transaction.paymentMethod}</span>
                </div>
              `
              : ''
          }

          <div class="amount">
            TOTAL: ${formatCurrency(transaction.amount, currencyCode)}
          </div>

          <div class="footer">
            <p>Generado el ${formatDate(new Date().toISOString())}</p>
            <p>a las ${formatTime(new Date().toISOString())}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();

      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 rounded-t-[2rem] overflow-hidden shadow-2xl">
      
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white ml-2">Detalles</h2>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        
        <div className="bg-white dark:bg-slate-800 pb-8 pt-8 px-6 text-center shadow-sm">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-3 ${
              isInflow
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isInflow ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
            {isInflow ? 'Ingreso Confirmado' : 'Gasto Registrado'}
          </div>

          <h1 className={`text-4xl font-extrabold tracking-tight ${
            isInflow ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'
          }`}>
            {isInflow ? '+' : '-'}
            {formatCurrency(transaction.amount, currencyCode)}
          </h1>

          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {formatDate(transaction.timestamp)} • {formatTime(transaction.timestamp)}
          </p>
        </div>

        <div className="mt-4 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 px-4">
          <DetailRow label="Descripción" value={transaction.description} />

          {transaction.category && (
            <DetailRow label="Categoría" value={transaction.category} />
          )}

          {transaction.paymentMethod && (
            <DetailRow label="Método de Pago" value={transaction.paymentMethod} />
          )}

          <DetailRow label="ID Referencia" value={transaction.id} monospace />
        </div>

        {transaction.items && transaction.items.length > 0 && (
          <div className="mt-4 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 px-4 py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Productos
            </h3>

            <div className="space-y-3">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.productName}
                    </span>
                    {item.variantName && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1">
                        ({item.variantName})
                      </span>
                    )}
                    <div className="text-xs text-slate-400">
                      {item.quantity} x {formatCurrency(item.price, currencyCode)}
                    </div>
                  </div>

                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(item.price * item.quantity, currencyCode)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Items</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(transaction.amount, currencyCode)}
              </span>
            </div>
          </div>
        )}

        <div className="h-6"></div>
      </div>

      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 safe-area-bottom flex-shrink-0">
        <div className="grid grid-cols-2 gap-3">
          
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors"
          >
            <PencilIcon className="w-5 h-5" />
            <span>Editar</span>
          </button>

          <button
            onClick={handlePrintReceipt}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-colors"
          >
            <PrinterIcon className="w-5 h-5" />
            <span>Recibo</span>
          </button>

        </div>
      </div>

    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; monospace?: boolean }> = ({
  label,
  value,
  monospace
}) => (
  <div className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
    <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    <span
      className={`text-sm font-medium text-slate-900 dark:text-slate-100 ${
        monospace ? 'font-mono text-xs' : ''
      } text-right max-w-[60%] truncate`}
    >
      {value}
    </span>
  </div>
);
