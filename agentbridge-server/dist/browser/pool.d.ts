/**
 * AgentBridge Server — Browser Connection Pool
 * Manages a pool of reusable Puppeteer page instances.
 * Supports both Lightpanda (CDP connect) and Chromium (local launch).
 */
import type { Page } from 'puppeteer-core';
export interface PoolStats {
    engine: string;
    totalCreated: number;
    activePages: number;
    idlePages: number;
    maxPages: number;
}
export declare class BrowserPool {
    private browser;
    private idle;
    private active;
    private totalCreated;
    private engine;
    private maxPages;
    private initializing;
    constructor(engine?: 'lightpanda' | 'chromium', maxPages?: number);
    /**
     * Initialize the browser connection (lazy, called on first acquirePage).
     */
    private ensureBrowser;
    /**
     * Acquire a page from the pool. Creates a new one if needed.
     */
    acquirePage(): Promise<Page>;
    /**
     * Release a page back to the pool.
     * Clears page state for reuse.
     */
    releasePage(page: Page): Promise<void>;
    /**
     * Wait until a page becomes available.
     */
    private waitForAvailablePage;
    /**
     * Get pool statistics.
     */
    getStats(): PoolStats;
    /**
     * Health check: verify the browser connection is alive.
     */
    isHealthy(): Promise<boolean>;
    /**
     * Shut down the pool and close the browser.
     */
    shutdown(): Promise<void>;
}
/** Singleton pool instance */
export declare const browserPool: BrowserPool;
//# sourceMappingURL=pool.d.ts.map