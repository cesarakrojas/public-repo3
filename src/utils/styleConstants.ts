/**
 * Reusable Tailwind CSS class combinations for consistent styling
 */

// Base card styles
const CARD_BASE = 'bg-white dark:bg-slate-800 shadow-lg rounded-2xl';

// Standard card with padding
export const CARD_STYLES = `${CARD_BASE} p-6`;

// Card without padding (for custom layouts)
export const CARD_STYLES_NO_PADDING = CARD_BASE;

// Interactive card for clickable elements
export const CARD_INTERACTIVE = `${CARD_BASE} hover:shadow-xl transition-shadow cursor-pointer`;

// Interactive card with padding and enhanced hover effects
export const CARD_INTERACTIVE_ENHANCED = `group ${CARD_BASE} p-5 hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-emerald-500/20`;

// Empty state card with centered content
export const CARD_EMPTY_STATE = `${CARD_BASE} p-12 text-center`;

// Form container with flex layout
export const CARD_FORM = `${CARD_BASE} flex flex-col overflow-hidden`;
