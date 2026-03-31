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
    headings?: Array<{
        level: number;
        text: string;
    }>;
    paragraphs?: string[];
    links?: Array<{
        text: string;
        href: string;
        title?: string;
        isExternal?: boolean;
    }>;
    images?: Array<{
        src: string;
        alt?: string;
        width?: number;
        height?: number;
    }>;
    tables?: Array<{
        headers: string[];
        rows: string[][];
    }>;
    lists?: Array<{
        type: 'ordered' | 'unordered';
        items: string[];
    }>;
    codeBlocks?: Array<{
        language?: string;
        code: string;
    }>;
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
    options?: Array<{
        value: string;
        label: string;
    }>;
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
/**
 * Format extraction data and tools into MCP-compatible JSON
 */
export declare function formatMCP(extractionResult: ExtractionResult, tools: MappedTool[], pageUrl: string): MCPOutput;
/**
 * Generate a "raw JSON" format (simplified, no MCP wrapping)
 */
export declare function formatRaw(extractionResult: ExtractionResult, tools: MappedTool[]): RawOutput;
/**
 * Generate a "text-only" format (for direct LLM consumption)
 */
export declare function formatTextOnly(extractionResult: ExtractionResult): string;
//# sourceMappingURL=mcp-formatter.d.ts.map