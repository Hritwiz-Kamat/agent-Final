/**
 * AgentBridge — Popup Controller
 * Handles UI interactions, extraction triggering,
 * output display, clipboard, downloads, and
 * Chinese token compression toggle.
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────
  let currentData = null;
  let currentFormat = 'mcp';
  let chineseCompressionEnabled = false;

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
    statSavingsLabel: document.getElementById('stat-savings-label'),
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
    // Chinese compression elements
    compressionToggle: document.getElementById('compression-toggle'),
    chineseToggle: document.getElementById('chinese-toggle'),
    savingsBreakdown: document.getElementById('savings-breakdown'),
    breakdownBase: document.getElementById('breakdown-base'),
    breakdownChinese: document.getElementById('breakdown-chinese'),
    breakdownTotal: document.getElementById('breakdown-total'),
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

    // Load persisted Chinese compression preference
    try {
      chrome.storage.local.get(['chineseCompression'], (data) => {
        if (data?.chineseCompression) {
          chineseCompressionEnabled = true;
          elements.chineseToggle.checked = true;
        }
      });
    } catch (e) { /* ignore — not in extension context */ }

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

    // Chinese compression toggle
    elements.chineseToggle.addEventListener('change', handleCompressionToggle);
  }

  // ─── Compression Toggle Handler ────────────────────────────
  function handleCompressionToggle() {
    chineseCompressionEnabled = elements.chineseToggle.checked;

    // Persist toggle state
    try {
      chrome.storage.local.set({ chineseCompression: chineseCompressionEnabled });
    } catch (e) { /* ignore */ }

    // Re-render output and update stats in real time
    if (currentData) {
      updateStats();
      renderOutput();
    }

    // Show toast feedback
    if (chineseCompressionEnabled) {
      showToast('🀄 Chinese compression ON', 'success');
    } else {
      showToast('Chinese compression OFF', 'success');
    }
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
    updateStats();
    elements.statsBar.classList.remove('hidden');

    // Show format tabs and compression toggle
    elements.formatTabs.classList.remove('hidden');
    elements.compressionToggle.classList.remove('hidden');

    // Show output
    elements.outputContainer.classList.remove('hidden');
    renderOutput();

    // Show action buttons
    elements.actions.classList.remove('hidden');
  }

  // ─── Update Stats Display ─────────────────────────────────
  function updateStats() {
    if (!currentData) return;

    const stats = currentData.stats || {};
    const baseSavings = stats.tokenSavings || 0;

    elements.statTools.textContent = currentData.toolCount || 0;
    elements.statTime.textContent = `${stats.extractionTimeMs || 0}ms`;

    if (chineseCompressionEnabled) {
      // Calculate additional Chinese compression savings
      const outputContent = getOutputForCurrentFormat();
      const beforeJSON = JSON.stringify(outputContent);
      const compressed = applyCompression(outputContent);
      const afterJSON = JSON.stringify(compressed);

      const beforeTokens = Math.ceil(beforeJSON.length / 4);
      const afterTokens = Math.ceil(afterJSON.length / 4);
      const chineseSavingsPercent = beforeTokens > 0
        ? Math.round((1 - afterTokens / beforeTokens) * 100)
        : 0;

      // Total savings from raw HTML → compressed Chinese output
      const rawTokens = stats.rawTokenEstimate || 1;
      const totalSavings = rawTokens > 0
        ? Math.round((1 - afterTokens / rawTokens) * 100)
        : baseSavings;

      elements.statTokens.textContent = formatNumber(afterTokens);
      elements.statSavings.textContent = `${totalSavings}%`;
      elements.statSavingsLabel.textContent = 'Total';

      // Show breakdown
      elements.breakdownBase.textContent = `${baseSavings}%`;
      elements.breakdownChinese.textContent = `+${chineseSavingsPercent}%`;
      elements.breakdownTotal.textContent = `${totalSavings}%`;
      elements.savingsBreakdown.classList.remove('hidden');
    } else {
      // Standard stats without Chinese compression
      elements.statTokens.textContent = formatNumber(stats.compressedTokenEstimate || 0);
      elements.statSavings.textContent = `${baseSavings}%`;
      elements.statSavingsLabel.textContent = 'Saved';
      elements.savingsBreakdown.classList.add('hidden');
    }
  }

  // ─── Get Output for Current Format ─────────────────────────
  function getOutputForCurrentFormat() {
    if (!currentData) return {};
    switch (currentFormat) {
      case 'mcp':  return currentData.mcp || {};
      case 'raw':  return currentData.raw || {};
      case 'text': return currentData.text || '';
      default:     return currentData.mcp || {};
    }
  }

  // ─── Apply Chinese Compression ─────────────────────────────
  function applyCompression(content) {
    if (!chineseCompressionEnabled) return content;

    // Text format: compress semantic labels in plain text
    if (typeof content === 'string') {
      return applyTextCompression(content);
    }

    // JSON formats: use the cleaner's deep-walk compression
    // The cleaner module is loaded in the content script context,
    // so we use our own inline copy of the map + walker in popup
    return deepCompress(content);
  }

  /**
   * Inline Chinese compression for popup context.
   * The cleaner module runs in content script context, not popup,
   * so we need a self-contained version here.
   */

  // Compression map (same as cleaner.js TOKEN_COMPRESS_MAP)
  const COMPRESS_MAP = {
    'navigation':'导航','navigate':'导航','nav':'导航','home':'首页',
    'back':'返回','next':'下一','previous':'上一','breadcrumb':'路径',
    'menu':'菜单','pagination':'分页','submit':'提交','submit_form':'提交表单',
    'input':'输入','form':'表单','search':'搜索','filter':'筛选',
    'select':'选择','checkbox':'复选','radio':'单选','dropdown':'下拉',
    'placeholder':'占位','required':'必填','validation':'验证','label':'标签',
    'click':'点击','click_button':'点击按钮','button':'按钮','close':'关闭',
    'cancel':'取消','confirm':'确认','save':'保存','delete':'删除',
    'edit':'编辑','download':'下载','upload':'上传','copy':'复制',
    'reset':'重置','toggle':'切换','expand':'展开','collapse':'折叠',
    'title':'标题','page_title':'页标题','description':'描述','heading':'标题',
    'paragraph':'段落','content':'内容','article':'文章','summary':'摘要',
    'text':'文本','image':'图片','video':'视频','audio':'音频',
    'link':'链接','table':'表格','list':'列表','code':'代码',
    'header':'页头','footer':'页脚','sidebar':'侧栏','main':'主体',
    'section':'区块','container':'容器','wrapper':'包裹','modal':'弹窗',
    'popup':'弹出','overlay':'遮罩','tab':'标签页','panel':'面板',
    'card':'卡片','widget':'组件','banner':'横幅','icon':'图标',
    'add_to_cart':'加购','buy_now':'立购','checkout':'结算','cart':'购物车',
    'price':'价格','quantity':'数量','product':'商品','category':'分类',
    'review':'评价','rating':'评分','wishlist':'收藏','order':'订单',
    'shipping':'配送','payment':'支付','coupon':'优惠券','discount':'折扣',
    'login':'登录','logout':'登出','signup':'注册','sign_up':'注册',
    'sign_in':'登录','profile':'个人','settings':'设置','share':'分享',
    'like':'赞','comment':'评论','follow':'关注','subscribe':'订阅',
    'notification':'通知','message':'消息','reply':'回复','post':'发布',
    'resources':'资源','tools':'工具','input_schema':'输入模式',
    'inputSchema':'输入模式','properties':'属性','element':'元素',
    'selector':'选择器','type':'类型','name':'名称','value':'值',
    'metadata':'元数据','structured':'结构化','extraction':'提取',
    'interactive':'可交互','disabled':'禁用','external':'外部',
    'loading':'加载','error':'错误','success':'成功','warning':'警告',
    'empty':'空','none':'无','true':'是','false':'否',
    'null':'空值','undefined':'未定义',
  };

  // Patterns to preserve (never compress)
  const PRESERVE_RX = [
    /^https?:\/\//i, /^\/\//, /^page:\/\//,
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
    /^\$?\d[\d,.]*%?$/, /^#[0-9a-f]{3,8}$/i,
    /^[a-f0-9-]{36}$/i, /^rgb[a]?\(/i,
    /^[.#\[].*[>\s:]/, /^data:/,
    /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)+$/,
    /[{}();=<>]/, /^\//,
  ];

  function shouldPreserve(val) {
    if (typeof val !== 'string') return true;
    if (val.length > 200 || val.length < 2) return true;
    return PRESERVE_RX.some(rx => rx.test(val));
  }

  function deepCompress(node) {
    if (node == null) return node;
    if (Array.isArray(node)) return node.map(deepCompress);
    if (typeof node === 'string') {
      const lower = node.toLowerCase().trim();
      if (COMPRESS_MAP[lower] && !shouldPreserve(node)) return COMPRESS_MAP[lower];
      return node;
    }
    if (typeof node !== 'object') return node;

    const result = {};
    for (const key of Object.keys(node)) {
      const lowerKey = key.toLowerCase();
      const newKey = COMPRESS_MAP[lowerKey] || key;
      result[newKey] = deepCompress(node[key]);
    }
    return result;
  }

  function applyTextCompression(text) {
    if (!text) return text;
    // Replace standalone semantic words in text output
    let result = text;
    for (const [eng, chn] of Object.entries(COMPRESS_MAP)) {
      // Only replace full words, not substrings
      const rx = new RegExp(`\\b${eng.replace(/_/g, '[_ ]')}\\b`, 'gi');
      result = result.replace(rx, chn);
    }
    return result;
  }

  // ─── Render Output ────────────────────────────────────────
  function renderOutput() {
    if (!currentData) return;

    let content = getOutputForCurrentFormat();
    let isJSON = currentFormat !== 'text';

    // Apply Chinese compression if enabled
    content = applyCompression(content);

    if (isJSON) {
      const jsonString = JSON.stringify(content, null, 2);
      elements.outputContent.innerHTML = syntaxHighlightJSON(jsonString);
    } else {
      elements.outputContent.textContent = content;
    }

    // Update stats to reflect current compression state
    updateStats();

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

    let content = getOutputForCurrentFormat();
    content = applyCompression(content);

    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else {
      text = JSON.stringify(content, null, 2);
    }

    try {
      await navigator.clipboard.writeText(text);
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

    let content = getOutputForCurrentFormat();
    content = applyCompression(content);

    const isText = currentFormat === 'text';
    const suffix = chineseCompressionEnabled ? '-zh' : '';
    const text = isText ? content : JSON.stringify(content, null, 2);
    const ext = isText ? 'txt' : 'json';
    const mimeType = isText ? 'text/plain' : 'application/json';
    const filename = `agentbridge-${currentFormat}${suffix}-${Date.now()}.${ext}`;

    const blob = new Blob([text], { type: mimeType });
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
    elements.savingsBreakdown.classList.add('hidden');
    elements.formatTabs.classList.add('hidden');
    elements.compressionToggle.classList.add('hidden');
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
    elements.savingsBreakdown.classList.add('hidden');
    elements.formatTabs.classList.add('hidden');
    elements.compressionToggle.classList.add('hidden');
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
