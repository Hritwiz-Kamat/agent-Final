/**
 * AgentBridge — Background Service Worker
 * Message relay between popup and content scripts.
 * State persistence via chrome.storage.local.
 * Extension lifecycle management.
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extract') {
    handleExtraction(message.tabId, message.options)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (message.action === 'getLastResult') {
    chrome.storage.local.get(['lastResult'], (data) => {
      sendResponse({ success: true, data: data.lastResult || null });
    });
    return true;
  }

  if (message.action === 'clearResult') {
    chrome.storage.local.remove(['lastResult'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Handles the extraction pipeline:
 * 1. Inject content scripts into the active tab
 * 2. Execute extraction
 * 3. Persist result
 */
async function handleExtraction(tabId, options = {}) {
  try {
    // Inject all content scripts in order
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'lib/readability.js',
        'content/cleaner.js',
        'content/extractor.js',
        'content/action-mapper.js',
        'lib/mcp-formatter.js',
        'content/index.js'
      ]
    });

    // Execute the extraction
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (opts) => {
        // This runs in the page context — calls the injected orchestrator
        if (typeof window.__agentBridge_extract === 'function') {
          return window.__agentBridge_extract(opts);
        }
        throw new Error('AgentBridge extraction scripts not loaded');
      },
      args: [options]
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Extraction returned empty result');
    }

    // Persist the result
    await chrome.storage.local.set({ lastResult: result });

    return result;
  } catch (error) {
    console.error('[AgentBridge] Extraction failed:', error);
    throw error;
  }
}

// Extension install/update handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AgentBridge] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[AgentBridge] Extension updated to', chrome.runtime.getManifest().version);
  }
});
