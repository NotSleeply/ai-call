/**
 * AI Call - 一次性执行模式
 *
 * 职责：
 * - 检测 stdin 管道，与命令行 prompt 合并
 * - 通过统一 Agent Runtime 输出回答到 stdout，错误与提示到 stderr
 * - 尽力持久化对话（数据库不可用时不影响主流程）
 */
import { CLI_NAME } from "./args.js";
import { askConfirmation, isConfirmYes, startSpinner } from "./tty.js";
import type { CliArgs } from "./args.js";
import {
  AgentActionDeniedError,
  AgentRuntime,
  type AgentActionRequest,
} from "../core/agent/runtime.js";

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

class ConfirmationUnavailableError extends Error {}

function actionConfirmationText(request: AgentActionRequest): string {
  if (request.name === "run_command") {
    const input = request.arguments;
    if (typeof input === "object" && input !== null && !Array.isArray(input)) {
      const command = (input as Record<string, unknown>).command;
      const args = (input as Record<string, unknown>).args;
      if (typeof command === "string" && Array.isArray(args)) {
        return `准备执行命令: ${JSON.stringify([command, ...args])}`;
      }
      if (typeof command === "string") {
        return `准备执行命令: ${command}`;
      }
    }
    return "准备执行一个本地命令";
  }

  if (request.name === "edit_file") {
    const input = request.arguments;
    if (typeof input === "object" && input !== null && !Array.isArray(input)) {
      const path = (input as Record<string, unknown>).path;
      const patch = (input as Record<string, unknown>).patch;
      if (typeof path === "string") {
        const size = typeof patch === "string" ? patch.length : 0;
        return `准备修改文件 ${path}（补丁 ${size} 字符）`;
      }
    }
    return "准备修改一个项目文件";
  }

  return `准备调用工具 ${request.name}`;
}

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
    const answer = await runtime.run(question, history, {
      allowActions: args.exec,
      confirmAction: async (request) => {
        spinner?.stop();
        const answer = await askConfirmation(
          `${actionConfirmationText(request)}\n确认执行? [y/N]: `,
        );

        if (!answer) {
          throw new ConfirmationUnavailableError("无法读取确认输入");
        }

        return isConfirmYes(answer);
      },
    });

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
    if (error instanceof ConfirmationUnavailableError) {
      process.stderr.write(`${CLI_NAME}: 无法读取确认输入，已取消操作\n`);
      return 2;
    }
    if (error instanceof AgentActionDeniedError) {
      process.stderr.write(`${CLI_NAME}: 用户拒绝了操作，已取消本次任务\n`);
      return 0;
    }
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: ${msg}\n`);
    return 1;
  }
}
