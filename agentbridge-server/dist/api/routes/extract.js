/**
 * AgentBridge Server — Extract Route
 * POST /api/extract — Extract structured content from a URL.
 */
import { Router } from 'express';
import { extractPage } from '../../engine/orchestrator.js';
import { validateBody, extractSchema } from '../middleware/validation.js';
import { createChildLogger } from '../../lib/logger.js';
const log = createChildLogger('api-extract');
export const extractRouter = Router();
/**
 * POST /api/extract
 *
 * Body:
 *   { url: string, format?: 'mcp'|'raw'|'text', chineseCompression?: boolean, waitUntil?: string }
 *
 * Response:
 *   Full extraction result with mcp, raw, text, stats, and toolCount.
 */
extractRouter.post('/', validateBody(extractSchema), async (req, res) => {
    const { url, format, chineseCompression, waitUntil } = req.body;
    const startTime = Date.now();
    log.info({ url, format, chineseCompression }, 'Extract request');
    try {
        const result = await extractPage(url, {
            format,
            chineseCompression,
            waitUntil,
        });
        const elapsed = Date.now() - startTime;
        res.json({
            success: true,
            url,
            format,
            data: format === 'text' ? result.text : format === 'raw' ? result.raw : result.mcp,
            stats: {
                ...result.stats,
                toolCount: result.toolCount,
                extractionTimeMs: elapsed,
            },
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const elapsed = Date.now() - startTime;
        log.error({ err, url, elapsed }, 'Extract failed');
        res.status(500).json({
            success: false,
            error: 'Extraction Failed',
            message,
            url,
            elapsed,
        });
    }
});
//# sourceMappingURL=extract.js.map