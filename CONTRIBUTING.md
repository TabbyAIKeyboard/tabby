# Contributing to Tabby

First off, thank you for considering contributing to Tabby! It's people like you that make Tabby such a great tool.

This document covers the contribution workflow, coding guidelines, and local development setup.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Contribution](#your-first-contribution)
- [Development Workflow](#development-workflow)
  - [Fork & Branch](#fork--branch)
  - [Commit Messages](#commit-messages)
  - [Pull Requests](#pull-requests)
- [Local Development Setup](#local-development-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)

---

## How to Contribute

### Reporting Bugs

If you find a bug in the source code, you can help us by [submitting an issue](https://github.com/TabbyAIKeyboard/tabby/issues/new) to our GitHub repository. Please include:

- A clear, descriptive title
- Steps to reproduce the behavior
- Expected vs. actual behavior
- Screenshots or logs, if applicable
- Your OS version and Node.js version

Even better, you can submit a Pull Request with a fix!

### Suggesting Enhancements

If you have an idea for a feature or an enhancement, please [open an issue](https://github.com/TabbyAIKeyboard/tabby/issues/new) explaining your idea. Describe the use case and why it would be valuable to other users.

### Your First Contribution

Not sure where to start? Look for issues tagged with [`good first issue`](https://github.com/TabbyAIKeyboard/tabby/labels/good%20first%20issue) - these are scoped for newcomers to the codebase.

---

## Development Workflow

### Fork & Branch

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/tabby.git
   cd tabby
   ```
3. **Add the upstream remote** so you can keep your fork in sync:
   ```bash
   git remote add upstream https://github.com/TabbyAIKeyboard/tabby.git
   ```
4. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use a descriptive branch name. Prefix it based on the type of change:
   | Prefix | Use for |
   |---|---|
   | `feature/` | New features |
   | `fix/` | Bug fixes |
   | `docs/` | Documentation changes |
   | `refactor/` | Code refactoring |

5. **Keep your branch up to date** with upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Each commit message should follow this format:

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**

| Type | Description |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. (no code change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, CI, or tooling changes |

**Examples:**

```
feat(copilot): add multi-language support for code analysis
fix(voice-agent): resolve audio cutoff on long responses
docs(readme): update installation instructions
```

### Pull Requests

When your changes are ready:

1. **Test your changes locally** - make sure the app builds and runs correctly.
2. **Push** your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Open a Pull Request** against the `main` branch of `TabbyAIKeyboard/tabby`.
4. In the PR description:
   - Summarize what you changed and why
   - Reference any related issues (e.g., `Closes #42`)
   - Include screenshots for UI changes
5. A maintainer will review your PR. Be prepared to make revisions based on feedback.

> **Note:** The project uses Husky and lint-staged for pre-commit hooks. Formatting and type checks run automatically on staged files when you commit.

---

## Local Development Setup

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18+ | |
| Python | 3.12+ | For memory backend |
| [uv](https://github.com/astral-sh/uv) | Latest | Python package manager |
| [pnpm](https://pnpm.io) | Latest | JavaScript package manager |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | For local Supabase |
| [OpenAI](https://openai.com) API key | — | Required |

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

### Installation

```bash
git clone https://github.com/<your-username>/tabby.git
cd tabby
pnpm install           # Root dependencies (Husky, lint-staged)

# Frontend
cd frontend && pnpm install

# Next.js Backend
cd ../nextjs-backend && pnpm install

# Memory Backend
cd ../backend && uv sync
```

### Database Setup

We use a **local Supabase instance** running in Docker.

1. **Start Docker Desktop** and wait for it to fully initialize.
2. **Initialize Supabase** in the project root (first time only):
   ```bash
   npx supabase init
   ```
3. **Start local Supabase:**
   ```bash
   npx supabase start
   ```
   The first run will pull ~13 Docker images (takes a few minutes). Subsequent starts take ~10 seconds.
4. When completed, it prints all credentials. Note the **API URL**, **anon key**, and **service_role key**.
5. The database schema is auto-applied from `supabase/migrations/`.

<details>
<summary><b>Create storage buckets (one-time setup)</b></summary>

```powershell
# PowerShell
$headers = @{
  "apikey"        = "<SERVICE_ROLE_KEY from step 4>"
  "Authorization" = "Bearer <SERVICE_ROLE_KEY from step 4>"
  "Content-Type"  = "application/json"
}
Invoke-RestMethod -Uri "http://127.0.0.1:54321/storage/v1/bucket" `
  -Method Post -Headers $headers `
  -Body '{"id":"context-captures","name":"context-captures","public":true}'
Invoke-RestMethod -Uri "http://127.0.0.1:54321/storage/v1/bucket" `
  -Method Post -Headers $headers `
  -Body '{"id":"project-assets","name":"project-assets","public":true}'
```

Or create them manually via **Supabase Studio** at `http://localhost:54323` → Storage.

</details>

<details>
<summary><b>Supabase Quick Reference</b></summary>

| Action | Command |
|---|---|
| Start | `npx supabase start` |
| Stop | `npx supabase stop` |
| Status | `npx supabase status` |
| Admin UI | `http://localhost:54323` |
| Reset DB | `npx supabase db reset` |

> **Note:** Docker Desktop must be running before `npx supabase start`.

</details>

<details>
<summary><b>Neo4j (Knowledge Graph -- Optional)</b></summary>

1. Create a free instance at [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/).
2. Save the **Text File** containing your credentials (URI, username, password) when creating the instance.
3. Note your **Instance ID** and **Instance Name** from the dashboard.

</details>

### Environment Variables

Copy the example env files, then fill in the Supabase credentials from `npx supabase status`:

```bash
cp frontend/env.example frontend/.env.local
cp nextjs-backend/env.example nextjs-backend/.env.local
cp backend/env.example backend/.env
```

<details>
<summary><b>Frontend</b> -- <code>frontend/.env.local</code></summary>

```env
# Supabase (local Docker) -- get values from `npx supabase status`
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
<summary><b>Next.js Backend</b> -- <code>nextjs-backend/.env.local</code></summary>

```env
# Supabase (local Docker) -- same keys as frontend
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
<summary><b>Backend</b> -- <code>backend/.env</code></summary>

```env
OPENAI_API_KEY=
# Local Supabase PostgreSQL -- get DB_URL from `npx supabase status`
SUPABASE_CONNECTION_STRING="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Neo4j (optional)
NEO4J_URL=
NEO4J_USERNAME=
NEO4J_PASSWORD=
```

</details>

### Running the App

```bash
# Terminal 0: Start local Supabase (Docker Desktop must be running)
npx supabase start

# Terminal 1: Start memory backend
cd backend && uv run main.py

# Terminal 2: Start Next.js backend
cd nextjs-backend && pnpm dev

# Terminal 3: Start Windows MCP server (optional)
cd frontend && pnpm run windows-mcp

# Terminal 4: Start Electron app
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

### System Tray

The app runs in the system tray. Right-click for:

- Show Actions Menu
- Brain Panel
- Settings
- Quit

---

Thank you for helping make Tabby better!
