import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库文件路径
const dataDir = join(__dirname, "..", "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, "daxia.db");
const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  -- 对话表
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '新对话',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 消息表
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    qr_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
`);

// 预编译语句
const stmts = {
  // 对话相关
  createConversation: db.prepare(
    "INSERT INTO conversations (title) VALUES (?)",
  ),
  getConversation: db.prepare("SELECT * FROM conversations WHERE id = ?"),
  listConversations: db.prepare(
    "SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?",
  ),
  updateConversationTitle: db.prepare(
    "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ),
  updateConversationTime: db.prepare(
    "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ),
  deleteConversation: db.prepare("DELETE FROM conversations WHERE id = ?"),

  // 消息相关
  addMessage: db.prepare(
    "INSERT INTO messages (conversation_id, role, content, qr_code) VALUES (?, ?, ?, ?)",
  ),
  getMessages: db.prepare(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
  ),
  clearMessages: db.prepare("DELETE FROM messages WHERE conversation_id = ?"),
};

// 对话操作
export const ConversationModel = {
  create(title: string = "新对话"): {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
  } {
    const result = stmts.createConversation.run(title);
    return ConversationModel.getById(result.lastInsertRowid as number)!;
  },

  getById(
    id: number,
  ):
    | { id: number; title: string; created_at: string; updated_at: string }
    | undefined {
    return stmts.getConversation.get(id) as any;
  },

  list(
    limit: number = 20,
  ): Array<{
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
  }> {
    return stmts.listConversations.all(limit) as any[];
  },

  updateTitle(id: number, title: string): void {
    stmts.updateConversationTitle.run(title, id);
  },

  touch(id: number): void {
    stmts.updateConversationTime.run(id);
  },

  delete(id: number): void {
    stmts.deleteConversation.run(id);
  },
};

// 消息操作
export const MessageModel = {
  add(
    conversationId: number,
    role: "user" | "assistant",
    content: string,
    qrCode?: string,
  ): {
    id: number;
    conversation_id: number;
    role: string;
    content: string;
    qr_code?: string;
    created_at: string;
  } {
    const result = stmts.addMessage.run(
      conversationId,
      role,
      content,
      qrCode || null,
    );
    ConversationModel.touch(conversationId);
    return MessageModel.getById(result.lastInsertRowid as number)!;
  },

  getById(
    id: number,
  ):
    | {
        id: number;
        conversation_id: number;
        role: string;
        content: string;
        qr_code?: string;
        created_at: string;
      }
    | undefined {
    return db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as any;
  },

  getByConversation(
    conversationId: number,
  ): Array<{
    id: number;
    conversation_id: number;
    role: string;
    content: string;
    qr_code?: string;
    created_at: string;
  }> {
    return stmts.getMessages.all(conversationId) as any[];
  },

  clear(conversationId: number): void {
    stmts.clearMessages.run(conversationId);
  },
};

// 初始化默认对话
const defaultConv = ConversationModel.getById(1);
if (!defaultConv) {
  ConversationModel.create("新对话");
}

export { db };
