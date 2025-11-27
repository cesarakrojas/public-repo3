import type { Product, ProductVariant, InventoryFilters } from '../types';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { generateId } from '../utils/idGenerator';
import { reportError, createError, ERROR_MESSAGES } from '../utils/errorHandler';
import { storageCache } from '../utils/performanceUtils';

const STORAGE_KEY = STORAGE_KEYS.PRODUCTS;

// Get all products from localStorage with error handling and caching
const getProducts = (): Product[] => {
  try {
    // Try cache first
    const cached = storageCache.get<Product[]>(STORAGE_KEY);
    if (cached) return cached;
    
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    const products = Array.isArray(parsed) ? parsed : [];
    
    // Cache the result
    storageCache.set(STORAGE_KEY, products);
    
    return products;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reportError(createError('storage', 'Error al cargar productos', errorMsg));
    return [];
  }
};

// Save products to localStorage with error handling
const saveProducts = (products: Product[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    
    // Invalidate cache
    storageCache.invalidate(STORAGE_KEY);
    
    // Trigger storage event for multi-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(products)
    }));
    
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      reportError(createError('storage', ERROR_MESSAGES.STORAGE_FULL, errorMsg));
    } else {
      reportError(createError('storage', 'Error al guardar productos', errorMsg));
    }
    
    return false;
  }
};

// Calculate total quantity from variants
const calculateTotalQuantity = (hasVariants: boolean, variants: ProductVariant[], standaloneQty: number): number => {
  if (hasVariants && variants.length > 0) {
    return variants.reduce((sum, v) => sum + v.quantity, 0);
  }
  return standaloneQty;
};

// Get all products with optional filters
export const getAllProducts = async (filters?: InventoryFilters): Promise<Product[]> => {
  let products = getProducts();
  
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  }
  
  if (filters?.category) {
    products = products.filter(p => p.category === filters.category);
  }
  
  if (filters?.lowStock) {
    products = products.filter(p => p.totalQuantity <= 10);
  }
  
  return products.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

// Create a new product with error handling
export const createProduct = async (
  name: string,
  price: number,
  description?: string,
  image?: string,
  category?: string,
  hasVariants: boolean = false,
  variants: Omit<ProductVariant, 'id'>[] = [],
  standaloneQuantity: number = 0
): Promise<Product | null> => {
  try {
    // Validation
    if (!name || name.trim().length === 0) {
      reportError(createError('validation', 'El nombre del producto es requerido'));
      return null;
    }
    
    if (price < 0) {
      reportError(createError('validation', 'El precio debe ser mayor o igual a cero'));
      return null;
    }
    
    const products = getProducts();
    
    const productVariants: ProductVariant[] = variants.map(v => ({
      ...v,
      id: generateId()
    }));
    
    const totalQuantity = calculateTotalQuantity(hasVariants, productVariants, standaloneQuantity);
    
    const newProduct: Product = {
      id: generateId(),
      name: name.trim(),
      description: description?.trim(),
      image,
      price,
      totalQuantity,
      hasVariants,
      variants: productVariants,
      category: category?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    const saved = saveProducts(products);
    
    if (!saved) {
      return null;
    }
    
    return newProduct;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reportError(createError('storage', 'Error al crear producto', errorMsg));
    return null;
  }
};

// Update an existing product with error handling
export const updateProduct = async (
  productId: string,
  updates: {
    name?: string;
    description?: string;
    image?: string;
    price?: number;
    category?: string;
    hasVariants?: boolean;
    variants?: ProductVariant[];
    standaloneQuantity?: number;
  }
): Promise<Product | null> => {
  try {
    const products = getProducts();
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      reportError(createError('validation', ERROR_MESSAGES.NOT_FOUND, 'Producto no encontrado'));
      return null;
    }
  
    const currentProduct = products[productIndex];
    
    // Determine final hasVariants state
    const hasVariants = updates.hasVariants !== undefined ? updates.hasVariants : currentProduct.hasVariants;
    const variants = updates.variants !== undefined ? updates.variants : currentProduct.variants;
    const standaloneQty = updates.standaloneQuantity !== undefined ? Math.max(0, updates.standaloneQuantity) : currentProduct.totalQuantity;
    
    const updatedProduct: Product = {
      ...currentProduct,
      ...updates,
      name: updates.name?.trim() || currentProduct.name,
      description: updates.description?.trim(),
      category: updates.category?.trim(),
      hasVariants,
      variants,
      totalQuantity: Math.max(0, calculateTotalQuantity(hasVariants, variants, standaloneQty)),
      updatedAt: new Date().toISOString()
    };
    
    products[productIndex] = updatedProduct;
    const saved = saveProducts(products);
    
    if (!saved) {
      return null;
    }
    
    return updatedProduct;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reportError(createError('storage', 'Error al actualizar producto', errorMsg));
    return null;
  }
};

// Delete a product with error handling
export const deleteProduct = async (productId: string): Promise<boolean> => {
  try {
    const products = getProducts();
    const productExists = products.some(p => p.id === productId);
    
    if (!productExists) {
      reportError(createError('validation', ERROR_MESSAGES.NOT_FOUND, 'Producto no encontrado'));
      return false;
    }
    
    const filteredProducts = products.filter(p => p.id !== productId);
    return saveProducts(filteredProducts);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reportError(createError('storage', 'Error al eliminar producto', errorMsg));
    return false;
  }
};

// Update variant quantity with error handling
export const updateVariantQuantity = async (
  productId: string,
  variantId: string,
  newQuantity: number
): Promise<Product | null> => {
  try {
    if (newQuantity < 0) {
      reportError(createError('validation', 'La cantidad debe ser mayor o igual a cero'));
      return null;
    }
    
    const products = getProducts();
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      reportError(createError('validation', ERROR_MESSAGES.NOT_FOUND, 'Producto no encontrado'));
      return null;
    }
    
    const product = products[productIndex];
    const variantIndex = product.variants.findIndex(v => v.id === variantId);
    
    if (variantIndex === -1) {
      reportError(createError('validation', ERROR_MESSAGES.NOT_FOUND, 'Variante no encontrada'));
      return null;
    }
    
    product.variants[variantIndex].quantity = Math.max(0, newQuantity);
    product.totalQuantity = product.variants.reduce((sum, v) => sum + v.quantity, 0);
    product.updatedAt = new Date().toISOString();
    
    products[productIndex] = product;
    const saved = saveProducts(products);
    
    if (!saved) {
      return null;
    }
    
    return product;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reportError(createError('storage', 'Error al actualizar cantidad de variante', errorMsg));
    return null;
  }
};

// Get product by ID
export const getProductById = async (productId: string): Promise<Product | null> => {
  const products = getProducts();
  return products.find(p => p.id === productId) || null;
};

// Get all unique categories
export const getCategories = (): string[] => {
  const products = getProducts();
  const categories = products
    .map(p => p.category)
    .filter((c): c is string => !!c);
  return Array.from(new Set(categories)).sort();
};

// Subscribe to inventory changes
export const subscribeToInventory = (callback: (products: Product[]) => void): () => void => {
  callback(getProducts());
  
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getProducts());
    }
  };
  
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
