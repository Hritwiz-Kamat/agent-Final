/**
 * AgentBridge Server — Express REST API
 * Wires all routes and middleware into an Express application.
 *
 * Endpoints:
 *   POST /api/extract       — Extract structured content from a URL
 *   POST /api/actions       — List interactive elements from a URL
 *   POST /api/actions/execute — Execute an action on a page element
 *   GET  /api/health        — Health check with pool stats
 *
 * Usage:
 *   agentbridge serve --port 3100
 */

import express from 'express';
import { apiKeyAuth } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { extractRouter } from './routes/extract.js';
import { actionsRouter } from './routes/actions.js';
import { healthRouter } from './routes/health.js';
import { browserPool } from '../browser/pool.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('api');

/**
 * Create and configure the Express application.
 */
export function createApiApp() {
  const app = express();

  // ─── Global Middleware ──────────────────────────────────
  app.use(express.json({ limit: '1mb' }));

  // CORS — allow all origins for local dev / API usage
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Rate limiting (applies to all routes)
  app.use(createRateLimiter());

  // ─── Public Routes ──────────────────────────────────────
  // Health check doesn't require auth
  app.use('/api/health', healthRouter);

  // ─── Protected Routes ───────────────────────────────────
  // Auth middleware (skips if no API_KEY configured)
  app.use('/api', apiKeyAuth);

  app.use('/api/extract', extractRouter);
  app.use('/api/actions', actionsRouter);

  // ─── Root Info ──────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.json({
      name: 'AgentBridge Server',
      version: '2.0.0',
      description: 'Turn any URL into structured, MCP-compatible JSON with mapped interactive elements.',
      endpoints: {
        'POST /api/extract': 'Extract structured content from a URL',
        'POST /api/actions': 'List interactive elements from a URL',
        'POST /api/actions/execute': 'Execute an action on a page element',
        'GET  /api/health': 'Health check with pool stats',
      },
      docs: 'https://github.com/krishgupta69/agentbrowser',
    });
  });

  // ─── 404 Handler ────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${_req.method} ${_req.path} not found`,
      availableEndpoints: [
        'POST /api/extract',
        'POST /api/actions',
        'POST /api/actions/execute',
        'GET  /api/health',
      ],
    });
  });

  // ─── Error Handler ──────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log.error({ err }, 'Unhandled error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    });
  });

  return app;
}

/**
 * Start the Express REST API server.
 */
export async function startApiServer(port: number): Promise<void> {
  const app = createApiApp();

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      log.info({ port }, `AgentBridge REST API listening on http://localhost:${port}`);
      log.info('Endpoints:');
      log.info('  POST /api/extract       — Extract page content');
      log.info('  POST /api/actions       — List interactive elements');
      log.info('  POST /api/actions/execute — Execute page action');
      log.info('  GET  /api/health        — Health check');
      resolve();
    });

    // Graceful shutdown
    const shutdown = async () => {
      log.info('Shutting down API server...');
      server.close();
      await browserPool.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}
