# Tabby - AI Keyboard

An intelligent keyboard layer that transforms your input device into a real-time AI collaborator for coding interviews and beyond.

## What is Tabby?

Tabby is a **system-wide AI assistant** that lives at the point of input. Instead of switching between apps for AI help, it provides:

- **Interview Copilot** - Real-time coding interview assistance with screen capture
- **Context-Aware Autocomplete** - AI suggestions based on what you're typing
- **Desktop Automation** - Full Windows MCP integration for system-level control
- **Persistent Memory** - Remembers your preferences, coding style, and past interactions
- **Invisible Typing** - AI can type directly into any app
- - **Voice Agent** - Voice-to-text and text-to-voice capabilities and live agent

## Core Features

### 1. Interview Copilot (Coding Mode)

| Shortcut      | Action                                                            |
| ------------- | ----------------------------------------------------------------- |
| `Alt+X`       | Capture screen & analyze coding problem                           |
| `Alt+Shift+X` | Update analysis with new constraints                              |
| `Alt+N`       | Get code suggestions/improvements                                 |
| `Ctrl+1-6`    | Switch tabs (Chat, Idea, Code, Walkthrough, Test Cases, Memories) |

**Tabs:**

- **Chat** - Free-form conversation with context
- **Idea** - Problem breakdown, key observations, approach
- **Code** - Clean, commented implementation
- **Walkthrough** - Step-by-step solution explanation
- **Test Cases** - Edge cases with input/output/reason
- **Memories** - Retrieved facts about your preferences

### 2. Action Menu (Quick AI)

| Shortcut    | Action                              |
| ----------- | ----------------------------------- |
| `Ctrl+\`    | Open action menu with selected text |
| `Tab`       | Quick AI chat mode                  |
| `Alt+[Key]` | Trigger specific action             |

**Built-in Actions:**

- Fix Grammar, Shorten, Expand text
- Professional/Casual/Friendly tone
- Email writer
- Custom prompts

### 3. AI Suggestions

| Shortcut     | Action                                |
| ------------ | ------------------------------------- |
| `Ctrl+Space` | Get AI suggestion for current context |

- Shows inline completions based on selected/typed text
- Two modes: Hotkey-triggered or Auto (clipboard watcher)

### 4. Brain Panel (Memory Dashboard)

| Shortcut       | Action             |
| -------------- | ------------------ |
| `Ctrl+Shift+B` | Toggle brain panel |

- View stored memories
- Upload images for visual memory
- Monitor automatic context capture
- Neo4j knowledge graph visualization

### 5. Text Output Modes

- **Paste** — Standard clipboard paste (default)
- **Typewriter** — AI types character-by-character (undetectable)

## Tech Stack

| Layer              | Technology                                 |
| ------------------ | ------------------------------------------ |
| Desktop App        | Electron 38                                |
| Frontend           | Next.js 15, React 19, Tailwind CSS         |
| AI                 | Vercel AI SDK, OpenAI/Groq/Cerebras        |
| Memory             | Mem0 (Supabase vector store + Neo4j graph) |
| Desktop Automation | nut-js, node-window-manager, Windows MCP   |
| Database           | Supabase (PostgreSQL)                      |

### Live Services

- **Next.js Backend:** [tabby-api-psi.vercel.app](https://tabby-api-psi.vercel.app)
- **Python Memory Backend:** [tabby-backend.azurecontainerapps.io](https://tabby-backend.jollydesert-22a4756c.centralindia.azurecontainerapps.io)

## Setup & Installation

### Prerequisites

- Node.js 18+
- Python 3.12+ (for memory backend)
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [pnpm](https://pnpm.io) (for package management)
- [Supabase](https://supabase.com) account (for vector store)
- [Neo4j](https://neo4j.com) instance (for knowledge graph)
- [OpenAI](https://openai.com) API key
- Google Generative AI API key (Optional)
- XAI API key (Optional)
- Groq API key (Optional)
- Cerebras API key (Optional)
- OpenRouter API key (Optional)
- [Tavily](https://tavily.ai/) API key (Web Search)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/CubeStar1/ai-keyboard.git
cd ai-keyboard

# Frontend
cd frontend
pnpm install

# Next.js Backend
cd ../nextjs-backend
pnpm install

# Memory Backend
cd ../backend
uv sync
```

### 2. Database Setup

#### Supabase (PostgreSQL + Vector)

