/**
 * Performance optimization utilities for React components
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Creates a debounced version of a function
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

/**
 * Debounces a state value
 * @param value Value to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced value
 */
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // On first render, set the value immediately to prevent layout shift
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDebouncedValue(value);
      return;
    }

    // For subsequent renders, use the debounce delay
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Simple in-memory cache for localStorage data
 * Reduces JSON parsing overhead by caching parsed results
 */
class StorageCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private maxAge: number = 5000; // 5 seconds cache lifetime

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  setMaxAge(ms: number): void {
    this.maxAge = ms;
  }
}

// Singleton instance
export const storageCache = new StorageCache();

/**
 * Hook to invalidate cache when localStorage changes (multi-tab sync)
 */
export const useStorageCacheInvalidation = (keys: string[]) => {
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && keys.includes(event.key)) {
        storageCache.invalidate(event.key);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [keys]);
};
