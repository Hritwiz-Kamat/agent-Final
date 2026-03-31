/**
 * AgentBridge Server — Rate Limiting Middleware
 * Limits requests per IP using express-rate-limit.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../../config.js';

/**
 * Create a rate limiter middleware based on config.
 * Default: 60 requests per minute per IP.
 */
export function createRateLimiter() {
  return rateLimit({
    windowMs: 60_000, // 1 minute window
    max: config.rateLimitRpm,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${config.rateLimitRpm} requests per minute.`,
      retryAfterMs: 60_000,
    },
    keyGenerator: (req) => {
      // Use X-Forwarded-For if behind a proxy, else req.ip
      return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    },
  });
}
