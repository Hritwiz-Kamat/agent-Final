/**
 * AgentBridge — Content Cleaner (Injectable Bundle)
 * Injected into pages via page.evaluate().
 * Handles: noise removal, whitespace normalization, deduplication, token estimation.
 *
 * Note: Chinese compression is handled server-side in cleaner.ts.
 * This bundle only runs the in-page DOM cleaning operations.
 */

(function () {
  'use strict';

  if (window.__agentBridge_cleaner) return;

  const Cleaner = {
    /**
     * Remove noise elements from a cloned DOM
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

    normalizeWhitespace(text) {
      if (!text) return '';
      return text
        .replace(/[\t\f\v]+/g, ' ')
        .replace(/ {2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\s+|\s+$/gm, '')
        .trim();
    },

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

    deduplicateText(textBlocks) {
      const seen = new Set();
      return textBlocks.filter(block => {
        const normalized = block.text?.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!normalized || normalized.length < 10) return true;
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    },

    estimateTokens(text) {
      if (!text) return 0;
      return Math.ceil(text.length / 4);
    },

    compressForTokens(text) {
      if (!text) return '';
      return text
        .replace(/\s*\n\s*/g, '\n')
        .replace(/ {2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/…/g, '...')
        .replace(/—/g, '-')
        .replace(/–/g, '-')
        .replace(/\u00A0/g, ' ')
        .replace(/\u200B/g, '')
        .replace(/\u200C/g, '')
        .replace(/\u200D/g, '')
        .replace(/\uFEFF/g, '')
        .trim();
    },

    sanitizeHTML(html) {
      if (!html) return '';
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    }
  };

  window.__agentBridge_cleaner = Cleaner;
})();
