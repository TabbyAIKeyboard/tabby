export type ActionType =
  | 'fix-grammar'
  | 'shorten'
  | 'expand'
  | 'professional-tone'
  | 'casual-tone'
  | 'friendly-tone'
  | 'email-writer'
  | 'custom'
  | 'chat'
  | string

export type ActionGroup = 'agent' | 'action'

export interface Action {
  id: ActionType
  label: string
  icon: string
  description?: string
  prompt?: string
  shortcut?: string
  isDefault?: boolean
  group?: ActionGroup
}

import { LanguageModelUsage } from 'ai'

export type AppUsage = LanguageModelUsage & {
  modelId?: string
  context?: {
    totalMax?: number
    combinedMax?: number
    inputMax?: number
  }
  costUSD?: {
    inputUSD?: number
    outputUSD?: number
    reasoningUSD?: number
    cacheReadUSD?: number
    totalUSD?: number
  }
}

export interface TelemetryMetadata {
  timeToFirstToken: number | null
  tokensPerSecond: number
  duration: number
  usage?: LanguageModelUsage
  model?: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  updated_at: string
  created_at: string
  lastContext?: AppUsage
  type?: 'chat' | string
}

export interface Message {
  id: string
  role: string
  parts: unknown[]
  created_at: string
  metadata?: TelemetryMetadata
}

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  raw_content?: string
}

export interface TavilySearchResponse {
  answer?: string
  query: string
  response_time: number
  results: TavilySearchResult[]
  images?: { url: string; description: string }[]
}
