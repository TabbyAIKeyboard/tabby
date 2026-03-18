import { tavily, TavilyClient } from '@tavily/core'

let tvly: TavilyClient | null = null

function getTavilyClient(): TavilyClient | null {
  if (tvly) return tvly

  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.warn('[Tavily] No TAVILY_API_KEY set — web search tool is disabled')
    return null
  }

  tvly = tavily({ apiKey })
  return tvly
}

export default getTavilyClient
