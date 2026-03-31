/**
 * AgentBridge Server — API Key Authentication Middleware
 * Optional Bearer token auth. If API_KEY is not set, all requests pass through.
 */

import type { Request, Response, NextFunction } from 'express';
import { config } from '../../config.js';
import { createChildLogger } from '../../lib/logger.js';

const log = createChildLogger('auth');

/**
 * Express middleware that checks for a valid API key in the Authorization header.
 * If no API_KEY is configured, all requests are allowed.
 *
 * Expected header: `Authorization: Bearer <API_KEY>`
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // Skip auth if no API key is configured
  if (!config.apiKey) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    log.warn({ path: req.path, ip: req.ip }, 'Missing Authorization header');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header. Use: Authorization: Bearer <API_KEY>',
    });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    log.warn({ path: req.path, ip: req.ip }, 'Invalid auth scheme');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid auth format. Use: Authorization: Bearer <API_KEY>',
    });
    return;
  }

  if (token !== config.apiKey) {
    log.warn({ path: req.path, ip: req.ip }, 'Invalid API key');
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
    });
    return;
  }

  next();
}
