/**
 * AI Call - 一次性问答模式
 *
 * 职责：
 * - 检测 stdin 管道，与命令行 prompt 合并
 * - 通过统一只读查询 Runtime 输出回答到 stdout，错误与提示到 stderr
 * - 尽力持久化对话（数据库不可用时不影响主流程）
 */
import { CLI_NAME } from "./args.js";
import { startSpinner } from "./tty.js";
import type { CliArgs } from "./args.js";
import { AgentRuntime } from "../core/agent/runtime.js";

async function readStdinIfPiped(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trimEnd();
}

async function persistExchange(
  question: string,
  answer: string,
): Promise<void> {
  try {
    const { Database } = await import("../core/database/index.js");
    const db = Database.getInstance();

    let conversationId = db
      .getConversations()
      .find((conversation) => conversation.title === "CLI 对话")?.id;

    if (!conversationId) {
      conversationId = db.createConversation("CLI 对话");
    }

    db.addMessage(conversationId, "user", question);
    db.addMessage(conversationId, "assistant", answer);
  } catch {
    // 持久化失败不影响主流程（如 better-sqlite3 绑定缺失）
  }
}

/**
 * 加载最近一次 CLI 对话的历史消息，用于 -c 上下文延续。
 * 数据库不可用时返回空数组（降级为全新上下文）。
 */
export async function loadRecentHistory(
  limit: number = 12,
): Promise<Array<{ role: string; content: string }>> {
  try {
    const { Database } = await import("../core/database/index.js");
    const db = Database.getInstance();

    const conversation = db
      .getConversations()
      .find((item) => item.title === "CLI 对话");

    if (!conversation) {
      return [];
    }

    return db
      .getMessages(conversation.id)
      .slice(-limit)
      .map((msg) => ({ role: msg.role, content: msg.content }));
  } catch {
    return [];
  }
}

/**
 * 合并 stdin 管道内容与命令行 prompt。
 */
export async function buildQuestion(
  prompt: string,
  stdinText: string,
): Promise<string> {
  return stdinText ? (prompt ? `${stdinText}\n\n---\n${prompt}` : stdinText) : prompt;
}

export { readStdinIfPiped };

export async function runOneShot(args: CliArgs): Promise<number> {
  const stdinText = await readStdinIfPiped();
  const question = (await buildQuestion(args.prompt, stdinText)).trim();

  if (!question) {
    process.stderr.write(
      `${CLI_NAME}: 请提供问题，例如: ${CLI_NAME} "tar 解压 tar.gz 的命令"\n`,
    );
    process.stderr.write(`运行 ${CLI_NAME} --help 查看完整用法\n`);
    return 1;
  }

  const history = args.continueSession ? await loadRecentHistory() : [];

  if (args.continueSession && history.length === 0) {
    process.stderr.write(`${CLI_NAME}: 未找到可延续的历史对话，本次以全新上下文提问\n`);
  }

  const spinner = startSpinner("思考中...");

  try {
    const runtime = new AgentRuntime();
    const answer = await runtime.run(question, history);

    spinner?.stop();
    if (answer) {
      process.stdout.write(answer);
    }

    if (answer && !answer.endsWith("\n")) {
      process.stdout.write("\n");
    }

    void persistExchange(question, answer);
    return 0;
  } catch (error) {
    spinner?.stop();
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: ${msg}\n`);
    return 1;
  }
}
