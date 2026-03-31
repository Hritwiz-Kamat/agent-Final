/**
 * AgentBridge Server — Structured Logger
 * Pino-based structured logging with pretty-print for development.
 */
import pino from 'pino';
import { config } from '../config.js';
export const logger = pino({
    level: config.logLevel,
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
    base: { service: 'agentbridge' },
});
export function createChildLogger(module) {
    return logger.child({ module });
}
//# sourceMappingURL=logger.js.map