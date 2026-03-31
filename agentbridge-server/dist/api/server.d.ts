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
/**
 * Create and configure the Express application.
 */
export declare function createApiApp(): import("express-serve-static-core").Express;
/**
 * Start the Express REST API server.
 */
export declare function startApiServer(port: number): Promise<void>;
//# sourceMappingURL=server.d.ts.map