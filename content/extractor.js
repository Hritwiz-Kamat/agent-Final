/**
 * AgentBridge — Content Extractor
 * Main extraction engine: DOM traversal, semantic extraction,
 * metadata parsing, and Readability.js integration.
 */

(function () {
  'use strict';

  if (window.__agentBridge_extractor) return;

  const Extractor = {
    /**
     * Main extraction entry point
     * Returns structured content from the current page
     */
    extract(options = {}) {
      const startTime = performance.now();
      const cleaner = window.__agentBridge_cleaner;

      // Get page metadata first (before any DOM modifications)
      const metadata = this.extractMetadata();

      // Get raw HTML size for comparison
      const rawHTML = document.documentElement.outerHTML;
      const rawTokens = cleaner.estimateTokens(rawHTML);

      // Try Readability.js first for article content
      let articleContent = null;
      if (options.useReadability !== false) {
        articleContent = this.tryReadability();
      }

      // Extract structured content from the live DOM
      const structuredContent = this.extractStructuredContent();

      // Extract all text content (cleaned)
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

      // Basic metadata
      meta.title = document.title || '';
      meta.url = window.location.href;
      meta.domain = window.location.hostname;
      meta.timestamp = new Date().toISOString();

      // Meta description
      const descTag = document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
      meta.description = descTag?.getAttribute('content') || '';

      // Open Graph tags
      const ogTags = {};
      document.querySelectorAll('meta[property^="og:"]').forEach(el => {
        const prop = el.getAttribute('property').replace('og:', '');
        ogTags[prop] = el.getAttribute('content') || '';
      });
      if (Object.keys(ogTags).length > 0) meta.openGraph = ogTags;

      // Twitter Card tags
      const twitterTags = {};
      document.querySelectorAll('meta[name^="twitter:"]').forEach(el => {
        const name = el.getAttribute('name').replace('twitter:', '');
        twitterTags[name] = el.getAttribute('content') || '';
      });
      if (Object.keys(twitterTags).length > 0) meta.twitterCard = twitterTags;

      // JSON-LD structured data
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      const jsonLd = [];
      jsonLdScripts.forEach(script => {
        try {
          jsonLd.push(JSON.parse(script.textContent));
        } catch (e) { /* skip invalid JSON-LD */ }
      });
      if (jsonLd.length > 0) meta.jsonLd = jsonLd;

      // Canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) meta.canonicalUrl = canonical.getAttribute('href');

      // Language
      meta.language = document.documentElement.lang || '';

      // Favicon
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

      // Headings
      content.headings = this.extractHeadings();

      // Paragraphs
      content.paragraphs = this.extractParagraphs();

      // Links
      content.links = this.extractLinks();

      // Images
      content.images = this.extractImages();

      // Tables
      content.tables = this.extractTables();

      // Lists
      content.lists = this.extractLists();

      // Code blocks
      content.codeBlocks = this.extractCodeBlocks();

      // Deduplicate paragraphs
      content.paragraphs = cleaner.deduplicateText(
        content.paragraphs.map(p => ({ text: p }))
      ).map(p => p.text);

      return content;
    },

    /**
     * Extract heading hierarchy
     */
    extractHeadings() {
      const headings = [];
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
        const text = el.textContent.trim();
        if (text) {
          headings.push({
            level: parseInt(el.tagName[1]),
            text: text.substring(0, 500) // Cap length
          });
        }
      });
      return headings;
    },

    /**
     * Extract paragraphs and text blocks
     */
    extractParagraphs() {
      const paragraphs = [];
      const seen = new Set();
      const cleaner = window.__agentBridge_cleaner;

      document.querySelectorAll('p, [role="paragraph"]').forEach(el => {
        // Skip hidden elements
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

    /**
     * Extract links with href and text
     */
    extractLinks() {
      const links = [];
      const seen = new Set();

      document.querySelectorAll('a[href]').forEach(el => {
        if (!this.isVisible(el)) return;

        const href = el.href;
        const text = el.textContent.trim();

        // Skip empty, fragment-only, or javascript links
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

    /**
     * Extract images with alt text
     */
    extractImages() {
      const images = [];

      document.querySelectorAll('img').forEach(el => {
        const src = el.src || el.dataset.src || el.getAttribute('data-lazy-src');
        if (!src) return;

        // Skip tracking pixels and tiny images
        if (el.width < 10 || el.height < 10) return;
        if (src.includes('pixel') || src.includes('tracking') || src.includes('beacon')) return;

        images.push({
          src: src,
          alt: el.alt || undefined,
          width: el.naturalWidth || el.width || undefined,
          height: el.naturalHeight || el.height || undefined
        });
      });

      return images;
    },

    /**
     * Extract tables as structured data
     */
    extractTables() {
      const tables = [];

      document.querySelectorAll('table').forEach(table => {
        // Skip layout tables
        if (table.getAttribute('role') === 'presentation') return;

        const tableData = { headers: [], rows: [] };

        // Extract headers
        const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th');
        headerCells.forEach(cell => {
          tableData.headers.push(cell.textContent.trim());
        });

        // Extract rows
        const bodyRows = table.querySelectorAll('tbody tr, tr');
        bodyRows.forEach((row, rowIdx) => {
          // Skip header row if already extracted
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

    /**
     * Extract lists (ordered and unordered)
     */
    extractLists() {
      const lists = [];

      document.querySelectorAll('ul, ol').forEach(list => {
        // Skip nav lists, nested lists (handled by parent)
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

    /**
     * Extract code blocks
     */
    extractCodeBlocks() {
      const blocks = [];

      document.querySelectorAll('pre, code').forEach(el => {
        // Skip inline code inside pre (already captured by pre)
        if (el.tagName === 'CODE' && el.closest('pre')) return;

        const text = el.textContent.trim();
        if (text.length > 10) {
          // Try to detect language from class
          const langClass = (el.className || '').match(/(?:lang|language)-(\w+)/);
          blocks.push({
            language: langClass ? langClass[1] : undefined,
            code: text.substring(0, 5000) // Cap code length
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

      // Clone the document to avoid modifying the live DOM
      const clone = document.cloneNode(true);
      cleaner.removeNoiseElements(clone);
      cleaner.removeEmptyElements(clone);

      // Get body text
      const body = clone.querySelector('body');
      if (!body) return '';

      // Walk the tree and extract text with some structure
      const textParts = [];
      const walker = document.createTreeWalker(
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
     * Try Readability.js extraction for article content
     */
    tryReadability() {
      try {
        if (typeof Readability === 'undefined') return null;

        const clone = document.cloneNode(true);
        const reader = new Readability(clone);
        const article = reader.parse();

        if (!article || !article.textContent) return null;

        return {
          title: article.title || '',
          byline: article.byline || '',
          content: article.textContent.trim().substring(0, 50000),
          excerpt: article.excerpt || '',
          siteName: article.siteName || '',
          length: article.length || 0
        };
      } catch (e) {
        console.warn('[AgentBridge] Readability.js failed:', e.message);
        return null;
      }
    },

    /**
     * Check if an element is visible
     */
    isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0;
    }
  };

  window.__agentBridge_extractor = Extractor;
})();
