import { LRUCache } from 'lru-cache'

export interface SuggestionResult {
  suggestion: string
  // Memory types (e.g. EPISODIC/SEMANTIC/PROCEDURAL) attributed to whatever
  // memory content grounded this suggestion, for pilot logging.
  memoryTypes: string[]
}

export interface KeyboardMonitorConfig {
  debounceMs: number
  minContextLength: number
  onSuggestionReady: (suggestion: string, context: string, memoryTypes: string[]) => void
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
  private displayTimer: NodeJS.Timeout | null = null
  private abortController = new AbortController()
  private cache = new LRUCache<string, SuggestionResult>({ max: 25 })
  private config: KeyboardMonitorConfig
  private currentSuggestion = ''
  private autoTriggerConfig: AutoTriggerConfig = {
    enabled: false,
    delayMs: 3000,
  }

  // Speculative prefetch state
  private pendingSuggestion = ''
  private pendingContext = ''
  private pendingMemoryTypes: string[] = []
  private fetchVersion = 0
  private lastFetchTime = 0
  private prefetchTimer: NodeJS.Timeout | null = null
  private static readonly MIN_FETCH_INTERVAL = 150 // ms between fetches

  constructor(config: KeyboardMonitorConfig) {
    this.config = config
  }

  setAutoTriggerConfig(config: Partial<AutoTriggerConfig>): void {
    this.autoTriggerConfig = { ...this.autoTriggerConfig, ...config }
    console.log('[KeyboardMonitor] Auto-trigger config updated:', this.autoTriggerConfig)

    if (!this.autoTriggerConfig.enabled) {
      this.clearDisplayTimer()
      this.clearPrefetchTimer()
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

    // Speculative prefetch: fetch eagerly, display lazily
    if (this.autoTriggerConfig.enabled && this.buffer.length >= this.config.minContextLength) {
      // Schedule prefetch (with rate limiting)
      this.schedulePrefetch()
      // Reset display timer
      this.resetDisplayTimer()
    }
  }

  private schedulePrefetch(): void {
    this.clearPrefetchTimer()

    const now = Date.now()
    const timeSinceLastFetch = now - this.lastFetchTime

    if (timeSinceLastFetch >= KeyboardMonitor.MIN_FETCH_INTERVAL) {
      // Fetch immediately
      this.prefetchSuggestion()
    } else {
      // Schedule to respect minimum interval
      const delay = KeyboardMonitor.MIN_FETCH_INTERVAL - timeSinceLastFetch
      this.prefetchTimer = setTimeout(() => this.prefetchSuggestion(), delay)
    }
  }

  private clearPrefetchTimer(): void {
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer)
      this.prefetchTimer = null
    }
  }

  private async prefetchSuggestion(): Promise<void> {
    const context = this.buffer

    if (context.length < this.config.minContextLength) {
      return
    }

    // Check cache first
    const cached = this.cache.get(context)
    if (cached) {
      console.log('[KeyboardMonitor] Cache hit for prefetch:', context.slice(-30))
      this.pendingSuggestion = cached.suggestion
      this.pendingContext = context
      this.pendingMemoryTypes = cached.memoryTypes
      return
    }

    // Abort previous request and create new controller
    this.abortController.abort()
    this.abortController = new AbortController()
    const version = ++this.fetchVersion
    this.lastFetchTime = Date.now()

    try {
      console.log('[KeyboardMonitor] Prefetching for:', context.slice(-40))

      const result = await this.config.getSuggestion(context, this.abortController.signal)

      // Only cache if this is still the current fetch version
      if (this.fetchVersion === version && result.suggestion && result.suggestion.length > 0) {
        this.cache.set(context, result)
        this.pendingSuggestion = result.suggestion
        this.pendingContext = context
        this.pendingMemoryTypes = result.memoryTypes
        console.log('[KeyboardMonitor] Prefetch ready:', result.suggestion.slice(0, 30))
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[KeyboardMonitor] Prefetch error:', error)
      }
    }
  }

  private resetDisplayTimer(): void {
    this.clearDisplayTimer()

    this.displayTimer = setTimeout(() => {
      // Show pending suggestion if we have one and context still matches
      if (this.pendingSuggestion && this.buffer === this.pendingContext) {
        console.log('[KeyboardMonitor] Display timer fired, showing cached suggestion')
        this.currentSuggestion = this.pendingSuggestion
        this.config.onSuggestionReady(this.pendingSuggestion, this.pendingContext, this.pendingMemoryTypes)
      } else if (this.pendingSuggestion && this.buffer !== this.pendingContext) {
        // Context changed, try to use cache or wait for prefetch
        const cached = this.cache.get(this.buffer)
        if (cached) {
          this.currentSuggestion = cached.suggestion
          this.config.onSuggestionReady(cached.suggestion, this.buffer, cached.memoryTypes)
        } else {
          console.log('[KeyboardMonitor] No matching suggestion ready, fetching now')
          this.fetchSuggestion()
        }
      } else {
        // No pending suggestion, fetch now
        this.fetchSuggestion()
      }
    }, this.autoTriggerConfig.delayMs)
  }

  private clearDisplayTimer(): void {
    if (this.displayTimer) {
      clearTimeout(this.displayTimer)
      this.displayTimer = null
    }
  }

  setContext(context: string, immediate: boolean = false): void {
    this.buffer = context
    this.config.onBufferUpdate?.(this.buffer)

    this.clearTimerAndAbort()
    this.clearDisplayTimer()
    this.clearPrefetchTimer()

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
      this.config.onSuggestionReady(cached.suggestion, context, cached.memoryTypes)
      return
    }

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
        this.config.onSuggestionReady(result.suggestion, context, result.memoryTypes)
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
    this.pendingSuggestion = ''
    this.pendingContext = ''
    this.pendingMemoryTypes = []
    this.clearDisplayTimer()
    this.clearPrefetchTimer()
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