1.  Create a new project at [supabase.com](https://supabase.com).
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Copy the content of [`frontend/src/lib/supabase/migrations/schema.sql`](frontend/src/lib/supabase/migrations/schema.sql) and run it. This will create the necessary tables (`conversations`, `messages`) and functions.
4.  Get your **Project URL** and **anon public key** from Project Settings > API.
5.  Get your **Connection String** (URI) from Project Settings > Database > Connection string > URI.

#### Neo4j (Knowledge Graph)

1.  Create a free instance at [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/).
2.  Save the **Text File** containing your credentials (URI, username, password) when creating the instance.
3.  Note your **Instance ID** and **Instance Name** from the dashboard.

### 3. Environment Variables

Create the environment files from the examples:

```bash
# Frontend
cp frontend/env.example frontend/.env.local

# Next.js Backend
cp nextjs-backend/env.example nextjs-backend/.env

# Backend
cp backend/env.example backend/.env
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

NEXT_PUBLIC_APP_NAME="Tabby"
NEXT_PUBLIC_APP_ICON="/logos/tabby-logo.png"

NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_MEMORY_API_URL="http://localhost:8000"
```

**Next.js Backend** (`nextjs-backend/.env`):

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_ADMIN=""

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

**Backend** (`backend/.env`):

```env
OPENAI_API_KEY=
SUPABASE_CONNECTION_STRING=

NEO4J_URL=
NEO4J_USERNAME=
NEO4J_PASSWORD=
NEO4J_DATABASE=
AURA_INSTANCEID=
AURA_INSTANCENAME=
```

### 4. Run the Application

```bash
# Terminal 1: Start memory backend
cd backend
uv run main.py

# Terminal 2: Start Next.js backend
cd nextjs-backend
npm run dev

# Terminal 3: Start Windows MCP server
cd frontend
npm run windows-mcp

# Terminal 4: Start Electron app
cd frontend
npm run dev
```

The app will start with:

- Frontend app at `http://localhost:3000`
- Next.js Backend at `http://localhost:3001`
- Memory API at `http://localhost:8000`
- Windows MCP at `http://localhost:8001`

### 5. System Tray

The app runs in the system tray. Right-click for:

- Show Actions Menu
- Brain Panel
- Settings
- Quit

## Building & Releasing

### Local Build

To create a local production executable for Windows:

```bash
cd frontend
npm run dist
```

The resulting `.exe` will be in `frontend/dist`.

### GitHub App Releases

Automated Windows app releases are set up using GitHub Actions.

1. **GitHub Secrets**: Add these secrets to your repository settings:
   - `GH_TOKEN`: Your GitHub Personal Access Token (classic) with `repo` scope.
   - All `NEXT_PUBLIC_*` and `SUPABASE_*` variables from your `.env.local`.
2. **Trigger Release**: Run this from the `frontend` directory:
   ```bash
   npm run release
   ```
   This will automatically:

- Grab the version from `package.json`.
- Create a Git tag (e.g., `v0.1.0`).
- Push the tag to GitHub.
- Trigger a GitHub Action to build the Windows `.exe` and create a GitHub Release.

### Python Backend Deployment (Azure)

The Python backend is deployed to **Azure Container Apps** with a fully automated CI/CD pipeline.

- **Workflow:** `.github/workflows/backend-deploy.yml`
- **Trigger:** Any push to the `backend/` directory on the `main` branch.
- **Project URL:** [tabby-backend.azurecontainerapps.io](https://tabby-backend.jollydesert-22a4756c.centralindia.azurecontainerapps.io)
- **Process:**
  1. Builds a Docker image.
  2. Pushes the image to Docker Hub (`thecubestar/tabby-backend`).
  3. Updates the Azure Container App with the new image tag.

### Next.js Backend Deployment (Vercel)

The shared API backend (`nextjs-backend/`) is deployed to **Vercel**

- **Deployment:** Automatic from the `main` branch.
- **Project URL:** [tabby-api-psi.vercel.app](https://tabby-api-psi.vercel.app)

## Project Structure

```
ai-keyboard/
├── frontend/                 # Electron + Next.js app
├── electron/src/         # Electron main process
│   ├── main.ts           # Window management, shortcuts
│   ├── text-handler.ts   # Clipboard, typewriter mode
│   └── context-capture.ts # Periodic screenshot capture
├── src/
│       ├── app/              # Next.js pages
│       ├── components/       # React components
│       │   ├── action-menu/  # Main AI menu, copilot, chat
│       │   ├── brain-panel/  # Memory dashboard
│       │   └── ai-elements/  # Message rendering
├── backend/                  # FastAPI memory server
│   └── main.py               # Mem0 API endpoints
├── nextjs-backend/           # Shared API backend
│   └── src/app/api/          # Shared AI and auth routes
└── PS.md                     # Problem statement
```

## Keyboard Shortcuts Reference

| Shortcut       | Context    | Action                      |
| -------------- | ---------- | --------------------------- |
| `Ctrl+\`       | Global     | Open/close action menu      |
| `Ctrl+Space`   | Global     | Get AI suggestion           |
| `Ctrl+Shift+B` | Global     | Toggle brain panel          |
| `Ctrl+Alt+I`   | Global     | Interview ghost text        |
| `Ctrl+Alt+J`   | Global     | Voice Agent                 |
| `Ctrl+Shift+X` | Global     | Stop Autotyping             |
| `Ctrl+Shift+T` | Global     | Cycle Transcribe modes      |
| `Ctrl+Alt+T`   | Global     | Toggle voice transcription  |
| `Alt+X`        | Copilot    | Analyze coding problem      |
| `Alt+Shift+X`  | Copilot    | Update with new constraints |
| `Alt+N`        | Copilot    | Code suggestions            |
| `Ctrl+1-6`     | Copilot    | Switch tabs                 |
| `Ctrl+Arrow`   | Any window | Move floating window        |
| `Esc`          | Any panel  | Back/close                  |
| `Enter`        | Result     | Accept & paste              |
