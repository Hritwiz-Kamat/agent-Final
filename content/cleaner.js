/**
 * AgentBridge — Content Cleaner
 * HTML sanitization, whitespace normalization, empty element removal,
 * text deduplication, and token compression.
 */

(function () {
  'use strict';

  if (window.__agentBridge_cleaner) return;

  const Cleaner = {
    /**
     * Remove noise elements from a cloned DOM
     * (scripts, styles, nav, footer, ads, tracking, hidden elements)
     */
    removeNoiseElements(doc) {
      const noiseSelectors = [
        'script', 'style', 'noscript', 'link[rel="stylesheet"]',
        'iframe[src*="ads"]', 'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
        '[class*="ad-"]', '[class*="ads-"]', '[class*="advert"]',
        '[id*="ad-"]', '[id*="ads-"]', '[id*="advert"]',
        '[class*="cookie"]', '[id*="cookie"]',
        '[class*="popup"]', '[id*="popup"]',
        '[class*="modal"]', '[id*="modal"]',
        '[class*="overlay"]', '[id*="overlay"]',
        '[class*="banner"]', '[id*="banner"]',
        '[class*="social-share"]', '[class*="share-buttons"]',
        '[class*="newsletter"]', '[id*="newsletter"]',
        '[class*="sidebar"]', '[id*="sidebar"]',
        '[class*="widget"]', '[id*="widget"]',
        '[class*="related-posts"]', '[class*="recommended"]',
        '[aria-hidden="true"]',
        '[style*="display: none"]', '[style*="display:none"]',
        '[style*="visibility: hidden"]', '[style*="visibility:hidden"]',
        'svg', 'canvas',
        '[class*="tracking"]', '[class*="analytics"]',
        '.comment', '#comments',
      ];

      noiseSelectors.forEach(selector => {
        try {
          const elements = doc.querySelectorAll(selector);
          elements.forEach(el => {
            // Don't remove main content containers
            if (!this.isMainContent(el)) {
              el.remove();
            }
          });
        } catch (e) {
          // Invalid selector, skip
        }
      });

      return doc;
    },

    /**
     * Check if an element is likely main content
     */
    isMainContent(el) {
      const tag = el.tagName?.toLowerCase();
      if (['main', 'article'].includes(tag)) return true;

      const id = (el.id || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();

      const contentIndicators = ['content', 'article', 'post', 'entry', 'main', 'body'];
      return contentIndicators.some(ind =>
        id.includes(ind) || cls.includes(ind) || role === ind || role === 'main'
      );
    },

    /**
     * Normalize whitespace in text
     */
    normalizeWhitespace(text) {
      if (!text) return '';
      return text
        .replace(/[\t\f\v]+/g, ' ')       // Tabs → space
        .replace(/ {2,}/g, ' ')             // Multiple spaces → single
        .replace(/\n{3,}/g, '\n\n')         // Multiple newlines → double
        .replace(/^\s+|\s+$/gm, '')         // Trim each line
        .trim();
    },

    /**
     * Remove empty and meaningless elements
     */
    removeEmptyElements(doc) {
      const emptyTags = ['div', 'span', 'p', 'section', 'article', 'header', 'footer'];

      let removed;
      do {
        removed = false;
        emptyTags.forEach(tag => {
          const elements = doc.querySelectorAll(tag);
          elements.forEach(el => {
            const text = (el.textContent || '').trim();
            const hasContent = text.length > 0 ||
              el.querySelector('img, video, audio, iframe, canvas, table') ||
              el.querySelector('input, textarea, select, button');

            if (!hasContent && el.children.length === 0) {
              el.remove();
              removed = true;
            }
          });
        });
      } while (removed);

      return doc;
    },

    /**
     * Deduplicate repeated text blocks
     */
    deduplicateText(textBlocks) {
      const seen = new Set();
      return textBlocks.filter(block => {
        const normalized = block.text?.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!normalized || normalized.length < 10) return true; // Keep short texts
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    },

    /**
     * Estimate token count (rough: ~4 chars per token for English)
     */
    estimateTokens(text) {
      if (!text) return 0;
      return Math.ceil(text.length / 4);
    },

    /**
     * Compress text for token efficiency
     * Removes redundant whitespace, normalizes punctuation
     */
    compressForTokens(text) {
      if (!text) return '';
      return text
        .replace(/\s*\n\s*/g, '\n')         // Trim around newlines
        .replace(/ {2,}/g, ' ')               // Collapse spaces
        .replace(/\n{3,}/g, '\n\n')           // Max 2 newlines
        .replace(/[\u201C\u201D]/g, '"')        // Smart quotes → regular
        .replace(/[\u2018\u2019]/g, "'")       // Smart apostrophes → regular
        .replace(/…/g, '...')                 // Ellipsis → dots
        .replace(/—/g, '-')                   // Em dash → hyphen
        .replace(/–/g, '-')                   // En dash → hyphen
        .replace(/\u00A0/g, ' ')              // Non-breaking space
        .replace(/\u200B/g, '')               // Zero-width space
        .replace(/\u200C/g, '')               // Zero-width non-joiner
        .replace(/\u200D/g, '')               // Zero-width joiner
        .replace(/\uFEFF/g, '')               // BOM
        .trim();
    },

    /**
     * Clean and sanitize extracted HTML string
     */
    sanitizeHTML(html) {
      if (!html) return '';
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\son\w+="[^"]*"/gi, '')     // Remove inline handlers
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    },

    // ═══════════════════════════════════════════════════════════
    //  Chinese Token Compression Engine
    //  Maps verbose English semantic labels → compact Chinese
    //  equivalents for 40-60% additional token savings.
    //  Chinese chars encode ~2-3x more meaning per token.
    // ═══════════════════════════════════════════════════════════

    /**
     * Semantic label compression map (38 terms)
     * Categories: navigation, forms, buttons, content types,
     * page structure, e-commerce, social, accessibility
     */
    TOKEN_COMPRESS_MAP: {
      // ─── Navigation ──────────────────────────────────
      'navigation':       '导航',
      'navigate':         '导航',
      'nav':              '导航',
      'home':             '首页',
      'back':             '返回',
      'next':             '下一',
      'previous':         '上一',
      'breadcrumb':       '路径',
      'menu':             '菜单',
      'pagination':       '分页',

      // ─── Forms & Inputs ──────────────────────────────
      'submit':           '提交',
      'submit_form':      '提交表单',
      'input':            '输入',
      'form':             '表单',
      'search':           '搜索',
      'filter':           '筛选',
      'select':           '选择',
      'checkbox':         '复选',
      'radio':            '单选',
      'dropdown':         '下拉',
      'placeholder':      '占位',
      'required':         '必填',
      'validation':       '验证',
      'label':            '标签',

      // ─── Buttons & Actions ───────────────────────────
      'click':            '点击',
      'click_button':     '点击按钮',
      'button':           '按钮',
      'close':            '关闭',
      'cancel':           '取消',
      'confirm':          '确认',
      'save':             '保存',
      'delete':           '删除',
      'edit':             '编辑',
      'download':         '下载',
      'upload':           '上传',
      'copy':             '复制',
      'reset':            '重置',
      'toggle':           '切换',
      'expand':           '展开',
      'collapse':         '折叠',

      // ─── Content Types ───────────────────────────────
      'title':            '标题',
      'page_title':       '页标题',
      'description':      '描述',
      'heading':          '标题',
      'paragraph':        '段落',
      'content':          '内容',
      'article':          '文章',
      'summary':          '摘要',
      'text':             '文本',
      'image':            '图片',
      'video':            '视频',
      'audio':            '音频',
      'link':             '链接',
      'table':            '表格',
      'list':             '列表',
      'code':             '代码',

      // ─── Page Structure ──────────────────────────────
      'header':           '页头',
      'footer':           '页脚',
      'sidebar':          '侧栏',
      'main':             '主体',
      'section':          '区块',
      'container':        '容器',
      'wrapper':          '包裹',
      'modal':            '弹窗',
      'popup':            '弹出',
      'overlay':          '遮罩',
      'tab':              '标签页',
      'panel':            '面板',
      'card':             '卡片',
      'widget':           '组件',
      'banner':           '横幅',
      'icon':             '图标',

      // ─── E-Commerce ──────────────────────────────────
      'add_to_cart':      '加购',
      'buy_now':          '立购',
      'checkout':         '结算',
      'cart':             '购物车',
      'price':            '价格',
      'quantity':         '数量',
      'product':          '商品',
      'category':         '分类',
      'review':           '评价',
      'rating':           '评分',
      'wishlist':         '收藏',
      'order':            '订单',
      'shipping':         '配送',
      'payment':          '支付',
      'coupon':           '优惠券',
      'discount':         '折扣',

      // ─── Social & User Actions ───────────────────────
      'login':            '登录',
      'logout':           '登出',
      'signup':           '注册',
      'sign_up':          '注册',
      'sign_in':          '登录',
      'profile':          '个人',
      'settings':         '设置',
      'share':            '分享',
      'like':             '赞',
      'comment':          '评论',
      'follow':           '关注',
      'subscribe':        '订阅',
      'notification':     '通知',
      'message':          '消息',
      'reply':            '回复',
      'post':             '发布',

      // ─── MCP / AgentBridge Labels ────────────────────
      'resources':        '资源',
      'tools':            '工具',
      'input_schema':     '输入模式',
      'inputSchema':      '输入模式',
      'properties':       '属性',
      'element':          '元素',
      'selector':         '选择器',
      'type':             '类型',
      'name':             '名称',
      'value':            '值',
      'metadata':         '元数据',
      'structured':       '结构化',
      'extraction':       '提取',
      'interactive':      '可交互',
      'disabled':         '禁用',
      'external':         '外部',

      // ─── Data / Misc ────────────────────────────────
      'loading':          '加载',
      'error':            '错误',
      'success':          '成功',
      'warning':          '警告',
      'empty':            '空',
      'none':             '无',
      'true':             '是',
      'false':            '否',
      'null':             '空值',
      'undefined':        '未定义',
    },

    /**
     * Patterns that should NEVER be compressed.
     * Matches: URLs, emails, file paths, CSS selectors,
     * numbers, hex colors, IDs, code snippets.
     */
    _PRESERVE_PATTERNS: [
      /^https?:\/\//i,                   // URLs
      /^\/\//,                           // Protocol-relative URLs
      /^page:\/\//,                      // MCP resource URIs
      /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, // Emails
      /^\$?\d[\d,.]*%?$/,               // Numbers, prices, percentages
      /^#[0-9a-f]{3,8}$/i,             // Hex colors
      /^[a-f0-9-]{36}$/i,              // UUIDs
      /^rgb[a]?\(/i,                    // RGB colors
      /^[.#\[].*[>\s:]/,               // CSS selectors
      /^data:/,                          // Data URIs
      /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)+$/, // Proper nouns (Title Case multi-word)
      /[{}();=<>]/,                      // Code snippets
      /^\//,                             // File/URL paths
    ],

    /**
     * Check if a value should be preserved (not compressed)
     * @param {string} val — the string value to check
     * @returns {boolean} true if value must NOT be compressed
     */
    _shouldPreserve(val) {
      if (typeof val !== 'string') return true;
      if (val.length > 200) return true;   // Long content — not a label
      if (val.length < 2) return true;      // Too short to compress

      return this._PRESERVE_PATTERNS.some(rx => rx.test(val));
    },

    /**
     * Apply Chinese compression to a JSON object (deep walk).
     * Compresses: JSON keys, short semantic string values.
     * Preserves: URLs, emails, numbers, IDs, code, proper nouns.
     *
     * @param {*} obj — input value (object, array, or primitive)
     * @returns {{ result: *, replacements: number }} — compressed output + count
     */
    applyChineseCompression(obj) {
      let replacements = 0;
      const map = this.TOKEN_COMPRESS_MAP;

      const walk = (node) => {
        // Null / undefined
        if (node == null) return node;

        // Arrays — walk each element
        if (Array.isArray(node)) {
          return node.map(item => walk(item));
        }

        // Primitives (strings)
        if (typeof node === 'string') {
          // Only compress short semantic labels, not actual content
          const lower = node.toLowerCase().trim();
          if (map[lower] && !this._shouldPreserve(node)) {
            replacements++;
            return map[lower];
          }
          return node;
        }

        // Numbers, booleans — pass through
        if (typeof node !== 'object') return node;

        // Objects — walk keys and values
        const result = {};
        for (const key of Object.keys(node)) {
          // Compress the key if it matches
          const lowerKey = key.toLowerCase();
          let newKey = key;
          if (map[lowerKey]) {
            newKey = map[lowerKey];
            replacements++;
          }

          // Recursively walk the value
          result[newKey] = walk(node[key]);
        }
        return result;
      };

      const result = walk(obj);
      return { result, replacements };
    }
  };

  window.__agentBridge_cleaner = Cleaner;
})();
