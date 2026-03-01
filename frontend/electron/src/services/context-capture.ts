import { desktopCapturer, powerMonitor, BrowserWindow } from 'electron'

export interface CaptureConfig {
  enabled: boolean
  intervalMs: number
  idleThresholdMs: number
}

const DEFAULT_CONFIG: CaptureConfig = {
  enabled: false,
  intervalMs: 60000,
  idleThresholdMs: 60000,
}

export class ContextCaptureService {
  private config: CaptureConfig
  private captureTimer: NodeJS.Timeout | null = null
  private onMemoryStoredCallback: ((memory: string) => void) | null = null
  private rendererWindow: BrowserWindow | null = null

  constructor(config: Partial<CaptureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  setRendererWindow(window: BrowserWindow) {
    this.rendererWindow = window
  }

  onMemoryStored(callback: (memory: string) => void) {
    this.onMemoryStoredCallback = callback
  }

  start() {
    if (!this.config.enabled) return

    console.log('[ContextCapture] Starting...')
    console.log('[ContextCapture] Interval:', this.config.intervalMs, 'ms')
    console.log('[ContextCapture] Idle threshold:', this.config.idleThresholdMs / 1000, 's')

    this.captureAndAnalyze()

    this.captureTimer = setInterval(() => {
      const idleSeconds = powerMonitor.getSystemIdleTime()
      const isIdle = idleSeconds * 1000 > this.config.idleThresholdMs
      console.log('[ContextCapture] Tick - system idle:', idleSeconds, 's, skipping:', isIdle)
      if (!isIdle) {
        this.captureAndAnalyze()
      }
    }, this.config.intervalMs)
  }

  stop() {
    console.log('[ContextCapture] Stopping...')
    if (this.captureTimer) clearInterval(this.captureTimer)
    this.captureTimer = null
  }

  async captureAndAnalyze(): Promise<void> {
    if (!this.rendererWindow || this.rendererWindow.isDestroyed()) {
      console.log('[ContextCapture] No renderer window, skipping')
      return
    }

    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      })

      if (sources.length === 0) {
        console.log('[ContextCapture] No screen sources found')
        return
      }

      const screenshot = sources[0].thumbnail.toDataURL()
      console.log('[ContextCapture] Captured screenshot, sending to renderer...')

      this.rendererWindow.webContents.send('analyze-screenshot', {
        dataUrl: screenshot,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[ContextCapture] Capture failed:', error)
    }
  }

  updateConfig(config: Partial<CaptureConfig>) {
    const wasEnabled = this.config.enabled
    this.config = { ...this.config, ...config }

    if (this.config.enabled && !wasEnabled) {
      this.start()
    } else if (!this.config.enabled && wasEnabled) {
      this.stop()
    }
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  getConfig(): CaptureConfig {
    return { ...this.config }
  }
}
