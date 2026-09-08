import { LRUCache } from 'lru-cache'

export interface SuggestionResult {
  suggestion: string
  // Memory types (e.g. EPISODIC/SEMANTIC/PROCEDURAL) attributed to whatever
  // memory content grounded this suggestion, for pilot logging.
  memoryTypes: string[]
  // The memory text itself, as sent to the model. Logged alongside the types
  // so a completion can be read back against what actually grounded it.
  memories: string[]
}

export interface KeyboardMonitorConfig {
  debounceMs: number
  minContextLength: number
  onSuggestionReady: (context: string, result: SuggestionResult) => void
  onClear: () => void
  onBufferUpdate?: (buffer: string) => void
  getSuggestion: (context: string, signal: AbortSignal) => Promise<SuggestionResult>
}

export interface AutoTriggerConfig {
  enabled: boolean
  delayMs: number // Default 3000ms
}

export class KeyboardMonitor {
  private buffer = ''
  private debounceTimer: NodeJS.Timeout | null = null
  private autoTriggerTimer: NodeJS.Timeout | null = null
  private abortController = new AbortController()
  private cache = new LRUCache<string, SuggestionResult>({ max: 25 })
  private config: KeyboardMonitorConfig
  private currentSuggestion = ''
  private autoTriggerConfig: AutoTriggerConfig = {
    enabled: false,
    delayMs: 3000,
  }

  constructor(config: KeyboardMonitorConfig) {
    this.config = config
  }

  setAutoTriggerConfig(config: Partial<AutoTriggerConfig>): void {
    this.autoTriggerConfig = { ...this.autoTriggerConfig, ...config }
    console.log('[KeyboardMonitor] Auto-trigger config updated:', this.autoTriggerConfig)

    if (!this.autoTriggerConfig.enabled) {
      this.clearAutoTriggerTimer()
    }
  }

  getAutoTriggerConfig(): AutoTriggerConfig {
    return { ...this.autoTriggerConfig }
  }

  appendCharacter(char: string, isBackspace: boolean = false): void {
    // Hide current suggestion when user continues typing
    if (this.currentSuggestion) {
      this.config.onClear()
      this.currentSuggestion = ''
    }

    if (isBackspace) {
      this.buffer = this.buffer.slice(0, -1)
    } else {
      this.buffer += char
    }

    this.config.onBufferUpdate?.(this.buffer)

    // One request per pause in typing: the timer restarts on every keystroke
    // and only the last one survives to fetch.
    if (this.autoTriggerConfig.enabled && this.buffer.length >= this.config.minContextLength) {
      this.resetAutoTriggerTimer()
    }
  }

  // Fires once the user has been idle for the configured delay. Suggestions
  // are fetched here and nowhere else - typing schedules work, it never
  // performs it.
  private resetAutoTriggerTimer(): void {
    this.clearAutoTriggerTimer()
    this.autoTriggerTimer = setTimeout(() => this.fetchSuggestion(), this.autoTriggerConfig.delayMs)
  }

  private clearAutoTriggerTimer(): void {
    if (this.autoTriggerTimer) {
      clearTimeout(this.autoTriggerTimer)
      this.autoTriggerTimer = null
    }
  }

  setContext(context: string, immediate: boolean = false): void {
    this.buffer = context
    this.config.onBufferUpdate?.(this.buffer)

    this.clearTimerAndAbort()
    this.clearAutoTriggerTimer()

    if (this.buffer.length >= this.config.minContextLength) {
      if (immediate) {
        this.fetchSuggestion()
      } else {
        this.debounceTimer = setTimeout(() => this.fetchSuggestion(), this.config.debounceMs)
      }
    }
  }

  async triggerSuggestion(): Promise<void> {
    if (this.buffer.length >= this.config.minContextLength) {
      await this.fetchSuggestion()
    }
  }

  private async fetchSuggestion(): Promise<void> {
    const context = this.buffer

    if (context.length < this.config.minContextLength) {
      return
    }

    // Check cache first
    const cached = this.cache.get(context)
    if (cached) {
      console.log('[KeyboardMonitor] Cache hit for:', context.slice(0, 30))
      this.currentSuggestion = cached.suggestion
      this.config.onSuggestionReady(context, cached)
      return
    }

    // Only the newest request matters; an earlier one still in flight is now
    // answering a stale context.
    this.abortController.abort()
    this.abortController = new AbortController()

    try {
      console.log('[KeyboardMonitor] Fetching suggestion for:', context.slice(0, 50))

      const result = await this.config.getSuggestion(context, this.abortController.signal)

      if (this.buffer !== context) {
        console.log('[KeyboardMonitor] Context changed during fetch, discarding')
        return
      }

      if (result.suggestion && result.suggestion.length > 0) {
        this.cache.set(context, result)
        this.currentSuggestion = result.suggestion
        this.config.onSuggestionReady(context, result)
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[KeyboardMonitor] Request aborted')
      } else {
        console.error('[KeyboardMonitor] Error fetching suggestion:', error)
      }
    }
  }

  private clearTimerAndAbort(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.abortController.abort()
  }

  clearBuffer(): void {
    this.buffer = ''
    this.currentSuggestion = ''
    this.clearAutoTriggerTimer()
    this.config.onBufferUpdate?.('')
  }

  // The LRU cache is keyed only on typed text, so a memory-mode toggle
  // (e.g. the pilot baseline A/B switch) must clear it too, or a suggestion
  // fetched under one condition can be silently served under the other.
  clearCache(): void {
    this.cache.clear()
  }

  getCurrentSuggestion(): string {
    return this.currentSuggestion
  }

  getBuffer(): string {
    return this.buffer
  }

  getCacheSize(): number {
    return this.cache.size
  }
}
