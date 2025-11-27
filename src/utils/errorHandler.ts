/**
 * Centralized error handling and user notification system
 */

export interface AppError {
  type: 'storage' | 'network' | 'validation' | 'unknown';
  message: string;
  details?: string;
  timestamp: string;
}

export type ErrorHandler = (error: AppError) => void;

let errorHandlers: ErrorHandler[] = [];

/**
 * Register an error handler (e.g., to show toast notifications)
 */
export const registerErrorHandler = (handler: ErrorHandler): (() => void) => {
  errorHandlers.push(handler);
  
  // Return unsubscribe function
  return () => {
    errorHandlers = errorHandlers.filter(h => h !== handler);
  };
};

/**
 * Report an error to all registered handlers
 */
export const reportError = (error: AppError): void => {
  // Log to console for debugging
  console.error('[AppError]', error.type, error.message, error.details);
  
  // Notify all handlers
  errorHandlers.forEach(handler => {
    try {
      handler(error);
    } catch (e) {
      console.error('Error in error handler:', e);
    }
  });
};

/**
 * Create an error object
 */
export const createError = (
  type: AppError['type'],
  message: string,
  details?: string
): AppError => ({
  type,
  message,
  details,
  timestamp: new Date().toISOString(),
});

/**
 * Wrap a function with error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  errorMessage: string,
  errorType: AppError['type'] = 'unknown'
): T => {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          reportError(createError(errorType, errorMessage, error.message));
          throw error;
        }) as ReturnType<T>;
      }
      
      return result;
    } catch (error) {
      const errorDetails = error instanceof Error ? error.message : String(error);
      reportError(createError(errorType, errorMessage, errorDetails));
      throw error;
    }
  }) as T;
};

/**
 * Check if localStorage is available and has space
 */
export const checkStorageAvailability = (): { available: boolean; message?: string } => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return { available: true };
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'QuotaExceededError') {
        return { 
          available: false, 
          message: 'Almacenamiento lleno. Por favor, elimine algunos datos.' 
        };
      }
      return { 
        available: false, 
        message: 'Almacenamiento no disponible: ' + e.message 
      };
    }
    return { 
      available: false, 
      message: 'Almacenamiento no disponible' 
    };
  }
};

/**
 * Safe localStorage operations with error handling
 */
export const safeStorageOperation = <T>(
  operation: () => T,
  operationName: string
): T | null => {
  try {
    return operation();
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error);
    reportError(
      createError('storage', `Error en ${operationName}`, errorDetails)
    );
    return null;
  }
};

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  STORAGE_FULL: 'El almacenamiento está lleno. No se pudo guardar.',
  STORAGE_ERROR: 'Error al acceder al almacenamiento local.',
  PARSE_ERROR: 'Error al procesar los datos.',
  NOT_FOUND: 'El elemento solicitado no existe.',
  VALIDATION_ERROR: 'Los datos proporcionados no son válidos.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado.',
} as const;
