/**
 * AgentBridge — Popup Controller
 * Handles UI interactions, extraction triggering,
 * output display, clipboard, and downloads.
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────
  let currentData = null;
  let currentFormat = 'mcp';

  // ─── DOM References ────────────────────────────────────────
  const elements = {
    btnExtract: document.getElementById('btn-extract'),
    btnCopy: document.getElementById('btn-copy'),
    btnDownload: document.getElementById('btn-download'),
    btnClear: document.getElementById('btn-clear'),
    btnRetry: document.getElementById('btn-retry'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    pageInfo: document.getElementById('page-info'),
    statsBar: document.getElementById('stats-bar'),
    statTokens: document.getElementById('stat-tokens-value'),
    statSavings: document.getElementById('stat-savings-value'),
    statTools: document.getElementById('stat-tools-value'),
    statTime: document.getElementById('stat-time-value'),
    formatTabs: document.getElementById('format-tabs'),
    outputContainer: document.getElementById('output-container'),
    outputContent: document.getElementById('output-content'),
    actions: document.getElementById('actions'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    extractSection: document.getElementById('extract-section'),
  };

  // ─── Initialization ───────────────────────────────────────
  async function init() {
    // Show current page info
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        const url = new URL(tab.url);
        elements.pageInfo.textContent = url.hostname + url.pathname.substring(0, 30);
        elements.pageInfo.title = tab.url;
      }
    } catch (e) { /* ignore */ }

    // Check for cached result
    chrome.runtime.sendMessage({ action: 'getLastResult' }, (response) => {
      if (response?.success && response.data) {
        currentData = response.data;
        showResults();
      }
    });

    // Bind events
    elements.btnExtract.addEventListener('click', handleExtract);
    elements.btnCopy.addEventListener('click', handleCopy);
    elements.btnDownload.addEventListener('click', handleDownload);
    elements.btnClear.addEventListener('click', handleClear);
    elements.btnRetry.addEventListener('click', handleExtract);

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFormat = tab.dataset.format;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderOutput();
      });
    });
  }

  // ─── Extract Handler ──────────────────────────────────────
  async function handleExtract() {
    setStatus('extracting', 'Extracting...');
    showLoading('Injecting extraction scripts...');
    elements.btnExtract.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab found');

      // Check if we can inject into this tab
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('about:') || tab.url.startsWith('edge://')) {
        throw new Error('Cannot extract from browser internal pages');
      }

      updateLoadingText('Analyzing page structure...');

      // Send extraction message to background
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'extract', tabId: tab.id, options: {} },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Extraction failed');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      currentData = response.data;
      hideLoading();
      showResults();
      setStatus('ready', 'Extraction complete');

    } catch (error) {
      hideLoading();
      showError(error.message);
      setStatus('error', 'Error');
      console.error('[AgentBridge Popup]', error);
    } finally {
      elements.btnExtract.disabled = false;
    }
  }

  // ─── Display Results ──────────────────────────────────────
  function showResults() {
    if (!currentData) return;

    // Hide extract section, show results UI
    elements.extractSection.classList.add('hidden');
    elements.errorContainer.classList.add('hidden');

    // Show stats
    const stats = currentData.stats || {};
    elements.statTokens.textContent = formatNumber(stats.compressedTokenEstimate || 0);
    elements.statSavings.textContent = `${stats.tokenSavings || 0}%`;
    elements.statTools.textContent = currentData.toolCount || 0;
    elements.statTime.textContent = `${stats.extractionTimeMs || 0}ms`;
    elements.statsBar.classList.remove('hidden');

    // Show format tabs
    elements.formatTabs.classList.remove('hidden');

    // Show output
    elements.outputContainer.classList.remove('hidden');
    renderOutput();

    // Show action buttons
    elements.actions.classList.remove('hidden');
  }

  // ─── Render Output ────────────────────────────────────────
  function renderOutput() {
    if (!currentData) return;

    let content = '';
    let isJSON = true;

    switch (currentFormat) {
      case 'mcp':
        content = currentData.mcp || {};
        break;
      case 'raw':
        content = currentData.raw || {};
        break;
      case 'text':
        content = currentData.text || '';
        isJSON = false;
        break;
    }

    if (isJSON) {
      const jsonString = JSON.stringify(content, null, 2);
      elements.outputContent.innerHTML = syntaxHighlightJSON(jsonString);
    } else {
      elements.outputContent.textContent = content;
    }

    // Scroll to top
    elements.outputContent.closest('.output-scroll').scrollTop = 0;
  }

  // ─── JSON Syntax Highlighting ─────────────────────────────
  function syntaxHighlightJSON(json) {
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${escapeHTML(match)}</span>`;
      }
    );
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Copy Handler ─────────────────────────────────────────
  async function handleCopy() {
    if (!currentData) return;

    let content = '';
    switch (currentFormat) {
      case 'mcp':
        content = JSON.stringify(currentData.mcp, null, 2);
        break;
      case 'raw':
        content = JSON.stringify(currentData.raw, null, 2);
        break;
      case 'text':
        content = currentData.text || '';
        break;
    }

    try {
      await navigator.clipboard.writeText(content);
      elements.btnCopy.classList.add('copied');
      const originalText = elements.btnCopy.querySelector('span').textContent;
      elements.btnCopy.querySelector('span').textContent = 'Copied!';
      showToast('Copied to clipboard!', 'success');

      setTimeout(() => {
        elements.btnCopy.classList.remove('copied');
        elements.btnCopy.querySelector('span').textContent = originalText;
      }, 2000);
    } catch (e) {
      showToast('Failed to copy', 'error');
    }
  }

  // ─── Download Handler ─────────────────────────────────────
  function handleDownload() {
    if (!currentData) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (currentFormat) {
      case 'mcp':
        content = JSON.stringify(currentData.mcp, null, 2);
        filename = `agentbridge-mcp-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      case 'raw':
        content = JSON.stringify(currentData.raw, null, 2);
        filename = `agentbridge-raw-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      case 'text':
        content = currentData.text || '';
        filename = `agentbridge-text-${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('File downloaded!', 'success');
  }

  // ─── Clear Handler ────────────────────────────────────────
  function handleClear() {
    currentData = null;
    currentFormat = 'mcp';

    // Reset UI
    elements.statsBar.classList.add('hidden');
    elements.formatTabs.classList.add('hidden');
    elements.outputContainer.classList.add('hidden');
    elements.actions.classList.add('hidden');
    elements.errorContainer.classList.add('hidden');
    elements.extractSection.classList.remove('hidden');
    elements.outputContent.textContent = '';

    // Reset tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-mcp').classList.add('active');

    setStatus('idle', 'Ready');

    // Clear stored result
    chrome.runtime.sendMessage({ action: 'clearResult' });
  }

  // ─── Status Management ────────────────────────────────────
  function setStatus(state, text) {
    elements.statusIndicator.className = `status-indicator ${state}`;
    elements.statusText.textContent = text;
  }

  // ─── Loading Overlay ──────────────────────────────────────
  function showLoading(text) {
    elements.loadingText.textContent = text || 'Extracting page content...';
    elements.loadingOverlay.classList.remove('hidden');
  }

  function updateLoadingText(text) {
    elements.loadingText.textContent = text;
  }

  function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
  }

  // ─── Error Display ────────────────────────────────────────
  function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorContainer.classList.remove('hidden');
    elements.extractSection.classList.add('hidden');
    elements.statsBar.classList.add('hidden');
    elements.formatTabs.classList.add('hidden');
    elements.outputContainer.classList.add('hidden');
    elements.actions.classList.add('hidden');
  }

  // ─── Toast Notification ───────────────────────────────────
  function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ─── Utilities ────────────────────────────────────────────
  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  // ─── Initialize ───────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
