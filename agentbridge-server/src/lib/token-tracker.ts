/**
 * AgentBridge Server — Token Tracker
 * Singleton to accumulate and report token usage across the session.
 */

import { estimateTokens } from './token-counter.js';

export interface ToolCallStats {
  toolName: string;
  outputTokens: number;
  rawPageTokens?: number;
  compressedPageTokens?: number;
  tokensSaved?: number;
  timestamp: string;
}

export interface SessionStats {
  totalOutputTokens: number;
  totalTokensSaved: number;
  totalCalls: number;
  perTool: Record<string, { calls: number; outputTokens: number; tokensSaved: number }>;
  history: ToolCallStats[];
}

class TokenTracker {
  private stats: SessionStats = {
    totalOutputTokens: 0,
    totalTokensSaved: 0,
    totalCalls: 0,
    perTool: {},
    history: [],
  };

  private readonly MAX_HISTORY = 100;

  /**
   * Record a tool call and its token metrics.
   */
  recordCall(
    toolName: string,
    outputContent: string,
    extractionStats?: {
      rawTokenEstimate: number;
      compressedTokenEstimate: number;
      tokenSavings: number;
    }
  ): ToolCallStats {
    const outputTokens = estimateTokens(outputContent);
    const tokensSaved = extractionStats?.tokenSavings || 0;

    const callRecord: ToolCallStats = {
      toolName,
      outputTokens,
      rawPageTokens: extractionStats?.rawTokenEstimate,
      compressedPageTokens: extractionStats?.compressedTokenEstimate,
      tokensSaved: tokensSaved > 0 ? tokensSaved : undefined,
      timestamp: new Date().toISOString(),
    };

    // Update global totals
    this.stats.totalOutputTokens += outputTokens;
    this.stats.totalTokensSaved += Math.max(0, tokensSaved);
    this.stats.totalCalls += 1;

    // Update per-tool stats
    if (!this.stats.perTool[toolName]) {
      this.stats.perTool[toolName] = { calls: 0, outputTokens: 0, tokensSaved: 0 };
    }
    const toolStats = this.stats.perTool[toolName];
    toolStats.calls += 1;
    toolStats.outputTokens += outputTokens;
    toolStats.tokensSaved += Math.max(0, tokensSaved);

    // Update history
    this.stats.history.unshift(callRecord);
    if (this.stats.history.length > this.MAX_HISTORY) {
      this.stats.history.pop();
    }

    return callRecord;
  }

  /**
   * Get cumulative session stats.
   */
  getSessionStats(): SessionStats {
    return { ...this.stats };
  }

  /**
   * Reset all stats (e.g. for a new session).
   */
  reset(): void {
    this.stats = {
      totalOutputTokens: 0,
      totalTokensSaved: 0,
      totalCalls: 0,
      perTool: {},
      history: [],
    };
  }
}

/** Singleton instance */
export const tokenTracker = new TokenTracker();
