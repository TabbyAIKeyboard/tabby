import { desktopCapturer } from 'electron';
import { AppState } from '../app-state';
import { getApiUrl } from '../utils/api-url';

export interface InterviewGhostConfig {
  onSuggestionReady: (code: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

export class InterviewGhostService {
  private abortController: AbortController | null = null;
  private config: InterviewGhostConfig;
  private isProcessing = false;

  constructor(config: InterviewGhostConfig) {
    this.config = config;
  }

  async triggerSuggestion(): Promise<string | null> {
    if (this.isProcessing) {
      console.log('[InterviewGhost] Already processing, ignoring trigger');
      return null;
    }

    this.isProcessing = true;
    this.config.onLoading(true);

    try {
      // Abort any previous request
      this.abort();
      this.abortController = new AbortController();

      // Capture screenshot
      console.log('[InterviewGhost] Capturing screenshot...');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      const screenshot = sources[0].thumbnail.toDataURL();
      console.log('[InterviewGhost] Screenshot captured, calling API...');

      // Call the API
      const response = await fetch(getApiUrl('/api/interview-ghost-suggest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshot,
          userId: AppState.currentUserId,
          cachedMemories: AppState.cachedMemories,
          model: AppState.defaultFastModel || AppState.defaultModel,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }

      const data = await response.json();
      const code = data.code;

      if (!code || code.length === 0) {
        throw new Error('No code generated');
      }

      console.log('[InterviewGhost] Code received:', code.slice(0, 50), '... (', data.latency, 'ms)');
      
      this.config.onLoading(false);
      this.config.onSuggestionReady(code);
      
      return code;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[InterviewGhost] Request aborted');
      } else {
        console.error('[InterviewGhost] Error:', error);
        this.config.onError((error as Error).message);
      }
      this.config.onLoading(false);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isActive(): boolean {
    return this.isProcessing;
  }
}
