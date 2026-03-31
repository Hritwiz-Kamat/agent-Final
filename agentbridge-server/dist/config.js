/**
 * AgentBridge Server — Configuration
 * Environment-based configuration with sensible defaults.
 */
function envBool(key, fallback) {
    const val = process.env[key];
    if (val === undefined)
        return fallback;
    return val === 'true' || val === '1';
}
function envInt(key, fallback) {
    const val = process.env[key];
    if (val === undefined)
        return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
}
function envStr(key, fallback) {
    return process.env[key] || fallback;
}
export function loadConfig() {
    return {
        browserEngine: process.env.BROWSER_ENGINE || 'lightpanda',
        lightpandaEndpoint: envStr('LIGHTPANDA_ENDPOINT', 'ws://127.0.0.1:9222'),
        chromiumPath: process.env.CHROMIUM_PATH || undefined,
        maxPages: envInt('MAX_PAGES', 5),
        pageTimeout: envInt('PAGE_TIMEOUT', 30_000),
        navigationTimeout: envInt('NAVIGATION_TIMEOUT', 15_000),
        chineseCompression: envBool('CHINESE_COMPRESSION', false),
        maxContentLength: envInt('MAX_CONTENT_LENGTH', 100_000),
        useReadability: envBool('USE_READABILITY', true),
        obeyRobots: envBool('OBEY_ROBOTS', true),
        apiPort: envInt('API_PORT', 3100),
        apiKey: process.env.API_KEY || undefined,
        rateLimitRpm: envInt('RATE_LIMIT_RPM', 60),
        mcpTransport: process.env.MCP_TRANSPORT || 'stdio',
        mcpHttpPort: envInt('MCP_HTTP_PORT', 8100),
        logLevel: envStr('LOG_LEVEL', 'info'),
    };
}
/** Singleton config instance */
export const config = loadConfig();
//# sourceMappingURL=config.js.map