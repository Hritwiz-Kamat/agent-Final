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
    }
  };

  window.__agentBridge_cleaner = Cleaner;
})();
