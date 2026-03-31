/**
 * AgentBridge Server — MCP Server
 * Creates and starts an MCP JSON-RPC 2.0 server with stdio transport.
 *
 * This is the primary integration point for AI agents:
 *   - Claude Desktop
 *   - Cursor / Windsurf
 *   - Any MCP-compatible client
 *
 * Usage:
 *   agentbridge mcp   →  starts stdio MCP server
 *
 * Configuration for Claude Desktop (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "agentbridge": {
 *         "command": "node",
 *         "args": ["/path/to/agentbridge-server/dist/index.js", "mcp"],
 *         "env": { "BROWSER_ENGINE": "chromium" }
 *       }
 *     }
 *   }
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { browserPool } from '../browser/pool.js';
import { createChildLogger } from '../lib/logger.js';
const log = createChildLogger('mcp-server');
/**
 * Create and configure the MCP server with all tools and resources.
 */
export function createMcpServer() {
    const server = new McpServer({
        name: 'agentbridge',
        version: '2.0.0',
    }, {
        capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
        },
    });
    // Register all tools and resources
    registerTools(server);
    registerResources(server);
    log.info('MCP server created with tools and resources');
    return server;
}
/**
 * Start the MCP server with stdio transport.
 * This blocks until the transport closes (e.g. parent process terminates).
 */
export async function startMcpServer() {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    // Graceful shutdown when transport closes
    process.on('SIGINT', async () => {
        log.info('SIGINT received — shutting down MCP server');
        await server.close();
        await browserPool.shutdown();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        log.info('SIGTERM received — shutting down MCP server');
        await server.close();
        await browserPool.shutdown();
        process.exit(0);
    });
    log.info('Starting MCP server with stdio transport...');
    await server.connect(transport);
    // The server is now running and waiting for JSON-RPC messages on stdin.
    // It will respond on stdout. This function effectively "blocks" until
    // the transport is closed.
    log.info('MCP server connected and listening on stdio');
}
//# sourceMappingURL=server.js.map