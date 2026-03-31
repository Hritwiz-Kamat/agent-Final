#!/usr/bin/env node

/**
 * AgentBridge Server — Entry Point
 * Supports three modes:
 *   - MCP server (stdio, for Claude/Cursor integration)
 *   - REST API server (Express)
 *   - CLI (single extraction)
 *
 * Usage:
 *   agentbridge mcp                          # Start MCP server
 *   agentbridge serve --port 3100            # Start REST API
 *   agentbridge extract https://example.com  # CLI extraction
 */

import { Command } from 'commander';
import { config } from './config.js';
import { browserPool } from './browser/pool.js';
import { extractPage, listActions, executeAction } from './engine/orchestrator.js';
import { createChildLogger } from './lib/logger.js';

const log = createChildLogger('main');

const program = new Command()
  .name('agentbridge')
  .description('AgentBridge — Turn any URL into structured, MCP-compatible JSON')
  .version('2.0.0');

// ─── CLI: Extract a page ──────────────────────────────────

program
  .command('extract <url>')
  .description('Extract structured content from a URL')
  .option('-f, --format <format>', 'Output format: mcp, raw, text', 'mcp')
  .option('-c, --compress', 'Enable Chinese token compression')
  .option('--wait <event>', 'Wait until: load, domcontentloaded, networkidle0, networkidle2', 'networkidle0')
  .action(async (url: string, opts: { format: string; compress?: boolean; wait: string }) => {
    try {
      const result = await extractPage(url, {
        format: opts.format as 'mcp' | 'raw' | 'text',
        chineseCompression: opts.compress || false,
        waitUntil: opts.wait as 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2',
      });

      const output = opts.format === 'text'
        ? result.text
        : JSON.stringify(opts.format === 'raw' ? result.raw : result.mcp, null, 2);

      process.stdout.write(output + '\n');

      log.info({
        url,
        format: opts.format,
        toolCount: result.toolCount,
        tokenSavings: result.stats?.tokenSavings,
      }, 'Extraction complete');
    } catch (err) {
      log.error({ err, url }, 'Extraction failed');
      process.exit(1);
    } finally {
      await browserPool.shutdown();
    }
  });

// ─── CLI: List actions ────────────────────────────────────

program
  .command('actions <url>')
  .description('List interactive elements from a URL')
  .action(async (url: string) => {
    try {
      const tools = await listActions(url);
      process.stdout.write(JSON.stringify(tools, null, 2) + '\n');
    } catch (err) {
      log.error({ err, url }, 'Action listing failed');
      process.exit(1);
    } finally {
      await browserPool.shutdown();
    }
  });

// ─── MCP Server ───────────────────────────────────────────

program
  .command('mcp')
  .description('Start MCP server (stdio transport for Claude/Cursor)')
  .action(async () => {
    log.info('MCP server mode — will be implemented in Phase 4');
    log.info('For now, use the CLI or REST API interface');
    // Phase 4 will add:
    // import { startMcpServer } from './mcp/server.js';
    // await startMcpServer();
    process.stdout.write(JSON.stringify({
      message: 'MCP server will be implemented in Phase 4',
      hint: 'Use "agentbridge extract <url>" or "agentbridge serve" instead',
    }) + '\n');
    process.exit(0);
  });

// ─── REST API Server ──────────────────────────────────────

program
  .command('serve')
  .description('Start REST API server')
  .option('-p, --port <port>', 'API port', String(config.apiPort))
  .option('--mcp', 'Also start MCP server (stdio)')
  .action(async (opts: { port: string; mcp?: boolean }) => {
    log.info('REST API server mode — will be implemented in Phase 5');
    log.info('For now, use the CLI interface');
    // Phase 5 will add:
    // import { startApiServer } from './api/server.js';
    // await startApiServer(parseInt(opts.port));
    process.stdout.write(JSON.stringify({
      message: 'REST API server will be implemented in Phase 5',
      hint: 'Use "agentbridge extract <url>" for now',
    }) + '\n');
    process.exit(0);
  });

// ─── Graceful Shutdown ────────────────────────────────────

async function shutdown() {
  log.info('Shutting down...');
  await browserPool.shutdown();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─── Parse & Run ──────────────────────────────────────────

program.parse();
