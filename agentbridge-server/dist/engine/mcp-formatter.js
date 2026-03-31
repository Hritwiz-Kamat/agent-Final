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
// ─── Formatter ────────────────────────────────────────────
/**
 * Format extraction data and tools into MCP-compatible JSON
 */
export function formatMCP(extractionResult, tools, pageUrl) {
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
        extractionStats: extractionResult.stats || {},
    };
}
/**
 * Format page content as MCP resources
 */
function formatResources(extractionResult, pageUrl) {
    const resources = [];
    let parsedUrl;
    try {
        parsedUrl = new URL(pageUrl);
    }
    catch {
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
function formatTools(tools, pageUrl) {
    if (!tools || tools.length === 0)
        return [];
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
export function formatRaw(extractionResult, tools) {
    return {
        url: extractionResult.metadata?.url,
        title: extractionResult.metadata?.title,
        description: extractionResult.metadata?.description,
        content: extractionResult.content?.structured || {},
        article: extractionResult.content?.article || null,
        text: extractionResult.content?.text || '',
        actions: (tools || []).map(t => ({
            name: t.name,
            description: t.description,
            selector: t.element?.selector,
            type: t.element?.type,
        })),
        stats: extractionResult.stats || {},
    };
}
/**
 * Generate a "text-only" format (for direct LLM consumption)
 */
export function formatTextOnly(extractionResult) {
    const parts = [];
    const meta = extractionResult.metadata || {};
    const content = extractionResult.content?.structured || {};
    if (meta.title)
        parts.push(`# ${meta.title}\n`);
    if (meta.url)
        parts.push(`URL: ${meta.url}\n`);
    if (meta.description)
        parts.push(`${meta.description}\n`);
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
//# sourceMappingURL=mcp-formatter.js.map