import { ipcMain } from 'electron'
import {
  getConversations,
  getConversationById,
  createConversation,
  renameConversation,
  deleteConversation,
  getMessages,
  saveMessages,
  getSuggestionLogEntries,
  getSuggestionLogRowCount,
  getSuggestionLogStats,
  getSuggestionLogUsers,
  clearSuggestionLog,
} from '../services/local-db'
import { getSuggestionLogPath } from '../services/suggestion-logger'

export function registerDbHandlers(): void {
  // ─── Conversations ──────────────────────────────────────────

  ipcMain.handle('db:getConversations', (_event, type?: string) => {
    return getConversations(type)
  })

  ipcMain.handle('db:getConversationById', (_event, id: string) => {
    return getConversationById(id) || null
  })

  ipcMain.handle(
    'db:createConversation',
    (_event, data: { id: string; title: string; type?: string; userId?: string }) => {
      return createConversation(data)
    }
  )

  ipcMain.handle('db:renameConversation', (_event, id: string, title: string) => {
    renameConversation(id, title)
  })

  ipcMain.handle('db:deleteConversation', (_event, id: string) => {
    deleteConversation(id)
  })

  // ─── Messages ───────────────────────────────────────────────

  ipcMain.handle('db:getMessages', (_event, conversationId: string) => {
    return getMessages(conversationId)
  })

  ipcMain.handle(
    'db:saveMessages',
    (
      _event,
      messages: Array<{
        id: string
        conversation_id: string
        role: string
        parts: unknown
        metadata?: unknown
      }>
    ) => {
      saveMessages(messages)
    }
  )

  // ─── Suggestion Log (pilot instrumentation) ─────────────────
  // Every read takes an optional userId: the Settings > Suggestions tab scopes
  // its figures to one participant, or pools all of them when it is omitted.

  ipcMain.handle(
    'db:getSuggestionLogEntries',
    (_event, options?: { limit?: number; offset?: number; userId?: string | null }) => {
      return getSuggestionLogEntries(options)
    }
  )

  ipcMain.handle('db:getSuggestionLogCount', (_event, userId?: string | null) => {
    return getSuggestionLogRowCount(userId)
  })

  ipcMain.handle('db:getSuggestionLogStats', (_event, userId?: string | null) => {
    return getSuggestionLogStats(userId)
  })

  ipcMain.handle('db:getSuggestionLogUsers', () => {
    return getSuggestionLogUsers()
  })

  ipcMain.handle('db:getSuggestionLogPath', () => {
    return getSuggestionLogPath()
  })

  ipcMain.handle('db:clearSuggestionLog', (_event, userId?: string | null) => {
    clearSuggestionLog(userId)
  })

  console.log('[IPC] Database handlers registered')
}
