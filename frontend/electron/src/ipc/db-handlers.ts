import { ipcMain } from "electron";
import {
  getConversations,
  getConversationById,
  createConversation,
  renameConversation,
  deleteConversation,
  getMessages,
  saveMessages,
} from "../services/local-db";

export function registerDbHandlers(): void {
  // ─── Conversations ──────────────────────────────────────────

  ipcMain.handle("db:getConversations", (_event, type?: string) => {
    return getConversations(type);
  });

  ipcMain.handle("db:getConversationById", (_event, id: string) => {
    return getConversationById(id) || null;
  });

  ipcMain.handle(
    "db:createConversation",
    (
      _event,
      data: { id: string; title: string; type?: string; userId?: string }
    ) => {
      return createConversation(data);
    }
  );

  ipcMain.handle(
    "db:renameConversation",
    (_event, id: string, title: string) => {
      renameConversation(id, title);
    }
  );

  ipcMain.handle("db:deleteConversation", (_event, id: string) => {
    deleteConversation(id);
  });

  // ─── Messages ───────────────────────────────────────────────

  ipcMain.handle("db:getMessages", (_event, conversationId: string) => {
    return getMessages(conversationId);
  });

  ipcMain.handle(
    "db:saveMessages",
    (
      _event,
      messages: Array<{
        id: string;
        conversation_id: string;
        role: string;
        parts: unknown;
        metadata?: unknown;
      }>
    ) => {
      saveMessages(messages);
    }
  );

  console.log("[IPC] Database handlers registered");
}
