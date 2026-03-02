import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";

let db: Database.Database | null = null;

/**
 * Get or initialize the SQLite database.
 * Creates tables if they don't exist.
 */
export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath("userData"), "tabby.db");
  console.log("[LocalDB] Opening database at:", dbPath);

  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL DEFAULT 'New Chat',
      type TEXT NOT NULL DEFAULT 'chat',
      lastContext TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      parts TEXT NOT NULL DEFAULT '[]',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
  `);

  console.log("[LocalDB] Database initialized successfully");
  return db;
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("[LocalDB] Database closed");
  }
}

// ─── Conversation CRUD ───────────────────────────────────────────

export interface ConversationRow {
  id: string;
  user_id: string | null;
  title: string;
  type: string;
  lastContext: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  parts: string; // JSON string
  metadata: string | null; // JSON string
  created_at: string;
}

export function getConversations(type?: string): ConversationRow[] {
  const database = getDatabase();
  if (type) {
    return database
      .prepare(
        "SELECT * FROM conversations WHERE type = ? ORDER BY updated_at DESC"
      )
      .all(type) as ConversationRow[];
  }
  return database
    .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
    .all() as ConversationRow[];
}

export function getConversationById(
  id: string
): ConversationRow | undefined {
  const database = getDatabase();
  return database
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(id) as ConversationRow | undefined;
}

export function createConversation(conversation: {
  id: string;
  title: string;
  type?: string;
  userId?: string;
}): ConversationRow {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO conversations (id, user_id, title, type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      conversation.id,
      conversation.userId || null,
      conversation.title,
      conversation.type || "chat",
      now,
      now
    );
  return getConversationById(conversation.id)!;
}

export function renameConversation(id: string, title: string): void {
  const database = getDatabase();
  database
    .prepare(
      "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?"
    )
    .run(title, new Date().toISOString(), id);
}

export function deleteConversation(id: string): void {
  const database = getDatabase();
  // Messages are cascade-deleted via FK
  database.prepare("DELETE FROM conversations WHERE id = ?").run(id);
}

// ─── Message CRUD ────────────────────────────────────────────────

export function getMessages(conversationId: string): MessageRow[] {
  const database = getDatabase();
  return database
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(conversationId) as MessageRow[];
}

export function saveMessages(
  messages: Array<{
    id: string;
    conversation_id: string;
    role: string;
    parts: unknown;
    metadata?: unknown;
  }>
): void {
  const database = getDatabase();
  const upsert = database.prepare(
    `INSERT INTO messages (id, conversation_id, role, parts, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       parts = excluded.parts,
       metadata = excluded.metadata`
  );

  const now = new Date().toISOString();
  const transaction = database.transaction(() => {
    for (const msg of messages) {
      upsert.run(
        msg.id,
        msg.conversation_id,
        msg.role,
        JSON.stringify(msg.parts),
        msg.metadata ? JSON.stringify(msg.metadata) : null,
        now
      );
    }
  });
  transaction();

  // Update conversation timestamp
  if (messages.length > 0) {
    database
      .prepare(
        "UPDATE conversations SET updated_at = ? WHERE id = ?"
      )
      .run(now, messages[0].conversation_id);
  }
}
