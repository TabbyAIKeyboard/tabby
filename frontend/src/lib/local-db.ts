/**
 * Local database API — renderer-side wrapper around Electron IPC.
 * Drop-in replacement for conversations-api.ts
 */

import { Conversation } from "@/lib/ai/types";
import { UIMessage } from "ai";

// Type for the electron API exposed via preload
interface ElectronDB {
  getConversations(type?: string): Promise<any[]>;
  getConversationById(id: string): Promise<any | null>;
  createConversation(data: {
    id: string;
    title: string;
    type?: string;
    userId?: string;
  }): Promise<any>;
  renameConversation(id: string, title: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  getMessages(conversationId: string): Promise<any[]>;
  saveMessages(
    messages: Array<{
      id: string;
      conversation_id: string;
      role: string;
      parts: unknown;
      metadata?: unknown;
    }>
  ): Promise<void>;
}

function getDb(): ElectronDB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron;
  if (!electron?.db) {
    throw new Error("Electron DB API not available — are you running in Electron?");
  }
  return electron.db;
}

// ─── Conversation APIs (same shape as conversations-api.ts) ──────

export async function getConversations(): Promise<Conversation[]> {
  const rows = await getDb().getConversations("chat");
  return rows as Conversation[];
}

export async function getInterviewConversations(): Promise<Conversation[]> {
  const rows = await getDb().getConversations("interview");
  return rows as Conversation[];
}

export async function getPrepConversations(): Promise<Conversation[]> {
  const rows = await getDb().getConversations("prep");
  return rows as Conversation[];
}

export async function getConversationMessages(
  conversationId: string
): Promise<UIMessage[]> {
  const rows = await getDb().getMessages(conversationId);
  return (rows || []).map((msg: any) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: typeof msg.parts === "string" ? JSON.parse(msg.parts) : msg.parts,
    createdAt: new Date(msg.created_at),
    metadata: msg.metadata
      ? typeof msg.metadata === "string"
        ? JSON.parse(msg.metadata)
        : msg.metadata
      : {},
  }));
}

export async function deleteConversation(
  conversationId: string
): Promise<{ success: boolean }> {
  await getDb().deleteConversation(conversationId);
  return { success: true };
}

export async function getChatById(
  conversationId: string
): Promise<Conversation | null> {
  const row = await getDb().getConversationById(conversationId);
  return row ? (row as Conversation) : null;
}

export async function saveChat({
  id,
  title,
  type = "chat",
  userId,
}: {
  id: string;
  title: string;
  type?: string;
  userId?: string;
}): Promise<Conversation | null> {
  const row = await getDb().createConversation({ id, title, type, userId });
  return row as Conversation;
}

export async function saveMessages(
  messages: UIMessage[],
  conversationId: string
): Promise<void> {
  const messagesToSave = messages.map((msg) => ({
    id: msg.id,
    conversation_id: conversationId,
    role: msg.role,
    parts: msg.parts,
    metadata: (msg as any).metadata || null,
  }));
  await getDb().saveMessages(messagesToSave);
}

export async function renameConversation(
  conversationId: string,
  title: string
): Promise<void> {
  await getDb().renameConversation(conversationId, title);
}

/**
 * Generate a simple title from the first user message (local, no LLM).
 * Takes the first ~5 words of the message text.
 */
export function generateLocalTitle(firstUserMessage: UIMessage): string {
  const textPart = firstUserMessage.parts?.find((p) => p.type === "text");
  const text = textPart?.type === "text" ? textPart.text : "";
  if (!text) return "New Chat";

  const words = text.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length > 40 ? words.slice(0, 40) + "…" : words || "New Chat";
}

/**
 * Generate a title via the backend LLM API (richer titles).
 * Falls back to local title generation on error.
 */
export async function generateTitle(
  firstUserMessage: UIMessage,
  model: string
): Promise<string> {
  try {
    const { getApiUrl, getAuthHeaders } = await import("@/lib/api-url");
    const authHeaders = await getAuthHeaders();
    const response = await fetch(getApiUrl("/api/generate-title"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ message: firstUserMessage, model }),
    });
    const data = await response.json();
    return data?.data || generateLocalTitle(firstUserMessage);
  } catch {
    return generateLocalTitle(firstUserMessage);
  }
}
