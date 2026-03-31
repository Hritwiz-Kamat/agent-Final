/**
 * AgentBridge Server — API Key Authentication Middleware
 * Optional Bearer token auth. If API_KEY is not set, all requests pass through.
 */
import type { Request, Response, NextFunction } from 'express';
/**
 * Express middleware that checks for a valid API key in the Authorization header.
 * If no API_KEY is configured, all requests are allowed.
 *
 * Expected header: `Authorization: Bearer <API_KEY>`
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map