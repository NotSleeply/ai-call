import BetterSqlite3 from "better-sqlite3";
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

const createDatabase = (filePath: string): BetterSqlite3.Database => {
  try {
    return new BetterSqlite3(filePath);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Could not locate the bindings file")
    ) {
      const helpMessage = [
        "better-sqlite3 原生绑定未找到，数据库无法启动。",
        "请在项目根目录执行以下命令后重试：",
        "1) pnpm install",
        "2) pnpm rebuild better-sqlite3",
        "如果仍失败，请确认 package.json 包含:",
        '"pnpm": { "onlyBuiltDependencies": ["better-sqlite3"] }',
      ].join("\n");

      throw new Error(helpMessage, { cause: error });
    }

    throw error;
  }
};

const db: BetterSqlite3.Database = createDatabase(dbPath);

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

  list(limit: number = 20): Array<{
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

  getById(id: number):
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

  getByConversation(conversationId: number): Array<{
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

// 兼容旧版 CLI 调用方式（Database.getInstance）
class AppDatabase {
  getConversations(): Array<{
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
  }> {
    return ConversationModel.list();
  }

  createConversation(title: string): number {
    return ConversationModel.create(title).id;
  }

  updateConversationTitle(id: number, title: string): void {
    ConversationModel.updateTitle(id, title);
  }

  getMessages(conversationId: number): Array<{
    id: number;
    conversation_id: number;
    role: string;
    content: string;
    qr_code?: string;
    created_at: string;
    timestamp: string;
  }> {
    return MessageModel.getByConversation(conversationId).map((msg) => ({
      ...msg,
      timestamp: msg.created_at,
    }));
  }

  addMessage(
    conversationId: number,
    role: "user" | "assistant",
    content: string,
    qrCode?: string,
  ): void {
    MessageModel.add(conversationId, role, content, qrCode);
  }
}

const databaseInstance = new AppDatabase();

export const Database = {
  getInstance(): AppDatabase {
    return databaseInstance;
  },
};

// 初始化默认对话
const defaultConv = ConversationModel.getById(1);
if (!defaultConv) {
  ConversationModel.create("新对话");
}

export { db };
