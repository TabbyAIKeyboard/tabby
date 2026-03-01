import { tool } from 'ai'
import { z } from 'zod/v3'
import { addMemory, searchMemory, getAllMemories, updateMemory, deleteMemory } from './client'

export const addMemoryTool = tool({
  description:
    'Store important information from the conversation as a memory. Use this to remember user preferences, facts, and context for future interactions.',
  inputSchema: z.object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      )
      .describe('The conversation messages to extract memories from.'),
    userId: z.string().describe('The unique identifier for the user.'),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe('Optional metadata to attach to the memory.'),
  }),
  execute: async ({ messages, userId, metadata }) => {
    try {
      const result = await addMemory(messages, userId, metadata)
      return JSON.stringify(result)
    } catch (error) {
      console.error('Error adding memory:', error)
      return JSON.stringify({ error: 'Failed to add memory. Please try again.' })
    }
  },
})

export const searchMemoryTool = tool({
  description:
    'Search through stored memories to find relevant information about the user. Use memoryType filter to search specific categories: LONG_TERM (preferences, identity), SHORT_TERM (current tasks), EPISODIC (past events), SEMANTIC (knowledge), PROCEDURAL (how-to).',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant memories.'),
    userId: z.string().describe('The unique identifier for the user.'),
    limit: z.number().optional().default(10).describe('Maximum number of memories to return.'),
    memoryType: z
      .enum(['LONG_TERM', 'SHORT_TERM', 'EPISODIC', 'SEMANTIC', 'PROCEDURAL'])
      .optional()
      .describe(
        'Filter by memory type. LONG_TERM=preferences/identity, SHORT_TERM=current tasks, EPISODIC=past events, SEMANTIC=knowledge, PROCEDURAL=how-to.'
      ),
  }),
  execute: async ({ query, userId, limit, memoryType }) => {
    try {
      const result = await searchMemory(query, userId, limit, memoryType)
      return JSON.stringify(result)
    } catch (error) {
      console.error('Error searching memory:', error)
      return JSON.stringify({ error: 'Failed to search memories. Please try again.' })
    }
  },
})

export const getAllMemoriesTool = tool({
  description:
    'Retrieve all stored memories for a specific user. Use this to get a complete overview of what is known about the user.',
  inputSchema: z.object({
    userId: z.string().describe('The unique identifier for the user.'),
  }),
  execute: async ({ userId }) => {
    try {
      const result = await getAllMemories(userId)
      return JSON.stringify(result)
    } catch (error) {
      console.error('Error getting all memories:', error)
      return JSON.stringify({ error: 'Failed to get memories. Please try again.' })
    }
  },
})

export const updateMemoryTool = tool({
  description:
    'Update an existing memory with new information. Use this to correct or enhance stored memories.',
  inputSchema: z.object({
    memoryId: z.string().describe('The unique identifier of the memory to update.'),
    data: z.string().describe('The new content for the memory.'),
  }),
  execute: async ({ memoryId, data }) => {
    try {
      const result = await updateMemory(memoryId, data)
      return JSON.stringify(result)
    } catch (error) {
      console.error('Error updating memory:', error)
      return JSON.stringify({ error: 'Failed to update memory. Please try again.' })
    }
  },
})

export const deleteMemoryTool = tool({
  description:
    'Delete a specific memory by its ID. Use this when a user wants to remove stored information.',
  inputSchema: z.object({
    memoryId: z.string().describe('The unique identifier of the memory to delete.'),
  }),
  execute: async ({ memoryId }) => {
    try {
      const result = await deleteMemory(memoryId)
      return JSON.stringify(result)
    } catch (error) {
      console.error('Error deleting memory:', error)
      return JSON.stringify({ error: 'Failed to delete memory. Please try again.' })
    }
  },
})
