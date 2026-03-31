/**
 * AgentBridge Server — Chromium Fallback
 * Launches a local headless Chromium/Chrome instance via Puppeteer
 * for pages that require a full rendering engine (CSS layout, images, etc.).
 */
import puppeteer from 'puppeteer-core';
import { createChildLogger } from '../lib/logger.js';
const log = createChildLogger('chromium');
/**
 * Launch a headless Chromium browser.
 * @param executablePath — path to chromium/chrome binary
 * @returns Puppeteer Browser instance
 */
export async function launchChromium(executablePath) {
    const chromePath = executablePath || detectChromePath();
    log.info({ chromePath }, 'Launching headless Chromium');
    try {
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: chromePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
            ],
        });
        const version = await browser.version();
        log.info({ version }, 'Chromium launched');
        return browser;
    }
    catch (err) {
        log.error({ err, chromePath }, 'Failed to launch Chromium');
        throw new Error(`Cannot launch Chromium at ${chromePath}. ` +
            `Set CHROMIUM_PATH environment variable to your Chrome/Chromium executable.`);
    }
}
/**
 * Detect Chrome/Chromium executable path based on OS.
 */
function detectChromePath() {
    const platform = process.platform;
    if (platform === 'win32') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    if (platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    // Linux
    return '/usr/bin/chromium';
}
//# sourceMappingURL=chromium-fallback.js.map