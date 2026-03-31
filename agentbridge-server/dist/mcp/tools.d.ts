/**
 * AgentBridge Server — MCP Tool Definitions
 * Registers extraction and interaction tools with the MCP server.
 *
 * Tools:
 *   extract_page   — Extract structured content + mapped actions from a URL
 *   list_actions    — Get interactive elements/tools from a URL
 *   get_page_text   — Get clean text-only content from a URL
 *   execute_action  — Click/fill/select on a page element
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Register all AgentBridge tools on an MCP server instance.
 */
export declare function registerTools(server: McpServer): void;
//# sourceMappingURL=tools.d.ts.map