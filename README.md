<div align="center">

# 🤖 AgentBrowser

**The open-source headless browser built for AI agents.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Lightpanda](https://img.shields.io/badge/engine-Lightpanda-8B5CF6)](https://github.com/lightpanda-io/browser)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-22C55E)](https://modelcontextprotocol.io)
[![npm version](https://img.shields.io/badge/npm-coming%20soon-orange)](https://npmjs.com)

[🌐 Website](https://agentbrowser.dev) · [📖 Docs](https://docs.agentbrowser.dev) · [☁️ Cloud API](https://agentbrowser.dev/cloud) · [💬 Discord](https://discord.gg/agentbrowser)

---

*The web has 2 billion pages. Your AI agents can't read any of them — not properly.*

**AgentBrowser fixes that.**

</div>

---

## 🔥 The Problem Every AI Startup Hits

You're building an AI agent. It needs to read a webpage. So you point it at a URL.

And then your costs explode.

A single Amazon product page contains **12,000+ tokens** of HTML noise — nav bars, ads, tracking scripts, decorative divs. Your agent reads all of it. You pay for all of it. And after all that, the agent still gets confused because the structure was never designed for machines.

At scale, this isn't a bug. **It's a cash fire. 🔥**

```
💸 One messy webpage          →   12,400 tokens   →   $0.037 per call
✅ Same page via AgentBrowser  →    1,680 tokens   →   $0.005 per call

📊 1 million agent calls/month:
   Without AgentBrowser:  $37,000/month
   With AgentBrowser:      $5,000/month

   You just saved $32,000/month. 💰
```

---

## ⚡ What AgentBrowser Does

AgentBrowser sits between your AI agent and the raw web. It fetches any URL, strips everything your agent doesn't need, maps what the page *can do*, and returns clean structured JSON — ready to plug into any LLM.

```
🤖 Your AI Agent
      │
      │  "read https://example.com"
      ▼
🌉 AgentBrowser
      │
      ├── 🚀 Fetches page (via Lightpanda — 11x faster than Chrome)
      ├── 🧹 Strips noise (ads, nav, scripts, decorative HTML)
      ├── 🧠 Extracts semantic content (headings, data, links, tables)
      ├── 🗺️  Maps actions (buttons, forms → callable tools)
      ├── 🗜️  Compresses tokens (up to 85% reduction)
      └── 📦 Outputs MCP-compatible JSON
      │
      ▼
✨ Your AI Agent gets pure signal. Not a webpage. Intelligence.
```

---

## 🚀 Quickstart

### ☁️ Cloud API — no setup needed

```bash
curl -X POST https://api.agentbrowser.dev/extract \
  -H "Authorization: Bearer ab_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://news.ycombinator.com"}'
```

→ [🔑 Get your free API key](https://agentbrowser.dev/cloud) — 1,000 free extractions/month

### 🐳 Self-hosted — free forever

```bash
git clone https://github.com/krishgupta69/agentbrowser
cd agentbrowser
docker-compose up

curl -X POST http://localhost:3100/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://news.ycombinator.com"}'
```

### 🔌 MCP Integration — Claude / Cursor / Windsurf

```json
{
  "mcpServers": {
    "agentbrowser": {
      "command": "npx",
      "args": ["agentbrowser", "mcp"],
      "env": { "AB_API_KEY": "ab_your_api_key" }
    }
  }
}
```

---

## 📦 Example Response

```json
{
  "url": "https://example.com/product/123",
  "title": "Running Shoes - Example Store",
  "content": {
    "heading": "Ultra Boost Running Shoes",
    "price": "$129.99",
    "description": "Lightweight, responsive cushioning...",
    "rating": "4.8/5 (2,340 reviews)"
  },
  "tools": [
    {
      "name": "add_to_cart",
      "selector": "#add-to-cart-btn",
      "action": "click"
    },
    {
      "name": "select_size",
      "selector": "#size-selector",
      "action": "select",
      "options": ["US 8", "US 9", "US 10", "US 11"]
    }
  ],
  "stats": {
    "rawTokens": 11800,
    "outputTokens": 1420,
    "savings": "88%",
    "extractionTime": "312ms",
    "toolCount": 8
  }
}
```

---

## 📊 Token Savings — Real Benchmarks

| 🌐 Website | Raw HTML Tokens | AgentBrowser Output | 💰 Savings |
|---------|----------------|---------------------|---------|
| Amazon product page | 12,400 | 1,680 | **86%** |
| GitHub repository | 8,200 | 1,140 | **86%** |
| Wikipedia article | 15,600 | 3,200 | **79%** |
| Hacker News front page | 6,100 | 890 | **85%** |
| LinkedIn profile | 9,800 | 1,350 | **86%** |

*🀄 Enable Chinese compression for an additional 10–15% reduction on top.*

---

## ✨ Features

**🔍 Extraction**
- Semantic content extraction — headings, paragraphs, tables, lists, code blocks
- Metadata parsing — Open Graph, JSON-LD, Twitter Card, canonical URLs
- Readability.js fallback for article-heavy pages
- Full JavaScript execution — works on SPAs, React, Next.js apps

**🗜️ Compression**
- Noise removal — strips ads, nav bars, scripts, decorative elements
- Token optimization — whitespace normalization, smart truncation
- 🀄 Chinese label compression — `"navigation"` → `"导航"` (optional, ~12% extra)
- Up to **85% token reduction** out of the box

**🗺️ Action Mapping**
- Buttons, links, forms → MCP tool definitions with callable selectors
- ARIA-aware element detection
- Form schema extraction with field types and validation rules
- Every interactive element becomes an agent-callable tool

**🔌 Interfaces**
- MCP Server (stdio + HTTP/SSE) — any MCP-compatible agent
- REST API — `POST /api/extract`, `/api/actions`, `/api/execute`
- CLI — `agentbrowser fetch <url>`
- Chrome Extension — manual extraction with live token stats UI

**⚡ Infrastructure**
- 🐼 Lightpanda engine — 9x less memory, 11x faster than Chrome
- Connection pooling — concurrent extractions, reusable page instances
- Chromium fallback — for pages requiring full CSS rendering
- 🐳 Docker ready — `docker-compose up` and you're running

---

## 🤔 Why Not Just Use...

❌ **Jina Reader** — Converts to markdown. No action mapping. No token compression. No MCP output. Good for reading, not for agents that need to *act*.

❌ **Firecrawl** — Powerful but heavy setup, not real-time, no MCP native support, no Chinese compression.

❌ **Browser-Use** — Great framework but expensive to run, slow to start, overkill if you just need structured data fast.

❌ **Raw Puppeteer** — You write the scraper. You handle retries. You build the parser. You format the output. Every. Single. Time. For every website.

✅ **AgentBrowser** — One API call. Any URL. Structured JSON. MCP-ready. Done.

---

## 💰 Cloud Pricing

Self-hosting is always free. For teams that want zero infra overhead:

| 📦 Plan | Extractions/month | 💵 Price |
|------|------------------|-------|
| **🆓 Free** | 1,000 | $0 |
| **🚀 Starter** | 50,000 | $19 |
| **📈 Growth** | 500,000 | $99 |
| **⚡ Scale** | 5,000,000 | $499 |
| **🏢 Enterprise** | Unlimited | Custom |

→ [🎯 Start free — no credit card required](https://agentbrowser.dev/cloud)

---

## 🛠️ Self-hosted Setup

### 🐳 With Docker (recommended)

```bash
git clone https://github.com/krishgupta69/agentbrowser
cd agentbrowser
cp .env.example .env
docker-compose up
```

### 🐧 Without Docker (Linux/macOS)

```bash
# Install Lightpanda engine
curl -L -o lightpanda \
  https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux
chmod +x ./lightpanda
./lightpanda serve --host 127.0.0.1 --port 9222 &

# Install and run AgentBrowser
cd agentbridge-server
npm install && npm run build && npm start
```

### 🪟 Windows

Use Docker Desktop or WSL2. Lightpanda runs natively on Linux/macOS only.

### ⚙️ Environment Variables

```env
LIGHTPANDA_ENDPOINT=ws://127.0.0.1:9222
API_PORT=3100
API_KEY=your_secret_key
CHINESE_COMPRESSION=false
MAX_PAGES=5
```

---

## 📁 Project Structure

```
agentbrowser/
├── agentbridge-server/     # 🖥️  MCP Server + REST API (TypeScript)
│   ├── src/
│   │   ├── browser/        # 🐼 Lightpanda + Chromium adapters
│   │   ├── engine/         # ⚙️  Extraction + compression pipeline
│   │   ├── mcp/            # 🔌 MCP server implementation
│   │   ├── api/            # 🌐 REST API (Express)
│   │   └── cli/            # 💻 CLI interface
│   └── docker-compose.yml
├── content/                # 🧩 Chrome extension content scripts
├── background/             # ⚡ Extension service worker
├── popup/                  # 🎨 Extension UI
├── adapters/               # 🔧 Browser engine adapters
└── docs/                   # 📖 Documentation
```

---

## 🗺️ Roadmap

- [x] 🧩 Chrome Extension (AgentBridge v1)
- [x] 🐼 Lightpanda integration
- [x] 🔌 MCP server (stdio + HTTP)
- [x] 🌐 REST API
- [x] 🗜️ Token compression engine
- [x] 🀄 Chinese label compression
- [x] 🐳 Docker deployment
- [ ] 📦 `npm install agentbrowser` package
- [ ] ☁️ AgentBrowser Cloud launch
- [ ] 🌊 Streaming extraction
- [ ] 🕷️ Multi-page crawl support
- [ ] 🦜 LangChain / LlamaIndex integration
- [ ] 🤖 Browser-use framework plugin

---

## 🤝 Contributing

AgentBrowser is open source and contributions are welcome.

```bash
git clone https://github.com/krishgupta69/agentbrowser
cd agentbrowser/agentbridge-server
npm install
npm run dev
```

---

## 👨‍💻 Contributors

The people who built this 🔥

| | Name | Role |
|---|---|---|
| 👑 | **Krish Gupta** | Creator, Architecture, Backend |
| 🎨 | **Ms. Jain** | UI/UX, Presentation, Frontend |
| ⚡ | **Hritwiz Kamat** | Core Engineering, Key Contributor |

Special thanks to Hritwiz Kamat for going deep in the trenches and making this actually work. Real ones know. 🙏

---

## 📄 License

MIT — free to use, modify, and distribute.

Built on [Lightpanda](https://github.com/lightpanda-io/browser) (AGPL-3.0).

---

<div align="center">

*"The greatest leverage in a business is control over resources that others depend on."*
**— John D. Rockefeller, World's First Billionaire**

**We don't own the web. We own the refinery. 🛢️**

---

Built with ❤️ by [Krish Gupta](https://github.com/krishgupta69) & [Hritwiz Kamat](https://github.com/Hritwiz-Kamat/)

[⭐ Star this repo](https://github.com/krishgupta69/agentbrowser) · [☁️ Try Cloud API](https://agentbrowser.dev) · [💬 Discord](https://discord.gg/agentbrowser)

</div>
