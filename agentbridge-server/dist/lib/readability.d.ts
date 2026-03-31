/**
 * AgentBridge Server — Readability.js Wrapper
 * Provides article extraction using @mozilla/readability + jsdom.
 */
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
export declare function extractArticle(html: string, url: string): ArticleContent | null;
//# sourceMappingURL=readability.d.ts.map