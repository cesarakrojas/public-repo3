import type { Product } from '../types';
import { STORAGE_KEYS } from './storageKeys';

// Returns top 5 products by frequency in past transactions or most recent
export const getTopProducts = (allProducts: Product[]): Product[] => {
  try {
    const transactionsData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const transactions = transactionsData ? JSON.parse(transactionsData) : [];

    const productFrequency: Record<string, number> = {};
    transactions.forEach((t: any) => {
      if (t.items && Array.isArray(t.items)) {
        t.items.forEach((item: any) => {
          productFrequency[item.productId] = (productFrequency[item.productId] || 0) + 1;
        });
      }
    });

    if (Object.keys(productFrequency).length > 0) {
      return [...allProducts]
        .sort((a, b) => (productFrequency[b.id] || 0) - (productFrequency[a.id] || 0))
        .slice(0, 5);
    }

    return [...allProducts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  } catch (error) {
    return allProducts.slice(0, 5);
  }
};

export default {
  getTopProducts,
};
