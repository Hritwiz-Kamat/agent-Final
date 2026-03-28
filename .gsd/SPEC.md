---
status: DRAFT
created: 2026-03-28T23:35:00+05:30
finalized:
---

# SPEC.md — AgentBridge Project Specification

## Vision

AgentBridge is a Chrome extension that converts any webpage into clean, structured, token-efficient JSON — purpose-built for AI agents. It strips HTML noise, compresses token count by up to 80%, maps interactive page elements (buttons, forms, links) into callable agent tools, and outputs MCP-compatible structured data. No scraping setup, no custom parsers — install it and every website becomes agent-native.

---

## Goals

1. **Token-Efficient Content Extraction**
   Strip all HTML noise (ads, nav, scripts, styles, tracking) and extract only semantic content. Output clean JSON that uses 80% fewer tokens than raw HTML.

2. **Action Mapping → Callable Tools**
   Identify all interactive elements (buttons, forms, links, inputs) on a page and describe them as JSON-schema callable tools — so an AI agent can "click" or "fill" without parsing HTML.

3. **MCP-Compatible Output**
   Format all output as MCP (Model Context Protocol) resources and tools, making AgentBridge a drop-in data source for any MCP-compatible AI agent (Claude Desktop, Cursor, VS Code, etc.).

4. **Zero-Config Browser Experience**
   A clean, beautiful Chrome extension popup where you click one button and get the structured output. Copy-to-clipboard, export as JSON, and live preview.

---

## Non-Goals (Out of Scope)

Explicitly NOT part of this project:

- Full browser automation / remote control (not Puppeteer/Playwright)
- Server-side scraping or headless browser rendering
- User authentication or login handling for target websites
- Building a full MCP server with WebSocket bridge (future milestone)
- Cross-browser support (Firefox, Edge) — Chrome only for MVP
- AI model integration (we output data, don't consume it)

---

## Users

**Primary User:** AI developers building browser agents
- Install extension → navigate to any page → extract structured data
- Feed output directly into LLM prompts or MCP pipelines
- Reduce API costs by sending 80% fewer tokens

**Secondary User:** Startups and enterprises running AI workflows at scale
- Standardize web data extraction across teams
- Consistent JSON schema for all websites
- Integrate into existing automation pipelines

---

## Constraints

### Technical
- Chrome Extension Manifest V3 (required by Chrome Web Store)
- JavaScript/Node.js only (no WASM or native modules)
- Must work on dynamically loaded SPAs (React, Vue, Angular sites)
- Content script must be lightweight (<50KB)
- Must handle iframes and shadow DOM

### Timeline
- MVP in one milestone (~4 phases)

### Other
- No external API dependencies (all processing is local/client-side)
- Must work offline after installation
- Open source (MIT license)

---

## Success Criteria

How we know the project is successful:

- [ ] Extension installs and activates on any webpage
- [ ] Extracts clean text content with <20% of original HTML token count
- [ ] Maps at least buttons, links, forms, and inputs as callable tools
- [ ] Outputs valid MCP-compatible JSON structure
- [ ] Popup shows extraction results with copy-to-clipboard
- [ ] Works on top 10 most visited websites (Google, YouTube, Reddit, etc.)
- [ ] Handles SPAs with dynamically loaded content

---

## Prior Art

| Solution | Pros | Cons | Relevance |
|----------|------|------|-----------|
| Mozilla Readability.js | Battle-tested, strips noise well | Article-focused, misses interactive elements | Core extraction engine |
| mcp-chrome (hangwin) | Full browser MCP | Heavy, requires local server | Architecture reference |
| WebMCP (Google) | Native browser standard | Early preview, not widespread | Future integration path |
| Jina Reader API | Great text extraction | External API, costs money, no tools | Token efficiency benchmark |
| Browser-use extension | Multi-agent session sharing | Control-focused, not extraction | Different niche |

---

## Open Questions

- [ ] Should we bundle Readability.js or write a custom DOM parser?
- [ ] What MCP protocol version should we target (latest stable)?
- [ ] Should the popup show raw JSON or a formatted tree view?
- [ ] Should we support user-defined extraction rules (CSS selectors)?

---

## Decisions

| Decision | Choice | Rationale | Date |
|----------|--------|-----------|------|
| Extension platform | Chrome MV3 | Largest browser market share, modern API | 2026-03-28 |
| Content extraction | Hybrid (Readability.js + custom) | Readability for text, custom for interactive elements | 2026-03-28 |
| Output format | MCP-compatible JSON | Industry standard for AI tool-calling | 2026-03-28 |
| Processing location | Client-side only | Privacy, speed, no API costs | 2026-03-28 |
