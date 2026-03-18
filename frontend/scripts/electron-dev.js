/**
 * Custom Electron dev script that ensures exactly ONE Electron instance.
 *
 * Problem: tsup --watch + nodemon causes race conditions where multiple
 * Electron instances spawn (tsup cleans output → nodemon sees change →
 * starts Electron before build finishes → tsup finishes → nodemon restarts).
 *
 * Solution: Use chokidar to watch build/main.js for changes, and manage
 * exactly one Electron child process with proper kill-before-restart.
 */
const { spawn } = require('child_process')
const { watch } = require('fs')
const { existsSync } = require('fs')
const path = require('path')

const BUILD_DIR = path.join(__dirname, '..', 'build')
const MAIN_JS = path.join(BUILD_DIR, 'main.js')
const ELECTRON_BIN = path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
const ELECTRON_ARGS = ['.', '--no-sandbox', '--enable-features=WebRTCPipeWireCapturer']

let electronProcess = null
let restartTimeout = null
let isRestarting = false

function killElectron() {
  return new Promise((resolve) => {
    if (!electronProcess) {
      resolve()
      return
    }

    console.log('[electron-dev] Killing Electron (PID:', electronProcess.pid, ')...')

    const proc = electronProcess
    electronProcess = null

    // Kill the process tree
    try {
      process.kill(-proc.pid, 'SIGKILL')
    } catch {
      try {
        proc.kill('SIGKILL')
      } catch {
        // Already dead
      }
    }

    // Give it a moment to die
    setTimeout(resolve, 300)
  })
}

async function startElectron() {
  if (isRestarting) return
  isRestarting = true

  await killElectron()

  if (!existsSync(MAIN_JS)) {
    console.log('[electron-dev] Waiting for build/main.js...')
    isRestarting = false
    return
  }

  console.log('[electron-dev] Starting Electron...')

  electronProcess = spawn(ELECTRON_BIN, ELECTRON_ARGS, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
    detached: true,
  })

  electronProcess.on('exit', (code) => {
    if (electronProcess) {
      console.log('[electron-dev] Electron exited with code:', code)
      electronProcess = null
    }
  })

  electronProcess.on('error', (err) => {
    console.error('[electron-dev] Electron error:', err.message)
    electronProcess = null
  })

  isRestarting = false
}

// Watch the build directory for changes
function watchBuild() {
  console.log('[electron-dev] Watching build/ for changes...')

  // Use fs.watch on the build directory
  const watcher = watch(BUILD_DIR, { recursive: false }, (eventType, filename) => {
    if (filename === 'main.js') {
      // Debounce restarts - wait 800ms for writes to settle
      if (restartTimeout) clearTimeout(restartTimeout)
      restartTimeout = setTimeout(() => {
        console.log('[electron-dev] build/main.js changed, restarting...')
        startElectron()
      }, 800)
    }
  })

  watcher.on('error', (err) => {
    console.error('[electron-dev] Watch error:', err)
  })

  return watcher
}

// Initial start
startElectron()
watchBuild()

// Cleanup on exit
process.on('SIGINT', async () => {
  await killElectron()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await killElectron()
  process.exit(0)
})

process.on('exit', () => {
  if (electronProcess) {
    try {
      process.kill(-electronProcess.pid, 'SIGKILL')
    } catch {
      try { electronProcess.kill('SIGKILL') } catch {}
    }
  }
})
