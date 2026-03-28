/**
 * AgentBridge — MCP Formatter
 * Formats extraction output as MCP-compatible JSON:
 * - Resources (page content)
 * - Tools (mapped actions)
 * - Metadata enrichment
 */

(function () {
  'use strict';

  if (window.__agentBridge_mcpFormatter) return;

  const MCPFormatter = {
    /**
     * Format extraction data and tools into MCP-compatible JSON
     */
    format(extractionResult, tools, options = {}) {
      const pageUrl = extractionResult.metadata?.url || window.location.href;
      const timestamp = new Date().toISOString();

      return {
        // MCP Protocol metadata
        _meta: {
          protocol: 'mcp',
          version: '1.0',
          generator: 'AgentBridge',
          generatorVersion: '1.0.0',
          timestamp,
          source: pageUrl
        },

        // MCP Resources — page content
        resources: this.formatResources(extractionResult, pageUrl),

        // MCP Tools — mapped interactive elements
        tools: this.formatTools(tools, pageUrl),

        // Extension metadata (non-MCP, for display)
        extractionStats: extractionResult.stats || {}
      };
    },

    /**
     * Format page content as MCP resources
     */
    formatResources(extractionResult, pageUrl) {
      const resources = [];

      // Main structured content resource
      resources.push({
        uri: `page://${new URL(pageUrl).hostname}${new URL(pageUrl).pathname}`,
        name: extractionResult.metadata?.title || 'Page Content',
        description: extractionResult.metadata?.description || `Extracted content from ${pageUrl}`,
        mimeType: 'application/json',
        content: {
          metadata: extractionResult.metadata,
          structured: extractionResult.content?.structured || {},
        }
      });

      // Article content resource (if available from Readability.js)
      if (extractionResult.content?.article) {
        resources.push({
          uri: `page://${new URL(pageUrl).hostname}${new URL(pageUrl).pathname}/article`,
          name: extractionResult.content.article.title || 'Article Content',
          description: 'Clean article text extracted via Readability.js',
          mimeType: 'text/plain',
          content: extractionResult.content.article
        });
      }

      // Text-only resource
      if (extractionResult.content?.text) {
        resources.push({
          uri: `page://${new URL(pageUrl).hostname}${new URL(pageUrl).pathname}/text`,
          name: 'Plain Text Content',
          description: 'Raw text content with noise removed',
          mimeType: 'text/plain',
          content: extractionResult.content.text.substring(0, 100000) // Cap at 100K chars
        });
      }

      return resources;
    },

    /**
     * Format tools in MCP tool schema
     */
    formatTools(tools, pageUrl) {
      if (!tools || tools.length === 0) return [];

      return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: tool.input_schema?.type || 'object',
          properties: tool.input_schema?.properties || {},
          required: tool.input_schema?.required || []
        },
        // Extension-specific metadata
        _agentbridge: {
          elementSelector: tool.element?.selector,
          elementType: tool.element?.type,
          elementText: tool.element?.text,
          pageUrl
        }
      }));
    },

    /**
     * Generate a "raw JSON" format (simplified, no MCP wrapping)
     */
    formatRaw(extractionResult, tools) {
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
          type: t.element?.type
        })),
        stats: extractionResult.stats || {}
      };
    },

    /**
     * Generate a "text-only" format (for direct LLM consumption)
     */
    formatTextOnly(extractionResult) {
      const parts = [];
      const meta = extractionResult.metadata || {};
      const content = extractionResult.content?.structured || {};

      // Title
      if (meta.title) parts.push(`# ${meta.title}\n`);

      // URL
      if (meta.url) parts.push(`URL: ${meta.url}\n`);

      // Description
      if (meta.description) parts.push(`${meta.description}\n`);

      // Headings and paragraphs combined
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

      // Lists
      if (content.lists) {
        content.lists.forEach(list => {
          list.items.forEach((item, i) => {
            const prefix = list.type === 'ordered' ? `${i + 1}.` : '-';
            parts.push(`${prefix} ${item}`);
          });
          parts.push('');
        });
      }

      // Code blocks
      if (content.codeBlocks) {
        content.codeBlocks.forEach(block => {
          parts.push(`\`\`\`${block.language || ''}\n${block.code}\n\`\`\``);
        });
      }

      // Tables
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
  };

  window.__agentBridge_mcpFormatter = MCPFormatter;
})();
