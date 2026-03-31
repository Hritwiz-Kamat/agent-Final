/**
 * AgentBridge Server — Cleaner (Server-Side)
 * Chinese token compression engine that runs server-side.
 *
 * In-page noise removal is handled by the injectable cleaner.bundle.js.
 * This module handles:
 * - Chinese token compression (compresses JSON keys + semantic values)
 * - Token-efficient text compression
 */
export declare const TOKEN_COMPRESS_MAP: Record<string, string>;
export interface CompressionResult {
    result: unknown;
    replacements: number;
}
/**
 * Apply Chinese compression to a JSON object (deep walk).
 * Compresses: JSON keys, short semantic string values.
 * Preserves: URLs, emails, numbers, IDs, code, proper nouns.
 */
export declare function applyChineseCompression(obj: unknown): CompressionResult;
/**
 * Compress text for token efficiency.
 * Normalizes whitespace, smart quotes, special characters.
 */
export declare function compressForTokens(text: string): string;
//# sourceMappingURL=cleaner.d.ts.map