import { STORAGE_KEYS } from './storageKeys';

/**
 * Centralized localStorage service abstraction
 * Provides type-safe access to localStorage with error handling
 */

export const storageService = {
  // Get a value from localStorage (returns raw string)
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return null;
    }
  },

  // Get and parse JSON from localStorage
  getItemParsed: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error getting/parsing item ${key} from localStorage:`, error);
      return null;
    }
  },

  // Set a value in localStorage
  setItem: <T>(key: string, value: T): boolean => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
      return false;
    }
  },

  // Remove a value from localStorage
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
      return false;
    }
  },

  // Clear all localStorage
  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },

  // Typed getters for common app data
  getTheme: (): 'light' | 'dark' | null => {
    return storageService.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | null;
  },

  setTheme: (theme: 'light' | 'dark'): boolean => {
    return storageService.setItem(STORAGE_KEYS.THEME, theme);
  },

  getCategoryConfig: <T = any>(): T | null => {
    return storageService.getItemParsed<T>(STORAGE_KEYS.CATEGORY_CONFIG);
  },

  setCategoryConfig: (config: any): boolean => {
    return storageService.setItem(STORAGE_KEYS.CATEGORY_CONFIG, config);
  },

  getCurrencyCode: (): string | null => {
    return storageService.getItem(STORAGE_KEYS.CURRENCY_CODE);
  },

  setCurrencyCode: (code: string): boolean => {
    return storageService.setItem(STORAGE_KEYS.CURRENCY_CODE, code);
  },
};
