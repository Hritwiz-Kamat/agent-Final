# AgentBridge Server

### 🤔 What is this? (The Simple Explanation)
Imagine you want to use ChatGPT, Claude, or any AI to read a website for you. If you give an AI the raw code of a website (HTML), it gets confused by all the junk: ads, invisible styling code, tracking scripts, and popups. Plus, reading all that junk costs you money in "tokens".

**AgentBridge** is a tool that goes to a website, reads the page, and completely strips away the garbage. It serves you just the pure, readable text and gives you a map of every button and text box on the page. 

It does this so well that you plug it straight into your AI (like Claude Desktop) and suddenly your AI can "surf the web" perfectly.

---

### 🤓 The Technical Explanation
AgentBridge is a powerful, standalone tool that transforms any webpage into clean, token-compressed, structured JSON — purpose-built for AI agents. It completely strips HTML noise, maps interactive page elements (like buttons, links, and forms) into callable functions, and seamlessly integrates with your agents via **MCP (Model Context Protocol)** or a **REST API**.

Powered defensively by **Lightpanda** (for maximum speed and lowest memory) with fallback support for headless Chromium, AgentBridge takes the pain out of web scraping for AI.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **Lightpanda** (Optional but recommended): Install via `curl -fsSL https://pkg.lightpanda.io/install.sh | bash`
- **Docker** (Optional for container deployments)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   cd agentbridge-server
   npm install
   ```
2. Build the TypeScript bundles:
   ```bash
   npm run build
   ```
3. Copy the `.env.example` file to create your local config:
   ```bash
   cp .env.example .env
   ```

---

## 🔌 1. How to Use: The REST API

The easiest way to integrate AgentBridge into your own scripts and tools is by running the built-in Express server.

### Start the Server
```bash
# Starts on http://localhost:3100
npm run dev
# OR from the built dist:
node dist/index.js serve --port 3100
```

### API Endpoints

#### **Extract Page Content** (`POST /api/extract`)
Extracts the text and structural context of a given URL.
```bash
curl -X POST http://localhost:3100/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "format": "mcp",
    "chineseCompression": false
  }'
```
*Formats available: `mcp` (full JSON), `raw`, `text` (clean markdown).*

#### **List Interactive Elements** (`POST /api/actions`)
Fetches all usable buttons, inputs, and links on a page.
```bash
curl -X POST http://localhost:3100/api/actions \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### **Execute an Action** (`POST /api/actions/execute`)
Click a button or fill out a form using a selector obtained from `list_actions`.
```bash
curl -X POST http://localhost:3100/api/actions/execute \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "selector": "button.submit-btn",
    "action": "click"
  }'
```

---

## 🤖 2. How to Use: Claude Desktop & Cursor (MCP)

AgentBridge implements the **Model Context Protocol** natively via stdio, allowing direct integration into AI workspaces so they can browse the web on your behalf.

### Claude Desktop Configuration
Add the following to your `claude_desktop_config.json`:

*If you are on Windows (without WSL Lightpanda), use the Chromium engine:*
```json
{
  "mcpServers": {
    "agentbridge": {
      "command": "node",
      "args": ["C:/Users/kirsh/Documents/GitHub/agentbrowser/agentbridge-server/dist/index.js", "mcp"],
      "env": {
        "BROWSER_ENGINE": "chromium"
      }
    }
  }
}
```

Once installed, Claude will have access to 4 new tools (`extract_page`, `list_actions`, `get_page_text`, `execute_action`), and can read webpages via `page://{domain}/{path}` resources.

---

## 🐳 3. How to Use: Docker & Production Deployment

If you want to run AgentBridge along with its Lightpanda dependency as a contained microservice, use Docker Compose.

```bash
docker-compose up -d --build
```

This spins up two locked-down containers:
- `lightpanda` (running at `ws://127.0.0.1:9222`)
- `agentbridge` (API running at `http://127.0.0.1:3100`)

---

## ⚙️ Configuration (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEY` | Optional Bearer token for API protection | `[None]` |
| `BROWSER_ENGINE` | `lightpanda` or `chromium` | `lightpanda` |
| `LIGHTPANDA_ENDPOINT` | Websocket URL for external Lightpanda | `ws://127.0.0.1:9222` |
| `MAX_PAGES` | Allowed concurrent extraction pages | `5` |
| `CHINESE_COMPRESSION` | Toggle mapping terms to Chinese chars to save tokens | `false` |
| `RATE_LIMIT_RPM` | Maximum API requests per IP per minute | `60` |

---

## 📂 Architecture & Files (How It Works)

If you're curious about how AgentBridge ticks, here is a breakdown of every major file and why it exists.

### The Engine (The Heavy Lifters)
These files do the hard work of turning messy websites into clean data.
* **`src/engine/orchestrator.ts`**: The "brain" of the operation. It directs the browser to a URL, injects scripts, waits for the page to load, and extracts the final JSON. 
* **`src/engine/cleaner.ts`**: The token-saver. It removes useless characters, normalizes text spaces, and even translates common website buttons (like "Submit" or "Search") into compressed Chinese characters to save you money on AI tokens!
* **`src/engine/mcp-formatter.ts`**: The translator. It takes the messy scraped data and perfectly formats it into a standard that AI models actually understand.

### The Browser Pool (The Speed Demons)
Starting a browser from scratch is slow. These files keep browsers ready to go.
* **`src/browser/pool.ts`**: A waiting room for browser tabs. If a new request comes in, it instantly hands over a pre-warmed browser tab instead of starting one from scratch, making your API lighting fast.
* **`src/browser/lightpanda.ts` & `chromium-fallback.ts`**: Support for our two engines. Lightpanda is a headless-only super-fast browser. Chromium is the classic Chrome browser for fallbacks.

### The REST API (The HTTP Interface)
If you want to ping AgentBridge from a script or Postman.
* **`src/api/server.ts`**: Holds the web server together (using Express).
* **`src/api/routes/extract.ts` & `actions.ts`**: The specific URLs you call that trigger the engine functions.
* **`src/api/middleware/...`**: Security guards. These files rate-limit abusers, check for your `API_KEY` (auth.ts), and validate that your JSON requests aren't malformed (validation.ts).

### The MCP Server (The AI Interface)
For direct integrations into Claude Desktop, Cursor, and Windsurf.
* **`src/mcp/server.ts`**: Boots up a protocol server that "talks" directly to Claude instead of a regular web browser.
* **`src/mcp/tools.ts`**: Declares exactly what abilities your AI has. It tells Claude: "Hey, I grant you the ability to click buttons and extract pages!"
* **`src/mcp/resources.ts`**: Keeps a cache so if Claude asks to read the same webpage 5 times, we only load it once. Extremely beneficial for saving time and bandwidth.

### The Deployment (Docker)
* **`Dockerfile` & `docker-compose.yml`**: Allows you to run the entire backend on any cloud server anywhere in the world with exactly one command, ensuring it works exactly the same on your laptop as it does in the cloud.
