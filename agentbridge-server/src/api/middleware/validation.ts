/**
 * AgentBridge Server — Request Validation Middleware
 * Validates request bodies against Zod schemas.
 */

import { z, type ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/**
 * Creates an Express middleware that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (typed) result.
 * On failure, returns a 400 error with detailed validation messages.
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request body',
        details: errors,
      });
      return;
    }

    // Replace body with parsed & typed data
    req.body = result.data;
    next();
  };
}

// ─── Shared Schemas ────────────────────────────────────────

export const extractSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  format: z.enum(['mcp', 'raw', 'text']).default('mcp'),
  chineseCompression: z.boolean().default(false),
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
    .default('networkidle0'),
});

export const actionsSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export const executeSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  selector: z.string().min(1, 'Selector is required'),
  action: z.enum(['click', 'fill', 'select']),
  value: z.string().optional(),
});

export type ExtractInput = z.infer<typeof extractSchema>;
export type ActionsInput = z.infer<typeof actionsSchema>;
export type ExecuteInput = z.infer<typeof executeSchema>;
