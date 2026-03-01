import axios from 'axios'

const MEMORY_API_URL = process.env.MEMORY_API_URL || 'http://localhost:8000'

export const memoryClient = axios.create({
  baseURL: MEMORY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface MemoryResult {
  id: string
  memory: string
  user_id: string
  categories?: string[]
  created_at: string
  score?: number
}

export async function addMemory(
  messages: Message[],
  userId: string,
  metadata?: Record<string, unknown>
) {
  const response = await memoryClient.post('/memory/add', {
    messages,
    user_id: userId,
    metadata,
  })
  return response.data
}

export async function searchMemory(
  query: string,
  userId: string,
  limit = 10,
  memoryType?: 'LONG_TERM' | 'SHORT_TERM' | 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL'
) {
  const response = await memoryClient.post('/memory/search', {
    query,
    user_id: userId,
    limit,
    memory_type: memoryType,
  })
  return response.data
}

export async function getAllMemories(
  userId: string,
  memoryType?: 'LONG_TERM' | 'SHORT_TERM' | 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL'
) {
  const response = await memoryClient.post('/memory/get_all', {
    user_id: userId,
    memory_type: memoryType,
  })
  return response.data
}

export async function getMemory(memoryId: string) {
  const response = await memoryClient.get(`/memory/${memoryId}`)
  return response.data
}

export async function updateMemory(memoryId: string, data: string) {
  const response = await memoryClient.put('/memory/update', {
    memory_id: memoryId,
    data,
  })
  return response.data
}

export async function deleteMemory(memoryId: string) {
  const response = await memoryClient.delete(`/memory/${memoryId}`)
  return response.data
}

export async function deleteAllUserMemories(userId: string) {
  const response = await memoryClient.delete(`/memory/user/${userId}`)
  return response.data
}

export async function getMemoryHistory(memoryId: string) {
  const response = await memoryClient.get(`/memory/history/${memoryId}`)
  return response.data
}
