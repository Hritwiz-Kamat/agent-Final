/**
 * AgentBridge Server — Chromium Fallback
 * Launches a local headless Chromium/Chrome instance via Puppeteer
 * for pages that require a full rendering engine (CSS layout, images, etc.).
 */
import { type Browser } from 'puppeteer-core';
/**
 * Launch a headless Chromium browser.
 * @param executablePath — path to chromium/chrome binary
 * @returns Puppeteer Browser instance
 */
export declare function launchChromium(executablePath?: string): Promise<Browser>;
//# sourceMappingURL=chromium-fallback.d.ts.map