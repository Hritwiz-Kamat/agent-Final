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
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractPage } from '../engine/orchestrator.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('mcp-resources');

/**
 * In-memory cache of recently extracted pages.
 * Keys are normalized URLs, values are extraction results.
 */
interface CachedExtraction {
  mcp: unknown;
  raw: unknown;
  text: string;
  extractedAt: string;
  url: string;
}

const pageCache = new Map<string, CachedExtraction>();
const MAX_CACHE_ENTRIES = 50;

/**
 * Normalize a URL for cache key usage.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Strip trailing slash for consistency
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Cache an extraction result for later resource reads.
 */
export function cacheExtraction(url: string, result: { mcp: unknown; raw: unknown; text: string }): void {
  const key = normalizeUrl(url);

  // Evict oldest if at capacity
  if (pageCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = pageCache.keys().next().value;
    if (oldest) pageCache.delete(oldest);
  }

  pageCache.set(key, {
    ...result,
    extractedAt: new Date().toISOString(),
    url,
  });
}

/**
 * Build the full URL from domain + path resource template variables.
 */
function buildUrl(domain: string, path: string): string {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `https://${domain}${cleanPath}`;
}

/**
 * Register all AgentBridge resources on an MCP server instance.
 */
export function registerResources(server: McpServer): void {

  // ─── page://{domain}/{+path} — Structured content ────────
  server.registerResource(
    'page_content',
    new ResourceTemplate('page://{domain}/{+path}', { list: undefined }),
    {
      description:
        'Structured page content extracted by AgentBridge. ' +
        'Returns JSON with metadata, structured content, article text, and interactive elements.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const domain = variables.domain as string;
      const path = variables.path as string;
      const url = buildUrl(domain, path);
      const cacheKey = normalizeUrl(url);

      log.info({ domain, path, url }, 'Resource read: page content');

      // Check cache first
      let cached = pageCache.get(cacheKey);

      if (!cached) {
        // Extract on-demand if not cached
        log.info({ url }, 'Cache miss — extracting page');
        try {
          const result = await extractPage(url, { format: 'mcp' });
          cacheExtraction(url, result);
          cached = pageCache.get(cacheKey);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify({ error: message, url }),
              },
            ],
          };
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(cached!.mcp, null, 2),
          },
        ],
      };
    },
  );

  // ─── page://{domain}/{+path}/text — Plain text ───────────
  server.registerResource(
    'page_text',
    new ResourceTemplate('page://{domain}/{+path}/text', { list: undefined }),
    {
      description:
        'Clean plain-text content from a webpage, formatted as markdown. ' +
        'All HTML noise stripped. Ideal for direct LLM consumption.',
      mimeType: 'text/plain',
    },
    async (uri, variables) => {
      const domain = variables.domain as string;
      const path = variables.path as string;
      // Remove the trailing /text from the path to get the actual page path
      const pagePath = path.replace(/\/text$/, '');
      const url = buildUrl(domain, pagePath);
      const cacheKey = normalizeUrl(url);

      log.info({ domain, path: pagePath, url }, 'Resource read: page text');

      // Check cache first
      let cached = pageCache.get(cacheKey);

      if (!cached) {
        log.info({ url }, 'Cache miss — extracting page');
        try {
          const result = await extractPage(url, { format: 'text' });
          cacheExtraction(url, result);
          cached = pageCache.get(cacheKey);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/plain',
                text: `Error extracting page: ${message}`,
              },
            ],
          };
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: cached!.text,
          },
        ],
      };
    },
  );

  log.info('MCP resources registered (page_content, page_text)');
}
