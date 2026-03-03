# Contributing to Tabby

First off, thank you for considering contributing to Tabby! It's people like you that make Tabby such a great tool.

Below you'll find the process and guidelines for contributing to this repository.

## 1. How to Contribute

### Reporting Bugs
If you find a bug in the source code, you can help us by submitting an issue to our GitHub Repository. Even better, you can submit a Pull Request with a fix.

### Suggesting Enhancements
If you have an idea for a feature or an enhancement, please submit an issue explaining your idea.

### Pull Requests
- Ensure you have tested your changes locally.
- Follow the coding standards of the project (e.g., formatting).
- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for your commit messages.
- Open your pull request against the `main` branch.

## 2. Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.12+ (for memory backend)
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [pnpm](https://pnpm.io) (for package management)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Supabase)
- [OpenAI](https://openai.com) API key
- Google Generative AI API key (Optional)
- XAI API key (Optional)
- Groq API key (Optional)
- Cerebras API key (Optional)
- OpenRouter API key (Optional)
- [Tavily](https://tavily.ai/) API key (Web Search)
- [Neo4j](https://neo4j.com) instance (Optional, for knowledge graph)

### Installation Steps

#### 1. Clone & Install Dependencies
    ```bash
    git clone https://github.com/TabbyAIKeyboard/tabby.git
    cd tabby
    pnpm install # Installs root dependencies (Husky, lint-staged)

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

#### 2. Database Setup (Local Supabase via Docker)
1.  **Start Docker Desktop** and wait for it to fully initialize.
2.  **Initialize Supabase** in the project root:
    ```bash
    npx supabase init    # Only needed the first time
    ```
3.  **Start local Supabase:**
    ```bash
    npx supabase start
    ```
    The first run will pull ~13 Docker images (takes a few minutes). Subsequent starts take ~10 seconds.
4.  When completed, it prints all credentials. Note the **API URL**, **anon key**, and **service_role key**.
5.  The database schema is auto-applied from `supabase/migrations/`.
6.  **Create storage buckets** (one-time setup):
    ```powershell
    # PowerShell — create the two required storage buckets
    $headers = @{
    "apikey" = "<SERVICE_ROLE_KEY from step 4>"
    "Authorization" = "Bearer <SERVICE_ROLE_KEY from step 4>"
    "Content-Type" = "application/json"
    }
    Invoke-RestMethod -Uri "http://127.0.0.1:54321/storage/v1/bucket" -Method Post -Headers $headers -Body '{"id":"context-captures","name":"context-captures","public":true}'
    Invoke-RestMethod -Uri "http://127.0.0.1:54321/storage/v1/bucket" -Method Post -Headers $headers -Body '{"id":"project-assets","name":"project-assets","public":true}'
    ```
    Or create them manually via **Supabase Studio** at `http://localhost:54323` → Storage.

#### Supabase Quick Reference

| Action | Command |
| --- | --- |
| Start | `npx supabase start` |
| Stop | `npx supabase stop` |
| Status | `npx supabase status` |
| Admin UI | `http://localhost:54323` |
| Reset DB | `npx supabase db reset` |

> **Note:** Docker Desktop must be running before `npx supabase start`.

#### Neo4j (Knowledge Graph — Optional)

1.  Create a free instance at [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/).
2.  Save the **Text File** containing your credentials (URI, username, password) when creating the instance.
3.  Note your **Instance ID** and **Instance Name** from the dashboard.

#### 3. Environment Variables

Create the environment files from the examples, then fill in the Supabase credentials from `npx supabase status`:

```bash
# Frontend
cp frontend/env.example frontend/.env.local

# Next.js Backend
cp nextjs-backend/env.example nextjs-backend/.env.local

# Backend
cp backend/env.example backend/.env
```

**Frontend** (`frontend/.env.local`):

```env
# Supabase (local Docker) — get values from `npx supabase status`
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON_KEY from supabase status>"
SUPABASE_ADMIN="<SERVICE_ROLE_KEY from supabase status>"

NEXT_PUBLIC_APP_NAME="Tabby"
NEXT_PUBLIC_APP_ICON="/logos/tabby-logo.png"

NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_MEMORY_API_URL="http://localhost:8000"
```

**Next.js Backend** (`nextjs-backend/.env.local`):

```env
# Supabase (local Docker) — same keys as frontend
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

**Backend** (`backend/.env`):

```env
OPENAI_API_KEY=
# Local Supabase PostgreSQL — get DB_URL from `npx supabase status`
SUPABASE_CONNECTION_STRING="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Neo4j (optional)
NEO4J_URL=
NEO4J_USERNAME=
NEO4J_PASSWORD=
```

#### 4. Run the Application

```bash
# Terminal 0: Start local Supabase (Docker Desktop must be running)
npx supabase start

# Terminal 1: Start memory backend
cd backend
uv run main.py

# Terminal 2: Start Next.js backend
cd nextjs-backend
pnpm dev

# Terminal 3: Start Windows MCP server (optional)
cd frontend
pnpm run windows-mcp

# Terminal 4: Start Electron app
cd frontend
pnpm dev
```

The app will start with:

- Supabase at `http://127.0.0.1:54321` (Studio at `:54323`)
- Frontend app at `http://localhost:3000`
- Next.js Backend at `http://localhost:3001`
- Memory API at `http://localhost:8000`
- Windows MCP at `http://localhost:8001` (optional)

#### 5. System Tray

The app runs in the system tray. Right-click for:

- Show Actions Menu
- Brain Panel
- Settings
- Quit
