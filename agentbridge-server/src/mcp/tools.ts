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

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractPage, listActions, executeAction } from '../engine/orchestrator.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('mcp-tools');

/**
 * Register all AgentBridge tools on an MCP server instance.
 */
export function registerTools(server: McpServer): void {

  // ─── extract_page ─────────────────────────────────────────
  server.registerTool(
    'extract_page',
    {
      title: 'Extract Page',
      description:
        'Extract structured content and interactive elements from a webpage. ' +
        'Returns MCP-compatible JSON with metadata, structured content, article text, ' +
        'and mapped interactive elements (buttons, forms, links) as callable tools.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL to extract content from'),
        format: z
          .enum(['mcp', 'raw', 'text'])
          .default('mcp')
          .describe('Output format: mcp (full MCP JSON), raw (simplified JSON), text (markdown)'),
        chineseCompression: z
          .boolean()
          .default(false)
          .describe('Enable Chinese token compression for 40-60% additional token savings'),
        waitUntil: z
          .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
          .default('networkidle0')
          .describe('When to consider navigation complete'),
      }),
      annotations: {
        title: 'Extract Page Content',
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ url, format, chineseCompression, waitUntil }) => {
      log.info({ url, format }, 'extract_page called');

      try {
        const result = await extractPage(url, {
          format,
          chineseCompression,
          waitUntil,
        });

        const output =
          format === 'text'
            ? result.text
            : JSON.stringify(format === 'raw' ? result.raw : result.mcp, null, 2);

        return {
          content: [
            {
              type: 'text' as const,
              text: output,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, url }, 'extract_page failed');
        return {
          content: [{ type: 'text' as const, text: `Extraction failed: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── list_actions ─────────────────────────────────────────
  server.registerTool(
    'list_actions',
    {
      title: 'List Page Actions',
      description:
        'Get all interactive elements from a webpage as callable tools. ' +
        'Returns buttons, links, forms, inputs, and other interactive elements ' +
        'with their selectors, types, labels, and available actions.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL to scan for interactive elements'),
      }),
      annotations: {
        title: 'List Interactive Actions',
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ url }) => {
      log.info({ url }, 'list_actions called');

      try {
        const tools = await listActions(url);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(tools, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, url }, 'list_actions failed');
        return {
          content: [{ type: 'text' as const, text: `Action listing failed: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── get_page_text ────────────────────────────────────────
  server.registerTool(
    'get_page_text',
    {
      title: 'Get Page Text',
      description:
        'Get clean text-only content from a webpage, formatted as markdown. ' +
        'Ideal for feeding directly into LLM prompts. Strips all HTML noise, ' +
        'ads, navigation, scripts, and styles. Returns only semantic content.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL to extract text from'),
        chineseCompression: z
          .boolean()
          .default(false)
          .describe('Enable Chinese token compression'),
      }),
      annotations: {
        title: 'Get Clean Page Text',
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ url, chineseCompression }) => {
      log.info({ url }, 'get_page_text called');

      try {
        const result = await extractPage(url, {
          format: 'text',
          chineseCompression,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: result.text,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, url }, 'get_page_text failed');
        return {
          content: [{ type: 'text' as const, text: `Text extraction failed: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── execute_action ───────────────────────────────────────
  server.registerTool(
    'execute_action',
    {
      title: 'Execute Page Action',
      description:
        'Execute an action on a webpage element — click a button, fill an input field, ' +
        'or select a dropdown option. Use the selector from list_actions or extract_page results.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL of the page to interact with'),
        selector: z.string().describe('CSS selector of the element to interact with'),
        action: z
          .enum(['click', 'fill', 'select'])
          .describe('Action to perform: click (button/link), fill (text input), select (dropdown)'),
        value: z
          .string()
          .optional()
          .describe('Value for fill/select actions (required for fill and select)'),
      }),
      annotations: {
        title: 'Execute Action on Page',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ url, selector, action, value }) => {
      log.info({ url, selector, action }, 'execute_action called');

      try {
        const result = await executeAction(url, selector, action, value);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !result.success,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, url, selector }, 'execute_action failed');
        return {
          content: [{ type: 'text' as const, text: `Action execution failed: ${message}` }],
          isError: true,
        };
      }
    },
  );

  log.info('All 4 MCP tools registered');
}
