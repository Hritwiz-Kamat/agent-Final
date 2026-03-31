/**
 * AgentBridge Server — Token Counter
 * Estimates token count for text content.
 * Uses a rough heuristic (~4 chars/token for English).
 */

/**
 * Estimate token count for a given text string.
 * @param text — the content to estimate
 * @returns approximate token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculate token savings percentage.
 */
export function tokenSavings(original: number, compressed: number): number {
  if (original <= 0) return 0;
  return Math.round((1 - compressed / original) * 100);
}
