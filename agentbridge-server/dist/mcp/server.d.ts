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
/**
 * Create and configure the MCP server with all tools and resources.
 */
export declare function createMcpServer(): McpServer;
/**
 * Start the MCP server with stdio transport.
 * This blocks until the transport closes (e.g. parent process terminates).
 */
export declare function startMcpServer(): Promise<void>;
//# sourceMappingURL=server.d.ts.map