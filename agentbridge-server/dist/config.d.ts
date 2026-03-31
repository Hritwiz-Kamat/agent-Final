/**
 * AgentBridge Server — Configuration
 * Environment-based configuration with sensible defaults.
 */
export interface Config {
    browserEngine: 'lightpanda' | 'chromium';
    lightpandaEndpoint: string;
    chromiumPath?: string;
    maxPages: number;
    pageTimeout: number;
    navigationTimeout: number;
    chineseCompression: boolean;
    maxContentLength: number;
    useReadability: boolean;
    obeyRobots: boolean;
    apiPort: number;
    apiKey?: string;
    rateLimitRpm: number;
    mcpTransport: 'stdio' | 'http';
    mcpHttpPort: number;
    logLevel: string;
}
export declare function loadConfig(): Config;
/** Singleton config instance */
export declare const config: Config;
//# sourceMappingURL=config.d.ts.map