/**
 * AgentBridge Server — Lightpanda CDP Connector
 * Connects to a running Lightpanda instance via Chrome DevTools Protocol.
 * Lightpanda exposes a CDP-compatible WebSocket endpoint.
 */
import { type Browser } from 'puppeteer-core';
/**
 * Connect to a running Lightpanda CDP server.
 * @param endpoint — WebSocket endpoint (e.g. ws://127.0.0.1:9222)
 * @returns Puppeteer Browser instance connected via CDP
 */
export declare function connectToLightpanda(endpoint: string): Promise<Browser>;
//# sourceMappingURL=lightpanda.d.ts.map