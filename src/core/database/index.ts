import BetterSqlite3 from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { migrateLegacyData, resolveDataDir, resolveLegacyDbPath } from "../paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = resolveDataDir();
const legacyDbPath = resolveLegacyDbPath(__dirname);
migrateLegacyData(dataDir, legacyDbPath);
mkdirSync(dataDir, { recursive: true });

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

  -- 定时任务表
  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '定时任务',
    workspace TEXT,
    command TEXT NOT NULL,
    model_provider TEXT NOT NULL DEFAULT 'auto',
    model_name TEXT,
    frequency_type TEXT NOT NULL DEFAULT 'interval' CHECK(frequency_type IN ('daily', 'interval', 'once')),
    interval_seconds INTEGER NOT NULL DEFAULT 600 CHECK(interval_seconds > 0),
    time_of_day TEXT,
    weekdays TEXT,
    run_at DATETIME,
    start_date TEXT,
    push_to_wechat INTEGER NOT NULL DEFAULT 0 CHECK(push_to_wechat IN (0, 1)),
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_run_at DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  -- 定时任务执行记录表
  CREATE TABLE IF NOT EXISTS scheduled_task_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    success INTEGER NOT NULL CHECK(success IN (0, 1)),
    output TEXT NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_conversation ON scheduled_tasks(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled);
  CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_task ON scheduled_task_runs(task_id);
  CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_time ON scheduled_task_runs(executed_at DESC);
