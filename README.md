# Tabby

<div align="center">

<img src="nextjs-backend/public/logos/tabby-logo.png" alt="Tabby" width="180" />

**A system-wide AI keyboard layer that turns your input device into a real-time writing collaborator.**

[![Electron](https://img.shields.io/badge/Electron-38-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Features](#features) · [Tech Stack](#tech-stack) · [Shortcuts](#keyboard-shortcuts) · [Getting Started](#getting-started) · [Architecture](docs/architecture.md) · [License](#license)

</div>

---

## Features

Tabby lives at the point of input, so assistance arrives without switching applications.

| Feature | Description |
|---|---|
| **Ghost Text Autocomplete** | Inline, memory-grounded continuations of what you are typing, rendered as grey ghost text over any application and accepted with `Shift+Tab` |
| **Knowledge Graph** | Memories are extracted into a Neo4j entity–relation graph, browsable as an interactive node-link view |
| **Chat Mode** | A streaming chat panel over the focused window, with tools for memory retrieval and web search |

### Ghost Text Autocomplete

A low-level keystroke listener maintains a debounced buffer of what you type. When the buffer settles, the app retrieves the memories relevant to that text, sends both to a fast completion endpoint, and paints the returned continuation as grey ghost text in a transparent, click-through overlay positioned at the caret.

- `Shift+Tab` accepts the suggestion and injects it into the focused application
- `Shift+Escape` dismisses the overlay and stops any in-progress typing
- Suggestions are cached (LRU, 25 entries) and keyed on the typed text
- Each suggestion records the memory content and memory types (episodic / semantic / procedural) that grounded it

### Knowledge Graph

The memory backend runs [Mem0](https://mem0.ai) with a Neo4j graph store. Beyond the flat vector-searchable memories, Mem0 extracts entities and the relations between them; the app renders that graph with `@neo4j-nvl/react` as an interactive, zoomable node-link diagram in the Graph tab.

### Chat Mode

Opened from the action menu (`Ctrl+\`), Chat Mode is a frameless always-on-top panel that streams responses from the configured model. It has access to memory tools (add, search, retrieve-all) and web search, so a conversation can both draw on and write back to the memory layer.

<div align="center">
<img src="nextjs-backend/public/images/tabby-chat.png" alt="Chat Mode" width="600" />
</div>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop App | Electron 38 |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| AI | Vercel AI SDK, OpenAI / Groq / Cerebras / Google Gemini |
| Memory | Mem0 (Supabase vector store + Neo4j graph) |
| Database | Supabase (local, Docker) |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+\` | Open / close the action menu (entry point to Chat Mode) |
| `Ctrl+Space` | Request a suggestion for the selected text |
| `Ctrl+Alt+G` | Enable and trigger ghost text on the current context |
| `Shift+Tab` | Accept the ghost text suggestion |
| `Shift+Escape` | Dismiss the suggestion and stop typing |
| `Ctrl+Shift+B` | Toggle the brain panel |
| `Ctrl+Alt+Shift+M` | Toggle the memory-free baseline condition |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.12+ (memory backend)
- [uv](https://github.com/astral-sh/uv) — Python package manager
- [pnpm](https://pnpm.io) — JavaScript package manager
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for local Supabase
- An OpenAI API key
- A [Neo4j](https://neo4j.com) instance — required for the knowledge graph

<details>
<summary><b>Optional API keys</b></summary>

- Google Generative AI API key
- Groq API key
- Cerebras API key
- OpenRouter API key
- Tavily API key (web search in Chat Mode)

</details>

### 1. Install

```bash
# Frontend
cd frontend && pnpm install

# Next.js backend
cd ../nextjs-backend && pnpm install

# Memory backend
cd ../backend && uv sync
```

### 2. Database Setup

The project uses a **local Supabase instance** running in Docker.

```bash
# Start Docker Desktop first, then:
npx supabase init     # first time only
npx supabase start    # starts all services
```

After startup, note the **API URL**, **anon key**, and **service_role key** printed in the terminal.

<details>
<summary><b>Supabase quick reference</b></summary>

| Action | Command |
| --- | --- |
| Start | `npx supabase start` |
| Stop | `npx supabase stop` |
| Status | `npx supabase status` |
| Admin UI | `http://localhost:54323` |
| Reset DB | `npx supabase db reset` |

> Docker Desktop must be running before `npx supabase start`.

</details>

<details>
<summary><b>Neo4j (knowledge graph)</b></summary>

1. Create an instance (a free [AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/) tier is sufficient).
2. Save the generated credentials — URI, username, password.
3. Put them in `backend/.env` as `NEO4J_URL`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`.

Without a Neo4j instance the app still runs, but the Graph tab stays empty — Mem0 falls back to vector-only memories with no extracted relations.

</details>

### 3. Environment Variables

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

NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_MEMORY_API_URL="http://localhost:8000"
```

</details>

<details>
<summary><b>Next.js backend</b> — <code>nextjs-backend/.env.local</code></summary>

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON_KEY from supabase status>"
SUPABASE_ADMIN="<SERVICE_ROLE_KEY from supabase status>"

# AI providers
OPENAI_API_KEY=""
GOOGLE_GENERATIVE_AI_API_KEY=""
GROQ_API_KEY=""
CEREBRAS_API_KEY=""
OPENROUTER_API_KEY=""

# Web search (optional)
TAVILY_API_KEY=""

MEMORY_API_URL="http://localhost:8000"
```

</details>

<details>
<summary><b>Memory backend</b> — <code>backend/.env</code></summary>

```env
OPENAI_API_KEY=
SUPABASE_CONNECTION_STRING="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

NEO4J_URL=
NEO4J_USERNAME=
NEO4J_PASSWORD=
```

</details>

### 4. Run

```bash
# Start Supabase first (Docker Desktop must be running)
npx supabase start

# Start all three services in dev mode
pnpm dev
```

<details>
<summary><b>Run services individually</b></summary>

```bash
# Terminal 1 — memory backend
cd backend && uv run main.py

# Terminal 2 — Next.js backend
cd nextjs-backend && pnpm dev

# Terminal 3 — Electron app
cd frontend && pnpm dev
```

</details>

<details>
<summary><b>Production mode</b></summary>

```bash
pnpm prod

# Or step by step:
pnpm build    # builds frontend + nextjs-backend
pnpm start
```

</details>

<details>
<summary><b>Linux (X11)</b></summary>

The Linux build uses `xdotool` for window activation and synthetic key input, and reads the X11 PRIMARY selection directly for capture, so highlighting text in any X11 app is enough. It is tested on GNOME / X11; Wayland sessions fall back to XWayland.

```bash
sudo apt install xdotool
cd frontend && pnpm install && pnpm dev
```

</details>

<details>
<summary><b>Local build</b></summary>

```bash
cd frontend && pnpm run dist
```

The packaged executable is written to `frontend/dist`.

</details>

Once running:

| Service | URL |
|---|---|
| Supabase API | `http://127.0.0.1:54321` |
| Supabase Studio | `http://localhost:54323` |
| Frontend (Electron) | `http://localhost:3000` |
| Next.js backend | `http://localhost:3001` |
| Memory API | `http://localhost:8000` |

---

## Project Structure

```
tabby/
├── frontend/                   # Electron + Next.js desktop app
│   ├── electron/src/           # Electron main process
│   │   ├── main.ts             # Window management, shortcuts
│   │   ├── shortcuts/          # Global shortcut registration
│   │   └── services/           # Ghost overlay, keystroke listener,
│   │                           #   keyboard monitor, text injection
│   └── src/
│       ├── app/                # Next.js routes (action menu, brain
│       │                       #   panel, settings, ghost overlay)
│       └── components/         # React components
├── nextjs-backend/             # API backend (Next.js)
│   └── src/app/api/            # Chat, completion, inline suggestion,
│                               #   auth, dashboard routes
├── backend/                    # FastAPI memory server
│   └── main.py                 # Mem0 endpoints (vector + graph)
└── supabase/                   # Database migrations & config
```

See [`docs/architecture.md`](docs/architecture.md) for the full system breakdown.

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
