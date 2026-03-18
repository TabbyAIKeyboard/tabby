import { tool } from 'ai'
import { z } from 'zod/v3'
import getTavilyClient from '@/lib/ai/tavily/client'

export const tavilySearchTool = tool({
  description: 'Search the web using Tavily for up-to-date information, news, and research.',
  inputSchema: z.object({
    query: z.string().describe('The search query to use.'),
  }),
  execute: async ({ query }) => {
    try {
      const tvly = getTavilyClient()
      if (!tvly) {
        return JSON.stringify({ error: 'Web search is not available — TAVILY_API_KEY is not configured.' })
      }
      const searchResult = await tvly.search(query, {
        includeAnswer: true,
        maxResults: 5,
        includeRawContent: false,
        includeImages: true,
      })
      return JSON.stringify(searchResult)
    } catch (error) {
      console.error('Error searching with Tavily:', error)
      return JSON.stringify({ error: 'Failed to perform search. Please try again.' })
    }
  },
})
