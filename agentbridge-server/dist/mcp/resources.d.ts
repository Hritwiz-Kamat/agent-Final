/**
 * AgentBridge Server — MCP Resource Definitions
 * Registers MCP resources and resource templates for page content.
 *
 * Resources provide a way for MCP clients to read previously extracted page content.
 * We use a resource template pattern so any page URL can be a resource.
 *
 * Resources:
 *   page://{domain}/{path}        — Full structured page content (JSON)
 *   page://{domain}/{path}/text   — Plain text content (markdown)
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Cache an extraction result for later resource reads.
 */
export declare function cacheExtraction(url: string, result: {
    mcp: unknown;
    raw: unknown;
    text: string;
}): void;
/**
 * Register all AgentBridge resources on an MCP server instance.
 */
export declare function registerResources(server: McpServer): void;
//# sourceMappingURL=resources.d.ts.map