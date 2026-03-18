# Tabby AI Keyboard - Linux Port

> **Note:** This is a Linux-only fork of Tabby AI Keyboard. All Windows code has been removed and replaced with Linux implementations.

## What is This?

This is a **complete Linux port** of Tabby, not a cross-platform version. It provides the same features as the Windows version but implemented specifically for Linux.

### Key Differences from Windows Version:

- ✅ **Mistral AI** instead of OpenAI as primary provider (cost-effective)
- ✅ **Linux desktop integration** (X11/Wayland)
- ✅ **Native Linux keyboard hooks**
- ❌ **No Windows MCP** (removed entirely)
- ❌ **No Windows-specific automation**

## Quick Start (Linux)

### Prerequisites
- Ubuntu 22.04+ or Debian-based distribution
- X11 desktop environment (Wayland has limited support)
- Docker (for Supabase)
- Node.js 18+
- Python 3.12+
- pnpm

### Installation

```bash
# 1. Install system dependencies
sudo apt install -y nodejs npm python3.12 python3-pip docker.io \
  libxtst-dev libpng++-dev libxkbcommon-dev

# 2. Install package managers
npm install -g pnpm
curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. Clone this repository
git clone https://github.com/YourUsername/tabby-linux.git
cd tabby-linux

# 4. Checkout Linux branch
git checkout linux-port

# 5. Install dependencies
cd frontend && pnpm install
cd ../nextjs-backend && pnpm install
cd ../backend && uv sync

# 6. Configure environment
cp frontend/env.example frontend/.env.local
cp nextjs-backend/env.example nextjs-backend/.env.local
cp backend/env.example backend/.env

# Edit .env files with your API keys
```

### Get API Keys

1. **Mistral API** (Required): https://console.mistral.ai/
2. **OpenAI API** (For memory only): https://platform.openai.com/

### Run the Application

```bash
# Terminal 1: Supabase
npx supabase start

# Terminal 2: Memory Backend
cd backend && uv run uvicorn main:app --reload --port 8000

# Terminal 3: Next.js Backend
cd nextjs-backend && pnpm dev

# Terminal 4: Electron App
cd frontend && pnpm dev
```

## Features

### Working on Linux
- ✅ AI Chat with Mistral models
- ✅ Global keyboard shortcuts (Ctrl+\\, Ctrl+Space, etc.)
- ✅ Memory system (persistent AI memory)
- ✅ Interview copilot mode
- ✅ Text suggestions
- ✅ Brain panel (memory visualization)
- ✅ Voice transcription

### Not Available (Windows-only)
- ❌ Windows MCP desktop automation
- ❌ Advanced Windows window management
- ⚠️ Some features limited on Wayland (use X11)

## Documentation

- **[LINUX_SETUP.md](LINUX_SETUP.md)** - Detailed Linux setup guide
- **[SETUP_SUMMARY.md](SETUP_SUMMARY.md)** - Quick reference
- **[GIT_WORKFLOW.md](GIT_WORKFLOW.md)** - Contributing guidelines
- **[WINDOWS_CODE_REMOVAL.md](WINDOWS_CODE_REMOVAL.md)** - Windows code removal plan
- **[LINUX_PORT_PLAN.md](LINUX_PORT_PLAN.md)** - Port strategy

## AI Models (Mistral)

| Model | Use Case | Speed | Cost |
|-------|----------|-------|------|
| Mistral Small | General chat (default) | Fast | $ |
| Mistral Large | Complex tasks | Medium | $$ |
| Codestral | Code generation | Fast | $ |
| Pixtral Large | Vision tasks | Medium | $$ |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+\` | Open AI menu |
| `Ctrl+Space` | Get AI suggestion |
| `Ctrl+Shift+B` | Brain panel |
| `Alt+X` | Analyze coding problem |
| `Alt+N` | Get code suggestions |
| `Esc` | Close panel |

## Platform Support

### Tested On
- ✅ Ubuntu 24.04 LTS (Gnome on Xorg)
- ✅ Ubuntu 22.04 LTS
- ⚠️ Pop!_OS (mostly works)
- ⚠️ Linux Mint (mostly works)

### Desktop Environments
- ✅ **Gnome (X11)** - Full support
- ✅ **KDE Plasma** - Full support
- ✅ **XFCE** - Full support
- ⚠️ **Gnome (Wayland)** - Limited support
- ❌ **Other Wayland compositors** - May not work

### Not Tested
- Arch/Manjaro (should work)
- Fedora (should work)
- NixOS (unknown)

## Building

```bash
# Build .deb package
cd frontend
pnpm build
pnpm run electron:dist:deb

# Output: frontend/dist/tabby_VERSION_amd64.deb
```

## Contributing

This is a Linux-focused fork. Contributions should:
- Be Linux-specific or cross-platform (Linux/macOS)
- NOT include Windows code
- Follow Linux conventions
- Test on Ubuntu/Debian

See [GIT_WORKFLOW.md](GIT_WORKFLOW.md) for details.

## Roadmap

- [x] Mistral AI integration
- [x] Basic Linux compatibility
- [ ] Remove all Windows code
- [ ] Optimize for X11
- [ ] Wayland support improvements
- [ ] AppImage distribution
- [ ] Flatpak package
- [ ] AUR package (community)

## Support

- **Issues**: https://github.com/YourUsername/tabby-linux/issues
- **Discussions**: https://github.com/YourUsername/tabby-linux/discussions
- **Original Project**: https://github.com/CubeStar1/ai-keyboard

## License

Same as original Tabby project. See LICENSE file.

## Acknowledgments

- Original Tabby project by CubeStar1
- Mistral AI for the API
- Open source community

---

**This is a community-maintained Linux port. Not officially affiliated with the original Tabby project.**
