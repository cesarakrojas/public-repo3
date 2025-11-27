/**
 * Generate a unique ID for entities
 * Format: timestamp_randomString
 * Example: 1732617600000_k8j3m9p
 */
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
