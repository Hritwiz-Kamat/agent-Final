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
export declare function estimateTokens(text: string): number;
/**
 * Calculate token savings percentage.
 */
export declare function tokenSavings(original: number, compressed: number): number;
//# sourceMappingURL=token-counter.d.ts.map