`);

interface TableColumnInfo {
  name: string;
}

function ensureColumn(
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as TableColumnInfo[];
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureScheduledTaskSchema(): void {
  ensureColumn("scheduled_tasks", "name", "TEXT NOT NULL DEFAULT '定时任务'");
  ensureColumn("scheduled_tasks", "workspace", "TEXT");
  ensureColumn(
    "scheduled_tasks",
    "model_provider",
    "TEXT NOT NULL DEFAULT 'auto'",
  );
  ensureColumn("scheduled_tasks", "model_name", "TEXT");
  ensureColumn(
    "scheduled_tasks",
    "frequency_type",
    "TEXT NOT NULL DEFAULT 'interval'",
  );
  ensureColumn("scheduled_tasks", "time_of_day", "TEXT");
  ensureColumn("scheduled_tasks", "weekdays", "TEXT");
  ensureColumn("scheduled_tasks", "run_at", "DATETIME");
  ensureColumn("scheduled_tasks", "start_date", "TEXT");
  ensureColumn(
    "scheduled_tasks",
    "push_to_wechat",
    "INTEGER NOT NULL DEFAULT 0",
  );

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_run_at ON scheduled_tasks(run_at)",
  );
}

ensureScheduledTaskSchema();

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

  // 定时任务相关
  addScheduledTask: db.prepare(
    "INSERT INTO scheduled_tasks (conversation_id, name, workspace, command, model_provider, model_name, frequency_type, interval_seconds, time_of_day, weekdays, run_at, start_date, push_to_wechat, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ),
  getScheduledTaskById: db.prepare(
    "SELECT * FROM scheduled_tasks WHERE id = ?",
  ),
  listScheduledTasksByConversation: db.prepare(
    "SELECT * FROM scheduled_tasks WHERE conversation_id = ? ORDER BY id DESC",
  ),
  listEnabledScheduledTasks: db.prepare(
    "SELECT * FROM scheduled_tasks WHERE enabled = 1 ORDER BY id DESC",
  ),
  updateScheduledTaskEnabled: db.prepare(
    "UPDATE scheduled_tasks SET enabled = ? WHERE id = ?",
  ),
  markScheduledTaskRun: db.prepare(
    "UPDATE scheduled_tasks SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?",
  ),
  deleteScheduledTask: db.prepare("DELETE FROM scheduled_tasks WHERE id = ?"),

  addScheduledTaskRun: db.prepare(
    "INSERT INTO scheduled_task_runs (task_id, success, output) VALUES (?, ?, ?)",
  ),
  listScheduledTaskRuns: db.prepare(
    "SELECT * FROM scheduled_task_runs WHERE task_id = ? ORDER BY executed_at DESC LIMIT ?",
  ),
};

interface ScheduledTaskRecord {
  id: number;
  conversation_id: number;
  name: string;
  workspace?: string | null;
  command: string;
  model_provider: string;
  model_name?: string | null;
  frequency_type: string;
  interval_seconds: number;
  time_of_day?: string | null;
  weekdays?: string | null;
  run_at?: string | null;
  start_date?: string | null;
  push_to_wechat: number;
  enabled: number;
  created_at: string;
  last_run_at?: string | null;
}

interface ScheduledTaskRunRecord {
  id: number;
  task_id: number;
  success: number;
  output: string;
  executed_at: string;
}

export type ScheduledTaskFrequencyType = "daily" | "interval" | "once";

export interface ScheduledTaskCreateInput {
  conversationId: number;
  name: string;
  workspace?: string | null;
  command: string;
  modelProvider: "auto" | "deepseek" | "api" | "ollama";
  modelName?: string | null;
  frequencyType: ScheduledTaskFrequencyType;
  intervalSeconds: number;
  timeOfDay?: string | null;
  weekdays?: number[];
  runAt?: string | null;
  startDate?: string | null;
  pushToWechat?: boolean;
  enabled?: boolean;
}

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

export const ScheduledTaskModel = {
  create(input: ScheduledTaskCreateInput): ScheduledTaskRecord {
    const frequencyType: ScheduledTaskFrequencyType =
      input.frequencyType === "daily" ||
      input.frequencyType === "once" ||
      input.frequencyType === "interval"
        ? input.frequencyType
        : "interval";

    const intervalSeconds = Math.max(
      1,
      Math.floor(Number(input.intervalSeconds || 600)),
    );

    const weekdaysValue =
      input.weekdays && input.weekdays.length > 0
        ? input.weekdays
            .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
            .join(",")
        : null;

    const result = stmts.addScheduledTask.run(
      input.conversationId,
      input.name.trim() || "定时任务",
      input.workspace?.trim() || null,
      input.command.trim(),
      input.modelProvider,
      input.modelName?.trim() || null,
      frequencyType,
      intervalSeconds,
      input.timeOfDay?.trim() || null,
      weekdaysValue,
      input.runAt?.trim() || null,
      input.startDate?.trim() || null,
      input.pushToWechat ? 1 : 0,
      input.enabled === false ? 0 : 1,
    );
    return ScheduledTaskModel.getById(result.lastInsertRowid as number)!;
  },

  getById(id: number): ScheduledTaskRecord | undefined {
    return stmts.getScheduledTaskById.get(id) as
      | ScheduledTaskRecord
      | undefined;
  },

  listByConversation(conversationId: number): ScheduledTaskRecord[] {
    return stmts.listScheduledTasksByConversation.all(
      conversationId,
    ) as ScheduledTaskRecord[];
  },

  listEnabled(): ScheduledTaskRecord[] {
    return stmts.listEnabledScheduledTasks.all() as ScheduledTaskRecord[];
  },

  setEnabled(id: number, enabled: boolean): void {
    stmts.updateScheduledTaskEnabled.run(enabled ? 1 : 0, id);
  },

  markRun(id: number): void {
    stmts.markScheduledTaskRun.run(id);
  },

  delete(id: number): number {
    const result = stmts.deleteScheduledTask.run(id);
    return result.changes;
  },
};

export const ScheduledTaskRunModel = {
  add(
    taskId: number,
    success: boolean,
    output: string,
  ): ScheduledTaskRunRecord {
    const result = stmts.addScheduledTaskRun.run(
      taskId,
      success ? 1 : 0,
      output,
    );
    return db
      .prepare("SELECT * FROM scheduled_task_runs WHERE id = ?")
      .get(result.lastInsertRowid as number) as ScheduledTaskRunRecord;
  },

  listByTask(taskId: number, limit: number = 20): ScheduledTaskRunRecord[] {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    return stmts.listScheduledTaskRuns.all(
      taskId,
      safeLimit,
    ) as ScheduledTaskRunRecord[];
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
