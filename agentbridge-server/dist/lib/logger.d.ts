/**
 * AgentBridge Server — Structured Logger
 * Pino-based structured logging with pretty-print for development.
 */
import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
export declare function createChildLogger(module: string): pino.Logger<never, boolean>;
//# sourceMappingURL=logger.d.ts.map