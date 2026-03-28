/**
 * AgentBridge — Content Script Orchestrator
 * Main entry point injected into pages.
 * Orchestrates: extractor → action-mapper → cleaner → MCP formatter
 * Sends final result back to popup via messaging.
 */

(function () {
  'use strict';

  /**
   * Main extraction function called by the service worker
   */
  window.__agentBridge_extract = function (options = {}) {
    try {
      const extractor = window.__agentBridge_extractor;
      const actionMapper = window.__agentBridge_actionMapper;
      const mcpFormatter = window.__agentBridge_mcpFormatter;

      if (!extractor || !actionMapper || !mcpFormatter) {
        throw new Error('AgentBridge modules not loaded');
      }

      // Step 1: Extract content
      const extractionResult = extractor.extract(options);

      // Step 2: Map interactive elements to tools
      const tools = actionMapper.mapActions();

      // Step 3: Format outputs
      const mcpOutput = mcpFormatter.format(extractionResult, tools, options);
      const rawOutput = mcpFormatter.formatRaw(extractionResult, tools);
      const textOutput = mcpFormatter.formatTextOnly(extractionResult);

      return {
        mcp: mcpOutput,
        raw: rawOutput,
        text: textOutput,
        stats: extractionResult.stats,
        toolCount: tools.length
      };
    } catch (error) {
      console.error('[AgentBridge] Extraction error:', error);
      return {
        error: error.message,
        stack: error.stack
      };
    }
  };
})();
