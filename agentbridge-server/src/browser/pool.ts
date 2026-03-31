/**
 * AgentBridge Server — Browser Connection Pool
 * Manages a pool of reusable Puppeteer page instances.
 * Supports both Lightpanda (CDP connect) and Chromium (local launch).
 */

import type { Browser, Page } from 'puppeteer-core';
import { connectToLightpanda } from './lightpanda.js';
import { launchChromium } from './chromium-fallback.js';
import { config } from '../config.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('pool');

export interface PoolStats {
  engine: string;
  totalCreated: number;
  activePages: number;
  idlePages: number;
  maxPages: number;
}

export class BrowserPool {
  private browser: Browser | null = null;
  private idle: Page[] = [];
  private active: Set<Page> = new Set();
  private totalCreated = 0;
  private engine: 'lightpanda' | 'chromium';
  private maxPages: number;
  private initializing: Promise<void> | null = null;

  constructor(
    engine: 'lightpanda' | 'chromium' = config.browserEngine,
    maxPages: number = config.maxPages,
  ) {
    this.engine = engine;
    this.maxPages = maxPages;
  }

  /**
   * Initialize the browser connection (lazy, called on first acquirePage).
   */
  private async ensureBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;

    // Prevent concurrent initialization
    if (this.initializing) {
      await this.initializing;
      return this.browser!;
    }

    this.initializing = (async () => {
      log.info({ engine: this.engine }, 'Initializing browser pool');

      if (this.engine === 'lightpanda') {
        this.browser = await connectToLightpanda(config.lightpandaEndpoint);
      } else {
        this.browser = await launchChromium(config.chromiumPath);
      }

      // Handle browser disconnection
      this.browser.on('disconnected', () => {
        log.warn('Browser disconnected — pool will reconnect on next request');
        this.browser = null;
        this.idle = [];
        this.active.clear();
      });
    })();

    await this.initializing;
    this.initializing = null;
    return this.browser!;
  }

  /**
   * Acquire a page from the pool. Creates a new one if needed.
   */
  async acquirePage(): Promise<Page> {
    const browser = await this.ensureBrowser();

    // Reuse an idle page if available
    if (this.idle.length > 0) {
      const page = this.idle.pop()!;
      this.active.add(page);
      log.debug({ idle: this.idle.length, active: this.active.size }, 'Reused idle page');
      return page;
    }

    // Check pool limit
    if (this.active.size >= this.maxPages) {
      log.warn({ active: this.active.size, max: this.maxPages }, 'Pool at capacity — waiting');
      // Wait for a page to be released (simple polling)
      await this.waitForAvailablePage();
      return this.acquirePage();
    }

    // Create a new page
    const page = await browser.newPage();
    this.totalCreated++;
    this.active.add(page);

    // Set default timeouts
    page.setDefaultTimeout(config.pageTimeout);
    page.setDefaultNavigationTimeout(config.navigationTimeout);

    log.debug({ totalCreated: this.totalCreated, active: this.active.size }, 'Created new page');
    return page;
  }

  /**
   * Release a page back to the pool.
   * Clears page state for reuse.
   */
  async releasePage(page: Page): Promise<void> {
    this.active.delete(page);

    try {
      // Clear cookies and navigate to blank page to reset state
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
      await page.goto('about:blank', { timeout: 5000 }).catch(() => {});

      this.idle.push(page);
      log.debug({ idle: this.idle.length, active: this.active.size }, 'Page released to pool');
    } catch (err) {
      // Page is broken — close and discard
      log.debug({ err }, 'Page broken on release — discarding');
      await page.close().catch(() => {});
    }
  }

  /**
   * Wait until a page becomes available.
   */
  private async waitForAvailablePage(timeoutMs = 30_000): Promise<void> {
    const start = Date.now();
    while (this.idle.length === 0 && this.active.size >= this.maxPages) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Pool timeout: no available pages after ${timeoutMs}ms`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  /**
   * Get pool statistics.
   */
  getStats(): PoolStats {
    return {
      engine: this.engine,
      totalCreated: this.totalCreated,
      activePages: this.active.size,
      idlePages: this.idle.length,
      maxPages: this.maxPages,
    };
  }

  /**
   * Health check: verify the browser connection is alive.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.browser) return false;
    try {
      await this.browser.version();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Shut down the pool and close the browser.
   */
  async shutdown(): Promise<void> {
    log.info('Shutting down browser pool');

    // Close all pages
    for (const page of [...this.idle, ...this.active]) {
      await page.close().catch(() => {});
    }
    this.idle = [];
    this.active.clear();

    // Close browser
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    log.info('Browser pool shut down');
  }
}

/** Singleton pool instance */
export const browserPool = new BrowserPool();
