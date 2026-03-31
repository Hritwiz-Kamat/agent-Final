/**
 * AgentBridge Server — MCP Formatter
 * Formats extraction output as MCP-compatible JSON.
 *
 * Direct TypeScript port from lib/mcp-formatter.js.
 * Produces three output formats:
 * - MCP: Full MCP-compatible JSON with resources + tools
 * - Raw: Simplified JSON without MCP protocol wrapping
 * - Text: Markdown-formatted text for direct LLM consumption
 */

// ─── Types ────────────────────────────────────────────────

export interface ExtractionMetadata {
  title?: string;
  url?: string;
  domain?: string;
  timestamp?: string;
  description?: string;
  openGraph?: Record<string, string>;
  twitterCard?: Record<string, string>;
  jsonLd?: unknown[];
  canonicalUrl?: string;
  language?: string;
  favicon?: string;
}

export interface StructuredContent {
  headings?: Array<{ level: number; text: string }>;
  paragraphs?: string[];
  links?: Array<{ text: string; href: string; title?: string; isExternal?: boolean }>;
  images?: Array<{ src: string; alt?: string; width?: number; height?: number }>;
  tables?: Array<{ headers: string[]; rows: string[][] }>;
  lists?: Array<{ type: 'ordered' | 'unordered'; items: string[] }>;
  codeBlocks?: Array<{ language?: string; code: string }>;
}

export interface ArticleContent {
  title: string;
  byline: string;
  content: string;
  excerpt: string;
  siteName: string;
  length: number;
}

export interface ExtractionResult {
  metadata: ExtractionMetadata;
  content: {
    structured: StructuredContent;
    article: ArticleContent | null;
    text: string;
  };
  stats: {
    extractionTimeMs: number;
    rawHtmlBytes: number;
    rawTokenEstimate: number;
    compressedTokenEstimate: number;
    tokenSavings: number;
    elementsCounted: Record<string, number>;
  };
}

export interface ToolElement {
  selector: string;
  type: string;
  text?: string;
  href?: string;
  disabled?: boolean;
  form?: string;
  method?: string;
  action?: string;
  fieldCount?: number;
  inputType?: string;
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface MappedTool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  element: ToolElement;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: unknown;
}

export interface MCPOutput {
  _meta: {
    protocol: string;
    version: string;
    generator: string;
    generatorVersion: string;
    timestamp: string;
    source: string;
  };
  resources: MCPResource[];
  tools: Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
    _agentbridge: {
      elementSelector: string;
      elementType: string;
      elementText?: string;
      pageUrl: string;
    };
  }>;
  extractionStats: ExtractionResult['stats'];
}

export interface RawOutput {
  url?: string;
  title?: string;
  description?: string;
  content: StructuredContent;
  article: ArticleContent | null;
  text: string;
  actions: Array<{
    name: string;
    description: string;
    selector?: string;
    type?: string;
  }>;
  stats: ExtractionResult['stats'];
}

// ─── Formatter ────────────────────────────────────────────

/**
 * Format extraction data and tools into MCP-compatible JSON
 */
export function formatMCP(
  extractionResult: ExtractionResult,
  tools: MappedTool[],
  pageUrl: string,
): MCPOutput {
  const timestamp = new Date().toISOString();

  return {
    _meta: {
      protocol: 'mcp',
      version: '1.0',
      generator: 'AgentBridge',
      generatorVersion: '2.0.0',
      timestamp,
      source: pageUrl,
    },
    resources: formatResources(extractionResult, pageUrl),
    tools: formatTools(tools, pageUrl),
    extractionStats: extractionResult.stats || ({} as ExtractionResult['stats']),
  };
}

/**
 * Format page content as MCP resources
 */
