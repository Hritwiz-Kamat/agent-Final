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
import { extractPage, listActions } from './engine/orchestrator.js';
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
    .action(async (url, opts) => {
    try {
        const result = await extractPage(url, {
            format: opts.format,
            chineseCompression: opts.compress || false,
            waitUntil: opts.wait,
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
    }
    catch (err) {
        log.error({ err, url }, 'Extraction failed');
        process.exit(1);
    }
    finally {
        await browserPool.shutdown();
    }
});
// ─── CLI: List actions ────────────────────────────────────
program
    .command('actions <url>')
    .description('List interactive elements from a URL')
    .action(async (url) => {
    try {
        const tools = await listActions(url);
        process.stdout.write(JSON.stringify(tools, null, 2) + '\n');
    }
    catch (err) {
        log.error({ err, url }, 'Action listing failed');
        process.exit(1);
    }
    finally {
        await browserPool.shutdown();
    }
});
// ─── MCP Server ───────────────────────────────────────────
program
    .command('mcp')
    .description('Start MCP server (stdio transport for Claude/Cursor)')
    .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js');
    await startMcpServer();
});
// ─── REST API Server ──────────────────────────────────────
program
    .command('serve')
    .description('Start REST API server')
    .option('-p, --port <port>', 'API port', String(config.apiPort))
    .option('--mcp', 'Also start MCP server (stdio)')
    .action(async (opts) => {
    const port = parseInt(opts.port, 10);
    // Start REST API
    const { startApiServer } = await import('./api/server.js');
    await startApiServer(port);
    // Optionally also start MCP server (stdio)
    if (opts.mcp) {
        const { startMcpServer } = await import('./mcp/server.js');
        await startMcpServer();
    }
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
//# sourceMappingURL=index.js.map