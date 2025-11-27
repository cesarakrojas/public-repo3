/**
 * Centralized localStorage keys for the application
 * This ensures consistency across all services and prevents data loss
 * 
 * Naming Convention: All keys use 'app_' prefix with underscore_case
 * This provides clear namespace and prevents conflicts with other libraries
 */

export const STORAGE_KEYS = {
  // Transaction data
  TRANSACTIONS: 'app_transactions',
  
  // Inventory/Product data
  PRODUCTS: 'app_products',
  
  // Debt management data
  DEBTS: 'app_debts',
  
  // Bills data (currently unused but reserved)
  BILLS: 'app_bills',
  
  // App settings
  CATEGORY_CONFIG: 'app_category_config',
  CURRENCY_CODE: 'app_currency_code',
  THEME: 'app_theme',
} as const;

// Legacy key mapping for migration (if needed in future)
export const LEGACY_KEYS = {
  TRANSACTIONS: 'cashier_transactions',
  PRODUCTS: 'inventory_products',
  DEBTS: 'debts',
  CATEGORY_CONFIG: 'categoryConfig',
  CURRENCY_CODE: 'currencyCode',
  THEME: 'theme',
} as const;