function formatResources(extractionResult: ExtractionResult, pageUrl: string): MCPResource[] {
  const resources: MCPResource[] = [];
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    parsedUrl = new URL('http://unknown');
  }

  // Main structured content resource
  resources.push({
    uri: `page://${parsedUrl.hostname}${parsedUrl.pathname}`,
    name: extractionResult.metadata?.title || 'Page Content',
    description: extractionResult.metadata?.description || `Extracted content from ${pageUrl}`,
    mimeType: 'application/json',
    content: {
      metadata: extractionResult.metadata,
      structured: extractionResult.content?.structured || {},
    },
  });

  // Article content resource (if available from Readability.js)
  if (extractionResult.content?.article) {
    resources.push({
      uri: `page://${parsedUrl.hostname}${parsedUrl.pathname}/article`,
      name: extractionResult.content.article.title || 'Article Content',
      description: 'Clean article text extracted via Readability.js',
      mimeType: 'text/plain',
      content: extractionResult.content.article,
    });
  }

  // Text-only resource
  if (extractionResult.content?.text) {
    resources.push({
      uri: `page://${parsedUrl.hostname}${parsedUrl.pathname}/text`,
      name: 'Plain Text Content',
      description: 'Raw text content with noise removed',
      mimeType: 'text/plain',
      content: extractionResult.content.text.substring(0, 100_000),
    });
  }

  return resources;
}

/**
 * Format tools in MCP tool schema
 */
function formatTools(tools: MappedTool[], pageUrl: string) {
  if (!tools || tools.length === 0) return [];

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: tool.input_schema?.type || 'object',
      properties: tool.input_schema?.properties || {},
      required: tool.input_schema?.required || [],
    },
    _agentbridge: {
      elementSelector: tool.element?.selector,
      elementType: tool.element?.type,
      elementText: tool.element?.text,
      pageUrl,
    },
  }));
}

/**
 * Generate a "raw JSON" format (simplified, no MCP wrapping)
 */
export function formatRaw(extractionResult: ExtractionResult, tools: MappedTool[]): RawOutput {
  return {
    url: extractionResult.metadata?.url,
    title: extractionResult.metadata?.title,
    description: extractionResult.metadata?.description,
    content: extractionResult.content?.structured || ({} as StructuredContent),
    article: extractionResult.content?.article || null,
    text: extractionResult.content?.text || '',
    actions: (tools || []).map(t => ({
      name: t.name,
      description: t.description,
      selector: t.element?.selector,
      type: t.element?.type,
    })),
    stats: extractionResult.stats || ({} as ExtractionResult['stats']),
  };
}

/**
 * Generate a "text-only" format (for direct LLM consumption)
 */
export function formatTextOnly(extractionResult: ExtractionResult): string {
  const parts: string[] = [];
  const meta = extractionResult.metadata || {};
  const content = extractionResult.content?.structured || ({} as StructuredContent);

  if (meta.title) parts.push(`# ${meta.title}\n`);
  if (meta.url) parts.push(`URL: ${meta.url}\n`);
  if (meta.description) parts.push(`${meta.description}\n`);

  if (content.headings) {
    content.headings.forEach(h => {
      parts.push(`${'#'.repeat(h.level)} ${h.text}`);
    });
  }

  if (content.paragraphs) {
    content.paragraphs.forEach(p => {
      parts.push(`\n${p}\n`);
    });
  }

  if (content.lists) {
    content.lists.forEach(list => {
      list.items.forEach((item, i) => {
        const prefix = list.type === 'ordered' ? `${i + 1}.` : '-';
        parts.push(`${prefix} ${item}`);
      });
      parts.push('');
    });
  }

  if (content.codeBlocks) {
    content.codeBlocks.forEach(block => {
      parts.push(`\`\`\`${block.language || ''}\n${block.code}\n\`\`\``);
    });
  }

  if (content.tables) {
    content.tables.forEach(table => {
      if (table.headers.length > 0) {
        parts.push(`| ${table.headers.join(' | ')} |`);
        parts.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
      }
      table.rows.forEach(row => {
        parts.push(`| ${row.join(' | ')} |`);
      });
      parts.push('');
    });
  }

  return parts.join('\n');
}
