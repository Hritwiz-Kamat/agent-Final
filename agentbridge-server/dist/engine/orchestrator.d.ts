/**
 * AgentBridge Server — Orchestrator
 * Main extraction pipeline: navigate → inject → extract → map → format.
 *
 * Replaces the Chrome Extension's content/index.js + background/service-worker.js.
 * Uses Puppeteer page.evaluate() to inject and run extraction scripts in the page DOM.
 */
import { type ExtractionResult, type MappedTool, type MCPOutput, type RawOutput } from './mcp-formatter.js';
export type OutputFormat = 'mcp' | 'raw' | 'text';
export type WaitUntilOption = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
export interface ExtractOptions {
    format?: OutputFormat;
    chineseCompression?: boolean;
    waitUntil?: WaitUntilOption;
    navigationTimeout?: number;
    useReadability?: boolean;
}
export interface ExtractionOutput {
    mcp: MCPOutput;
    raw: RawOutput;
    text: string;
    stats: ExtractionResult['stats'];
    toolCount: number;
}
/**
 * Extract structured content and interactive elements from a URL.
 *
 * Pipeline:
 * 1. Acquire a page from the browser pool
 * 2. Navigate to the URL
 * 3. Inject cleaner → extractor → action-mapper scripts
 * 4. Run extraction in page context
 * 5. Run action mapping in page context
 * 6. Run Readability.js server-side on raw HTML
 * 7. Format outputs (MCP, Raw, Text)
 * 8. Apply Chinese compression if enabled
 * 9. Release page back to pool
 */
export declare function extractPage(url: string, options?: ExtractOptions): Promise<ExtractionOutput>;
/**
 * Get only the interactive elements (tools) from a URL.
 */
export declare function listActions(url: string): Promise<MappedTool[]>;
/**
 * Execute an action on a page (click, fill, select).
 */
export declare function executeAction(url: string, selector: string, action: 'click' | 'fill' | 'select', value?: string): Promise<{
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=orchestrator.d.ts.map