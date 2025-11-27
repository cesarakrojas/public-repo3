import React, { useEffect } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'sale' | 'expense' | 'purchase';
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message,
  type 
}) => {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 2.5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getColorClasses = () => {
    switch (type) {
      case 'sale':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-700',
          icon: 'text-emerald-500 dark:text-emerald-400',
          text: 'text-emerald-700 dark:text-emerald-300'
        };
      case 'expense':
      case 'purchase':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-700',
          icon: 'text-red-500 dark:text-red-400',
          text: 'text-red-700 dark:text-red-300'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={`relative ${colors.bg} ${colors.border} border-2 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className={`${colors.icon} rounded-full bg-white dark:bg-slate-800 p-3 shadow-lg`}>
            <svg 
              className="w-16 h-16" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className={`text-2xl font-bold text-center ${colors.text} mb-2`}>
          {title}
        </h3>

        {/* Message */}
        <p className="text-center text-slate-600 dark:text-slate-400 text-lg">
          {message}
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`mt-6 w-full ${type === 'sale' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-3 rounded-lg transition-colors`}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
