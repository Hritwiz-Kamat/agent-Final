/**
 * AgentBridge Server — Rate Limiting Middleware
 * Limits requests per IP using express-rate-limit.
 */
/**
 * Create a rate limiter middleware based on config.
 * Default: 60 requests per minute per IP.
 */
export declare function createRateLimiter(): import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rate-limit.d.ts.map