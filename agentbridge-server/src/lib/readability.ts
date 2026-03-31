/**
 * AgentBridge Server — Readability.js Wrapper
 * Provides article extraction using @mozilla/readability + jsdom.
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ArticleContent {
  title: string;
  byline: string;
  content: string;
  excerpt: string;
  siteName: string;
  length: number;
}

/**
 * Extract article content from an HTML string using Readability.js.
 * @param html — Full HTML string of the page
 * @param url — The URL of the page (used for resolving relative URLs)
 * @returns Parsed article or null if extraction fails
 */
export function extractArticle(html: string, url: string): ArticleContent | null {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) return null;

    return {
      title: article.title || '',
      byline: article.byline || '',
      content: article.textContent.trim().substring(0, 50_000),
      excerpt: article.excerpt || '',
      siteName: article.siteName || '',
      length: article.length || 0,
    };
  } catch (e) {
    return null;
  }
}
