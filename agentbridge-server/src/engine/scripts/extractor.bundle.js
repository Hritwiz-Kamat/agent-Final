/**
 * AgentBridge — Content Extractor (Headless-Compatible Bundle)
 * Injected into pages via page.evaluate().
 *
 * Key differences from the Chrome Extension version:
 * - isVisible() uses tag/attribute heuristic instead of getComputedStyle + offsetWidth
 * - No window.__agentBridge_extractor global — returns result directly
 * - Cleaner is injected separately and available on window.__agentBridge_cleaner
 */

(function () {
  'use strict';

  const Extractor = {
    /**
     * Main extraction entry point
     */
    extract(options = {}) {
      const startTime = performance.now();
      const cleaner = window.__agentBridge_cleaner;

      const metadata = this.extractMetadata();

      const rawHTML = document.documentElement.outerHTML;
      const rawTokens = cleaner.estimateTokens(rawHTML);

      // Readability is handled server-side via JSDOM, so skip here
      const articleContent = null;

      const structuredContent = this.extractStructuredContent();
      const textContent = this.extractTextContent();

      const endTime = performance.now();
      const extractedJSON = JSON.stringify(structuredContent);
      const compressedTokens = cleaner.estimateTokens(extractedJSON);

      return {
        metadata,
        content: {
          structured: structuredContent,
          article: articleContent,
          text: cleaner.compressForTokens(textContent)
        },
        rawHtml: rawHTML,  // Pass raw HTML back for server-side Readability
        stats: {
          extractionTimeMs: Math.round(endTime - startTime),
          rawHtmlBytes: rawHTML.length,
          rawTokenEstimate: rawTokens,
          compressedTokenEstimate: compressedTokens,
          tokenSavings: rawTokens > 0 ? Math.round((1 - compressedTokens / rawTokens) * 100) : 0,
          elementsCounted: {
            headings: structuredContent.headings?.length || 0,
            paragraphs: structuredContent.paragraphs?.length || 0,
            links: structuredContent.links?.length || 0,
            images: structuredContent.images?.length || 0,
            tables: structuredContent.tables?.length || 0,
            lists: structuredContent.lists?.length || 0,
            codeBlocks: structuredContent.codeBlocks?.length || 0,
          }
        }
      };
    },

    /**
     * Extract page metadata
     */
    extractMetadata() {
      const meta = {};

      meta.title = document.title || '';
      meta.url = window.location.href;
      meta.domain = window.location.hostname;
      meta.timestamp = new Date().toISOString();

      const descTag = document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
      meta.description = descTag?.getAttribute('content') || '';

      const ogTags = {};
      document.querySelectorAll('meta[property^="og:"]').forEach(el => {
        const prop = el.getAttribute('property').replace('og:', '');
        ogTags[prop] = el.getAttribute('content') || '';
      });
      if (Object.keys(ogTags).length > 0) meta.openGraph = ogTags;

      const twitterTags = {};
      document.querySelectorAll('meta[name^="twitter:"]').forEach(el => {
        const name = el.getAttribute('name').replace('twitter:', '');
        twitterTags[name] = el.getAttribute('content') || '';
      });
      if (Object.keys(twitterTags).length > 0) meta.twitterCard = twitterTags;

      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      const jsonLd = [];
      jsonLdScripts.forEach(script => {
        try {
          jsonLd.push(JSON.parse(script.textContent));
        } catch (e) { /* skip invalid JSON-LD */ }
      });
      if (jsonLd.length > 0) meta.jsonLd = jsonLd;

      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) meta.canonicalUrl = canonical.getAttribute('href');

      meta.language = document.documentElement.lang || '';

      const favicon = document.querySelector('link[rel="icon"]') ||
        document.querySelector('link[rel="shortcut icon"]');
      if (favicon) meta.favicon = favicon.getAttribute('href');

      return meta;
    },

    /**
     * Extract structured semantic content
     */
    extractStructuredContent() {
      const cleaner = window.__agentBridge_cleaner;
      const content = {};

      content.headings = this.extractHeadings();
      content.paragraphs = this.extractParagraphs();
      content.links = this.extractLinks();
      content.images = this.extractImages();
      content.tables = this.extractTables();
      content.lists = this.extractLists();
      content.codeBlocks = this.extractCodeBlocks();

      // Deduplicate paragraphs
      content.paragraphs = cleaner.deduplicateText(
        content.paragraphs.map(p => ({ text: p }))
      ).map(p => p.text);

      return content;
    },

    extractHeadings() {
      const headings = [];
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
        const text = el.textContent.trim();
        if (text) {
          headings.push({
            level: parseInt(el.tagName[1]),
            text: text.substring(0, 500)
          });
        }
      });
      return headings;
    },

    extractParagraphs() {
      const paragraphs = [];
      const seen = new Set();
      const cleaner = window.__agentBridge_cleaner;

      document.querySelectorAll('p, [role="paragraph"]').forEach(el => {
        if (!this.isVisible(el)) return;

        let text = el.textContent.trim();
        text = cleaner.normalizeWhitespace(text);

        if (text.length > 5) {
          const normalized = text.toLowerCase().replace(/\s+/g, ' ');
          if (!seen.has(normalized)) {
            seen.add(normalized);
            paragraphs.push(text);
          }
        }
      });

      return paragraphs;
    },

    extractLinks() {
      const links = [];
      const seen = new Set();

      document.querySelectorAll('a[href]').forEach(el => {
        if (!this.isVisible(el)) return;

        const href = el.href;
        const text = el.textContent.trim();

        if (!href || href.startsWith('javascript:') || href === '#') return;
        if (!text && !el.querySelector('img')) return;

        const key = `${href}|${text}`;
        if (seen.has(key)) return;
        seen.add(key);

        links.push({
          text: text.substring(0, 200),
          href: href,
          title: el.title || undefined,
          isExternal: el.hostname !== window.location.hostname || undefined
        });
      });

      return links;
    },

    extractImages() {
      const images = [];

      document.querySelectorAll('img').forEach(el => {
        const src = el.src || el.dataset.src || el.getAttribute('data-lazy-src');
        if (!src) return;

        // In headless, naturalWidth/Height may be 0 — use HTML attributes instead
        const w = el.getAttribute('width');
        const h = el.getAttribute('height');
        const width = parseInt(w) || el.naturalWidth || el.width || 0;
        const height = parseInt(h) || el.naturalHeight || el.height || 0;

        // Skip tracking pixels (but be lenient — in headless we may not know true size)
        if (width > 0 && width < 10 && height > 0 && height < 10) return;
        if (src.includes('pixel') || src.includes('tracking') || src.includes('beacon')) return;

        images.push({
          src: src,
          alt: el.alt || undefined,
          width: width || undefined,
          height: height || undefined
        });
      });

      return images;
    },

    extractTables() {
      const tables = [];

      document.querySelectorAll('table').forEach(table => {
        if (table.getAttribute('role') === 'presentation') return;

        const tableData = { headers: [], rows: [] };

        const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th');
        headerCells.forEach(cell => {
          tableData.headers.push(cell.textContent.trim());
        });

        const bodyRows = table.querySelectorAll('tbody tr, tr');
        bodyRows.forEach((row, rowIdx) => {
          if (rowIdx === 0 && tableData.headers.length > 0 &&
            row.querySelector('th') && !row.parentElement.matches('tbody')) return;

          const cells = [];
          row.querySelectorAll('td, th').forEach(cell => {
            cells.push(cell.textContent.trim());
          });
          if (cells.length > 0 && cells.some(c => c.length > 0)) {
            tableData.rows.push(cells);
          }
        });

        if (tableData.headers.length > 0 || tableData.rows.length > 0) {
          tables.push(tableData);
        }
      });

      return tables;
    },

    extractLists() {
      const lists = [];

      document.querySelectorAll('ul, ol').forEach(list => {
        if (list.closest('nav') || list.parentElement.closest('ul, ol')) return;
        if (!this.isVisible(list)) return;

        const items = [];
        list.querySelectorAll(':scope > li').forEach(li => {
          const text = li.textContent.trim();
          if (text.length > 0) {
            items.push(text.substring(0, 500));
          }
        });

        if (items.length > 0) {
          lists.push({
            type: list.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered',
            items
          });
        }
      });

      return lists;
    },

    extractCodeBlocks() {
      const blocks = [];

      document.querySelectorAll('pre, code').forEach(el => {
        if (el.tagName === 'CODE' && el.closest('pre')) return;

        const text = el.textContent.trim();
        if (text.length > 10) {
          let langClass = (el.className || '').match(/(?:lang|language)-(\w+)/);
          if (!langClass && el.tagName === 'PRE') {
            const codeChild = el.querySelector('code[class]');
            if (codeChild) {
              langClass = (codeChild.className || '').match(/(?:lang|language)-(\w+)/);
            }
          }
          blocks.push({
            language: langClass ? langClass[1] : undefined,
            code: text.substring(0, 5000)
          });
        }
      });

      return blocks;
    },

    /**
     * Extract all visible text content (for text-only mode)
     */
    extractTextContent() {
      const cleaner = window.__agentBridge_cleaner;

      const clone = document.cloneNode(true);
      cleaner.removeNoiseElements(clone);
      cleaner.removeEmptyElements(clone);

      const body = clone.querySelector('body');
      if (!body) return '';

      const textParts = [];
      const walkerDoc = body.ownerDocument || document;
      const walker = walkerDoc.createTreeWalker(
        body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        if (text.length > 0) {
          textParts.push(text);
        }
      }

      return cleaner.normalizeWhitespace(textParts.join('\n'));
    },

    /**
     * Headless-compatible visibility check.
     * Works without CSS layout engine (Lightpanda has no getComputedStyle layout results).
     * Uses tag-based + attribute-based heuristics.
     */
    isVisible(el) {
      if (!el) return false;

      // Check inline styles (works without layout engine)
      const inlineStyle = (el.getAttribute('style') || '').toLowerCase();
      if (inlineStyle.includes('display: none') || inlineStyle.includes('display:none')) return false;
      if (inlineStyle.includes('visibility: hidden') || inlineStyle.includes('visibility:hidden')) return false;

      // Check HTML hidden attribute
      if (el.hasAttribute('hidden')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;

      // Check type=hidden for inputs
      if (el.type === 'hidden') return false;

      // Walk up ancestors for inherited hidden
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const pStyle = (parent.getAttribute('style') || '').toLowerCase();
        if (pStyle.includes('display: none') || pStyle.includes('display:none')) return false;
        if (parent.hasAttribute('hidden')) return false;
        if (parent.getAttribute('aria-hidden') === 'true') return false;
        parent = parent.parentElement;
      }

      // Try getComputedStyle if available (works in full browsers, may partially work in Lightpanda)
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
      } catch (e) { /* Lightpanda may not support this fully */ }

      return true;
    }
  };

  window.__agentBridge_extractor = Extractor;
})();
