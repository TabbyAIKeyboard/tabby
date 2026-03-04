# Tabby

<div align="center">

<img src="nextjs-backend/public/logos/tabby-header.png" alt="Tabby Logo" />


**A system-wide AI keyboard layer that transforms your input device into a real-time AI collaborator.**

[![CI](https://github.com/TabbyAIKeyboard/tabby/actions/workflows/ci.yml/badge.svg)](https://github.com/TabbyAIKeyboard/tabby/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/TabbyAIKeyboard/tabby?style=flat&logo=github)](https://github.com/TabbyAIKeyboard/tabby/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/TabbyAIKeyboard/tabby?style=flat&logo=github)](https://github.com/TabbyAIKeyboard/tabby/network/members)
[![GitHub issues](https://img.shields.io/github/issues/TabbyAIKeyboard/tabby?style=flat&logo=github)](https://github.com/TabbyAIKeyboard/tabby/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/TabbyAIKeyboard/tabby?style=flat&logo=github)](https://github.com/TabbyAIKeyboard/tabby/commits/main)
[![GitHub release](https://img.shields.io/github/v/release/TabbyAIKeyboard/tabby?style=flat&logo=github)](https://github.com/TabbyAIKeyboard/tabby/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[![Electron](https://img.shields.io/badge/Electron-38-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Local_Docker-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

[Features](#features) · [Screenshots](#screenshots) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Contributing](#contributing) · [License](#license)

</div>

---

## Features

Tabby lives at the point of input - no more switching between apps for AI help.

| Feature | Description |
|---|---|
| **Interview Copilot** | Real-time coding interview assistance with screen capture and multi-tab analysis |
| **Context-Aware Autocomplete** | Inline AI suggestions based on what you're typing, anywhere on your system |
| **Desktop Automation** | Full Windows MCP integration for system-level control |
| **Persistent Memory** | Remembers your preferences, coding style, and past interactions via Mem0 |
| **Invisible Typing** | AI types directly into any application, character-by-character |
| **Voice Agent** | Voice-to-text, text-to-voice, and live conversational agent |
| **Action Menu** | Quick AI actions on selected text — fix grammar, change tone, expand, summarize |

---

## Screenshots

<div align="center">

### Interview Copilot
<img src="nextjs-backend/public/landing/tabby-interview-copilot.png" alt="Interview Copilot" width="700" />

<br /><br />

### Interview Ghost Text
<img src="nextjs-backend/public/landing/tabby-interview-ghost.png" alt="Interview Ghost Text" width="700" />

<br /><br />

### Action Menu
<img src="nextjs-backend/public/landing/tabby-actions.png" alt="Action Menu" width="700" />

<br /><br />

### Voice Agent
<img src="nextjs-backend/public/landing/tabby-voice-agent.png" alt="Voice Agent" width="700" />

<br /><br />

### Knowledge Graph
<img src="nextjs-backend/public/landing/tabby-kg.png" alt="Knowledge Graph" width="700" />

<br /><br />

### Memories Dashboard
<img src="nextjs-backend/public/landing/tabby-memories.png" alt="Memories Dashboard" width="700" />

<br /><br />

### Settings
<img src="nextjs-backend/public/landing/tabby-settings.png" alt="Settings" width="700" />

<br /><br />

### Architecture
<img src="nextjs-backend/public/landing/tabby-architecture.png" alt="Architecture Diagram" width="700" />

</div>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop App | Electron 38 |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| AI | Vercel AI SDK, OpenAI / Groq / Cerebras / Google Gemini |
| Memory | Mem0 (Supabase vector store + Neo4j graph) |
| Desktop Automation | nut-js, node-window-manager, Windows MCP |
| Database | Supabase (Local Docker) |

---

## Keyboard Shortcuts

<details>
<summary><b>Global Shortcuts</b></summary>

| Shortcut | Action |
|---|---|
| `Ctrl+\` | Open / close action menu |
| `Ctrl+Space` | Get AI suggestion |
| `Ctrl+Shift+B` | Toggle brain panel |
| `Ctrl+Alt+I` | Interview ghost text |
| `Ctrl+Alt+J` | Voice Agent |
| `Ctrl+Shift+X` | Stop autotyping |
| `Ctrl+Shift+T` | Cycle transcribe modes |
| `Ctrl+Alt+T` | Toggle voice transcription |

</details>

<details>
<summary><b>Interview Copilot</b></summary>

| Shortcut | Action |
|---|---|
| `Alt+X` | Capture screen & analyze coding problem |
| `Alt+Shift+X` | Update analysis with new constraints |
| `Alt+N` | Get code suggestions / improvements |
| `Ctrl+1-6` | Switch tabs (Chat, Idea, Code, Walkthrough, Test Cases, Memories) |

</details>

<details>
<summary><b>Navigation</b></summary>

| Shortcut | Action |
|---|---|
| `Ctrl+Arrow` | Move floating window |
| `Esc` | Back / close |
| `Enter` | Accept & paste |

</details>

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.12+ (for memory backend)
- [uv](https://github.com/astral-sh/uv) — Python package manager
- [pnpm](https://pnpm.io) — JavaScript package manager
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for local Supabase
- An [OpenAI](https://openai.com) API key

<details>
<summary><b>Optional API keys</b></summary>

- Google Generative AI API key
- XAI API key
- Groq API key
- Cerebras API key
- OpenRouter API key
- [Tavily](https://tavily.ai/) API key (web search)
- [Neo4j](https://neo4j.com) instance (knowledge graph)

</details>

### 1. Clone & Install

```bash
git clone https://github.com/TabbyAIKeyboard/tabby.git
cd tabby

# Frontend
cd frontend && pnpm install

# Next.js Backend
cd ../nextjs-backend && pnpm install

# Memory Backend
cd ../backend && uv sync
```

### 2. Database Setup

We use a **local Supabase instance** running in Docker.

```bash
# Start Docker Desktop first, then:
npx supabase init     # first time only
npx supabase start    # starts all services (~10 s after first run)
```

After startup, note the **API URL**, **anon key**, and **service_role key** printed in the terminal.

<details>
<summary><b>Create storage buckets (one-time)</b></summary>

```powershell
# PowerShell
$headers = @{
  "apikey"        = "<SERVICE_ROLE_KEY>"
  "Authorization" = "Bearer <SERVICE_ROLE_KEY>"
  "Content-Type"  = "application/json"
}
Invoke-RestMethod -Uri "http://127.0.0.1:54321/storage/v1/bucket" `
  -Method Post -Headers $headers `
  -Body '{"id":"context-captures","name":"context-captures","public":true}'
Invoke-RestMethod -Uri "http://127.0.0.1:54321/storage/v1/bucket" `
  -Method Post -Headers $headers `
  -Body '{"id":"project-assets","name":"project-assets","public":true}'
```

Or create them manually via **Supabase Studio** → `http://localhost:54323` → Storage.

</details>

<details>
<summary><b>Supabase Quick Reference</b></summary>

| Action | Command |
| --- | --- |
| Start | `npx supabase start` |
| Stop | `npx supabase stop` |
| Status | `npx supabase status` |
| Admin UI | `http://localhost:54323` |
| Reset DB | `npx supabase db reset` |

> **Note:** Docker Desktop must be running before `npx supabase start`.

</details>

<details>
<summary><b>Neo4j (Knowledge Graph — Optional)</b></summary>

1. Create a free instance at [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/).
2. Save the credentials text file (URI, username, password).
3. Note the **Instance ID** and **Instance Name** from the dashboard.

</details>

### 3. Environment Variables

Copy the example env files, then fill in your credentials:

```bash
cp frontend/env.example frontend/.env.local
cp nextjs-backend/env.example nextjs-backend/.env.local
cp backend/env.example backend/.env
```

<details>
<summary><b>Frontend</b> — <code>frontend/.env.local</code></summary>

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON_KEY from supabase status>"
SUPABASE_ADMIN="<SERVICE_ROLE_KEY from supabase status>"

NEXT_PUBLIC_APP_NAME="Tabby"
NEXT_PUBLIC_APP_ICON="/logos/tabby-logo.png"

NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_MEMORY_API_URL="http://localhost:8000"
```

</details>

<details>
<summary><b>Next.js Backend</b> — <code>nextjs-backend/.env.local</code></summary>

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON_KEY from supabase status>"
SUPABASE_ADMIN="<SERVICE_ROLE_KEY from supabase status>"

RESEND_API_KEY=""
RESEND_DOMAIN=""

NEXT_PUBLIC_APP_NAME=Tabby
NEXT_PUBLIC_APP_ICON='/logos/tabby-logo.png'

# AI Providers
OPENAI_API_KEY=""
GOOGLE_GENERATIVE_AI_API_KEY=""
GROQ_API_KEY=""
CEREBRAS_API_KEY=""
OPENROUTER_API_KEY=""

TAVILY_API_KEY=""

MEMORY_API_URL="http://localhost:8000"
```

</details>

<details>
<summary><b>Backend</b> — <code>backend/.env</code></summary>

```env
OPENAI_API_KEY=
SUPABASE_CONNECTION_STRING="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Neo4j (optional)
NEO4J_URL=
NEO4J_USERNAME=
NEO4J_PASSWORD=
```

</details>

### 4. Run

```bash
# Terminal 0 — Local Supabase (Docker Desktop must be running)
npx supabase start

# Terminal 1 — Memory backend
cd backend && uv run main.py

# Terminal 2 — Next.js backend
cd nextjs-backend && pnpm dev

# Terminal 3 — Windows MCP server (optional)
cd frontend && pnpm run windows-mcp

# Terminal 4 — Electron app
cd frontend && pnpm dev
```

Once running:

| Service | URL |
|---|---|
| Supabase API | `http://127.0.0.1:54321` |
| Supabase Studio | `http://localhost:54323` |
| Frontend (Electron) | `http://localhost:3000` |
| Next.js Backend | `http://localhost:3001` |
| Memory API | `http://localhost:8000` |
| Windows MCP | `http://localhost:8001` |

### 5. System Tray

Tabby runs in the system tray. Right-click the icon for:

- Show Actions Menu
- Brain Panel
- Settings
- Quit

---

## Building & Releasing

<details>
<summary><b>Local Build</b></summary>

```bash
cd frontend
pnpm run dist
```

The `.exe` will be in `frontend/dist`.

</details>

<details>
<summary><b>GitHub Releases (CI)</b></summary>

Automated Windows releases via GitHub Actions.

1. **GitHub Secrets** — Add to repository settings:
   - `GH_TOKEN` — Personal Access Token (classic) with `repo` scope
   - All `NEXT_PUBLIC_*` and `SUPABASE_*` variables from `.env.local`
2. **Trigger a release:**
   ```bash
   cd frontend && pnpm run release
   ```
   This creates a git tag from `package.json` version, pushes it, and triggers a GitHub Action to build and publish.

</details>

<details>
<summary><b>Python Backend — Azure</b></summary>

- **Workflow:** `.github/workflows/backend-deploy.yml`
- **Trigger:** Push to `backend/` on `main`
- **URL:** [tabby-backend.azurecontainerapps.io](https://tabby-backend.jollydesert-22a4756c.centralindia.azurecontainerapps.io)
- Builds Docker image → pushes to Docker Hub (`thecubestar/tabby-backend`) → updates Azure Container App

</details>

<details>
<summary><b>Next.js Backend — Vercel</b></summary>

- **Deployment:** Automatic from `main`
- **URL:** [tabby-api-psi.vercel.app](https://tabby-api-psi.vercel.app)

</details>

---

## Project Structure

```
tabby/
├── frontend/                   # Electron + Next.js desktop app
│   ├── electron/src/           # Electron main process
│   │   ├── main.ts             # Window management, shortcuts
│   │   ├── text-handler.ts     # Clipboard, typewriter mode
│   │   └── context-capture.ts  # Periodic screenshot capture
│   └── src/
│       ├── app/                # Next.js pages
│       └── components/         # React components
│           ├── action-menu/    # Main AI menu, copilot, chat
│           ├── brain-panel/    # Memory dashboard
│           └── ai-elements/    # Message rendering
├── nextjs-backend/             # Shared API backend (Next.js)
│   └── src/app/api/            # AI and auth API routes
├── backend/                    # FastAPI memory server
│   └── main.py                 # Mem0 API endpoints
└── supabase/                   # Database migrations & config
```

---

## Contributing

Contributions are what make the open-source community amazing. **Any contributions you make are greatly appreciated.**

Please read our [Contributing Guide](CONTRIBUTING.md) to get started. In short:

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

