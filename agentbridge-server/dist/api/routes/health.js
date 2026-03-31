/**
 * AgentBridge Server — Health Route
 * GET /api/health — Server health check with pool stats.
 */
import { Router } from 'express';
import { browserPool } from '../../browser/pool.js';
export const healthRouter = Router();
/**
 * GET /api/health
 *
 * Response: { status, uptime, poolStats, timestamp }
 */
healthRouter.get('/', async (_req, res) => {
    const healthy = await browserPool.isHealthy();
    const poolStats = browserPool.getStats();
    const statusCode = healthy ? 200 : 503;
    res.status(statusCode).json({
        status: healthy ? 'healthy' : 'unhealthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        pool: poolStats,
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        },
    });
});
//# sourceMappingURL=health.js.map