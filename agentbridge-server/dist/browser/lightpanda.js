/**
 * AgentBridge Server — Lightpanda CDP Connector
 * Connects to a running Lightpanda instance via Chrome DevTools Protocol.
 * Lightpanda exposes a CDP-compatible WebSocket endpoint.
 */
import puppeteer from 'puppeteer-core';
import { createChildLogger } from '../lib/logger.js';
const log = createChildLogger('lightpanda');
/**
 * Connect to a running Lightpanda CDP server.
 * @param endpoint — WebSocket endpoint (e.g. ws://127.0.0.1:9222)
 * @returns Puppeteer Browser instance connected via CDP
 */
export async function connectToLightpanda(endpoint) {
    log.info({ endpoint }, 'Connecting to Lightpanda CDP server');
    try {
        const browser = await puppeteer.connect({
            browserWSEndpoint: endpoint,
        });
        const version = await browser.version();
        log.info({ version }, 'Connected to Lightpanda');
        return browser;
    }
    catch (err) {
        log.error({ err, endpoint }, 'Failed to connect to Lightpanda');
        throw new Error(`Cannot connect to Lightpanda at ${endpoint}. ` +
            `Make sure Lightpanda is running: lightpanda serve --host 0.0.0.0 --port 9222`);
    }
}
//# sourceMappingURL=lightpanda.js.map