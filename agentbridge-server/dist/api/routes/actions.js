/**
 * AgentBridge Server — Actions Routes
 * POST /api/actions  — List interactive elements from a URL
 * POST /api/execute  — Execute an action on a page element
 */
import { Router } from 'express';
import { listActions, executeAction } from '../../engine/orchestrator.js';
import { validateBody, actionsSchema, executeSchema } from '../middleware/validation.js';
import { createChildLogger } from '../../lib/logger.js';
const log = createChildLogger('api-actions');
export const actionsRouter = Router();
/**
 * POST /api/actions
 *
 * Body: { url: string }
 *
 * Response: Array of interactive elements with selectors and types.
 */
actionsRouter.post('/', validateBody(actionsSchema), async (req, res) => {
    const { url } = req.body;
    const startTime = Date.now();
    log.info({ url }, 'List actions request');
    try {
        const tools = await listActions(url);
        const elapsed = Date.now() - startTime;
        res.json({
            success: true,
            url,
            toolCount: tools.length,
            tools,
            elapsed,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const elapsed = Date.now() - startTime;
        log.error({ err, url, elapsed }, 'List actions failed');
        res.status(500).json({
            success: false,
            error: 'Action Listing Failed',
            message,
            url,
            elapsed,
        });
    }
});
/**
 * POST /api/execute
 *
 * Body: { url: string, selector: string, action: 'click'|'fill'|'select', value?: string }
 *
 * Response: { success: boolean, message: string }
 */
actionsRouter.post('/execute', validateBody(executeSchema), async (req, res) => {
    const { url, selector, action, value } = req.body;
    log.info({ url, selector, action }, 'Execute action request');
    try {
        const result = await executeAction(url, selector, action, value);
        const statusCode = result.success ? 200 : 422;
        res.status(statusCode).json({
            ...result,
            url,
            selector,
            action,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, url, selector, action }, 'Execute action failed');
        res.status(500).json({
            success: false,
            error: 'Action Execution Failed',
            message,
            url,
            selector,
            action,
        });
    }
});
//# sourceMappingURL=actions.js.map