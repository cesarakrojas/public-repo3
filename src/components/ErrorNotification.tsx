import React, { useState, useEffect } from 'react';
import { registerErrorHandler, type AppError } from '../utils/errorHandler';
import { XMarkIcon } from './icons';

interface ErrorToast extends AppError {
  id: string;
}

/**
 * Global error notification component
 * Displays toast notifications for errors reported through the error handling system
 */
export const ErrorNotification: React.FC = () => {
  const [errors, setErrors] = useState<ErrorToast[]>([]);

  useEffect(() => {
    // Register error handler
    const unsubscribe = registerErrorHandler((error: AppError) => {
      const errorWithId: ErrorToast = {
        ...error,
        id: `error-${Date.now()}-${Math.random()}`,
      };
      
      setErrors(prev => [...prev, errorWithId]);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e.id !== errorWithId.id));
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const dismissError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  if (errors.length === 0) return null;

  const getErrorColor = (type: AppError['type']) => {
    switch (type) {
      case 'storage':
        return 'bg-orange-500';
      case 'validation':
        return 'bg-yellow-500';
      case 'network':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map(error => (
        <div
          key={error.id}
          className={`${getErrorColor(error.type)} text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-fade-in`}
        >
          <div className="flex-1">
            <p className="font-semibold">{error.message}</p>
            {error.details && (
              <p className="text-sm opacity-90 mt-1">{error.details}</p>
            )}
          </div>
          <button
            onClick={() => dismissError(error.id)}
            className="p-1 hover:bg-white/20 rounded transition"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
