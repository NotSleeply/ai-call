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
import { AgentRuntime, type AgentStatus } from "../core/agent/runtime.js";
import {
  normalizeTerminalText,
  TerminalTextStreamNormalizer,
} from "./terminal-output.js";
import { RequestCancelledError } from "../core/ai/openClawClient.js";

export const HISTORY_MESSAGE_LIMIT = 12;

export function formatAgentStatus(status: AgentStatus): string {
  switch (status.type) {
    case "thinking":
      return status.round > 1
        ? "正在继续分析（第 " + status.round + " 轮）..."
        : "正在分析问题...";
    case "tool":
      switch (status.toolName) {
        case "find_files":
          return "正在查找文件...";
        case "read_file":
          return "正在读取文件...";
        case "search_text":
          return "正在搜索内容...";
        default:
          return "正在获取本地信息...";
      }
    case "tool-result":
      return "正在整理查询结果...";
    case "finalizing":
      return "正在整理最终回答...";
    case "generating":
      return "正在生成回答...";
  }
}

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
    db.trimMessages(conversationId, HISTORY_MESSAGE_LIMIT);
  } catch {
    // 持久化失败不影响主流程（如 better-sqlite3 绑定缺失）
  }
}

/**
 * 加载最近一次 CLI 对话的历史消息，用于 -c 上下文延续。
 * 数据库不可用时返回空数组（降级为全新上下文）。
 */
export async function loadRecentHistory(
  limit: number = HISTORY_MESSAGE_LIMIT,
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

  const spinner = startSpinner("正在分析问题...");
  const controller = new AbortController();
  let interrupted = false;
  let streamedText = "";
  let streamedOutput = "";
  const streamNormalizer = new TerminalTextStreamNormalizer();
  const onSigint = () => {
    interrupted = true;
    controller.abort();
  };
  process.once("SIGINT", onSigint);

  try {
    const runtime = new AgentRuntime();
    const rawAnswer = await runtime.run(question, history, {
      signal: controller.signal,
      onStatus: (status) => {
        if (spinner) {
          spinner.text = formatAgentStatus(status);
        }
      },
      onDelta: (delta) => {
        streamedText += delta;
        const output = streamNormalizer.push(delta);
        if (!output) {
          return;
        }

        if (!streamedOutput) {
          spinner?.stop();
        }
        streamedOutput += output;
        process.stdout.write(output);
      },
    });
    if (interrupted) {
      throw new RequestCancelledError();
    }
    const answer = normalizeTerminalText(rawAnswer);
    const remainingOutput = streamNormalizer.finish();
    if (remainingOutput) {
      spinner?.stop();
      streamedOutput += remainingOutput;
      process.stdout.write(remainingOutput);
    }

    if (!streamedText) {
      spinner?.stop();
      if (answer) {
        process.stdout.write(answer);
      }

      if (answer && !answer.endsWith("\n")) {
        process.stdout.write("\n");
      }
    } else if (streamedOutput && !streamedOutput.endsWith("\n")) {
      process.stdout.write("\n");
    }

    void persistExchange(question, answer);
    return 0;
  } catch (error) {
    spinner?.stop();
    if (interrupted || error instanceof RequestCancelledError) {
      process.stderr.write(`\n${CLI_NAME}: 请求已中断\n`);
      return 130;
    }
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: ${msg}\n`);
    return 1;
  } finally {
    process.off("SIGINT", onSigint);
  }
}
