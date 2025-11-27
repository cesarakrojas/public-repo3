import React from 'react';
import { XMarkIcon } from './icons';
import { CARD_FORM } from '../utils/styleConstants';

interface FormViewWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

/**
 * Reusable wrapper component for form views
 * Provides consistent styling: white card container, header with title/close button, flex layout
 */
export const FormViewWrapper: React.FC<FormViewWrapperProps> = ({ 
  title, 
  onClose, 
  children,
  maxWidth = '4xl'
}) => {
  const maxWidthClass = `max-w-${maxWidth}`;
  
  return (
    <div className="w-full h-full mx-auto animate-fade-in flex items-stretch">
      <div className={`w-full ${maxWidthClass} mx-auto ${CARD_FORM}`}>
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {children}
        </div>
      </div>
    </div>
  );
};
