/**
 * AgentBridge Server — Orchestrator
 * Main extraction pipeline: navigate → inject → extract → map → format.
 *
 * Replaces the Chrome Extension's content/index.js + background/service-worker.js.
 * Uses Puppeteer page.evaluate() to inject and run extraction scripts in the page DOM.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserPool } from '../browser/pool.js';
import { extractArticle } from '../lib/readability.js';
import { applyChineseCompression } from './cleaner.js';
import {
  formatMCP,
  formatRaw,
  formatTextOnly,
  type ExtractionResult,
  type MappedTool,
  type MCPOutput,
  type RawOutput,
} from './mcp-formatter.js';
import { config } from '../config.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('orchestrator');

// ─── Types ────────────────────────────────────────────────

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

// ─── Script Loading ───────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load an injectable script from the scripts/ directory */
function loadScript(filename: string): string {
  const scriptPath = resolve(__dirname, 'scripts', filename);
  return readFileSync(scriptPath, 'utf-8');
}

// Cache loaded scripts (they don't change at runtime)
let cleanerScript: string;
let extractorScript: string;
let actionMapperScript: string;

function getScripts() {
  if (!cleanerScript) {
    cleanerScript = loadScript('cleaner.bundle.js');
    extractorScript = loadScript('extractor.bundle.js');
    actionMapperScript = loadScript('action-mapper.bundle.js');
    log.info('Injectable scripts loaded');
  }
  return { cleanerScript, extractorScript, actionMapperScript };
}

// ─── Main Pipeline ────────────────────────────────────────

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
export async function extractPage(
  url: string,
  options: ExtractOptions = {},
): Promise<ExtractionOutput> {
  const startTime = Date.now();
  const {
    chineseCompression = config.chineseCompression,
    waitUntil = 'networkidle0',
    navigationTimeout = config.navigationTimeout,
    useReadability = config.useReadability,
  } = options;

  log.info({ url, waitUntil, chineseCompression }, 'Starting extraction');

  const page = await browserPool.acquirePage();

  try {
    // 1. Navigate to the URL
    await page.goto(url, {
      waitUntil: waitUntil as 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2',
      timeout: navigationTimeout,
    });

    log.debug({ url }, 'Page loaded');

    // 2. Load injectable scripts
    const scripts = getScripts();

    // 3. Inject cleaner first (extractor depends on it)
    await page.evaluate(scripts.cleanerScript);

    // 4. Inject and run extractor
    await page.evaluate(scripts.extractorScript);
    const extractionData = await page.evaluate(() => {
      const extractor = (window as any).__agentBridge_extractor;
      if (!extractor) throw new Error('Extractor not loaded');
      return extractor.extract({});
    }) as ExtractionResult & { rawHtml?: string };

    log.debug(
      { elementsExtracted: extractionData.stats?.elementsCounted },
      'Extraction complete',
    );

    // 5. Inject and run action mapper
    await page.evaluate(scripts.actionMapperScript);
    const tools = await page.evaluate(() => {
      const mapper = (window as any).__agentBridge_actionMapper;
      if (!mapper) throw new Error('ActionMapper not loaded');
      return mapper.mapActions();
    }) as MappedTool[];

    log.debug({ toolCount: tools.length }, 'Action mapping complete');

    // 6. Run Readability.js server-side if we have raw HTML
    if (useReadability && extractionData.rawHtml) {
      const article = extractArticle(extractionData.rawHtml, url);
      if (article) {
        extractionData.content.article = article;
      }
    }

    // Clean up rawHtml (don't include in output — too large)
    delete extractionData.rawHtml;

    // 7. Format outputs
    const mcp = formatMCP(extractionData, tools, url);
    const raw = formatRaw(extractionData, tools);
    const text = formatTextOnly(extractionData);

    // 8. Apply Chinese compression if enabled
    let output: ExtractionOutput = {
      mcp,
      raw,
      text,
      stats: extractionData.stats,
      toolCount: tools.length,
    };

    if (chineseCompression) {
      const { result: compressedMcp, replacements: mcpRep } = applyChineseCompression(mcp);
      const { result: compressedRaw, replacements: rawRep } = applyChineseCompression(raw);

      output = {
        ...output,
        mcp: compressedMcp as MCPOutput,
        raw: compressedRaw as RawOutput,
      };

      log.info(
        { mcpReplacements: mcpRep, rawReplacements: rawRep },
        'Chinese compression applied',
      );
    }

    const elapsed = Date.now() - startTime;
    log.info(
      { url, elapsed, toolCount: tools.length, tokenSavings: extractionData.stats?.tokenSavings },
      'Extraction complete',
    );

    return output;
  } catch (err) {
    log.error({ err, url }, 'Extraction failed');
    throw err;
  } finally {
    // 9. Release page back to pool
    await browserPool.releasePage(page);
  }
}

/**
 * Get only the interactive elements (tools) from a URL.
 */
export async function listActions(url: string): Promise<MappedTool[]> {
  const page = await browserPool.acquirePage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: config.navigationTimeout,
    });

    const scripts = getScripts();
    await page.evaluate(scripts.cleanerScript);
    await page.evaluate(scripts.actionMapperScript);

    const tools = await page.evaluate(() => {
      const mapper = (window as any).__agentBridge_actionMapper;
      if (!mapper) throw new Error('ActionMapper not loaded');
      return mapper.mapActions();
    }) as MappedTool[];

    return tools;
  } finally {
    await browserPool.releasePage(page);
  }
}

/**
 * Execute an action on a page (click, fill, select).
 */
export async function executeAction(
  url: string,
  selector: string,
  action: 'click' | 'fill' | 'select',
  value?: string,
): Promise<{ success: boolean; message: string }> {
  const page = await browserPool.acquirePage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: config.navigationTimeout,
    });

    switch (action) {
      case 'click':
        await page.click(selector);
        return { success: true, message: `Clicked element: ${selector}` };

      case 'fill':
        if (!value) throw new Error('Value required for fill action');
        await page.type(selector, value);
        return { success: true, message: `Filled '${selector}' with '${value}'` };

      case 'select':
        if (!value) throw new Error('Value required for select action');
        await page.select(selector, value);
        return { success: true, message: `Selected '${value}' in '${selector}'` };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message };
  } finally {
    await browserPool.releasePage(page);
  }
}
