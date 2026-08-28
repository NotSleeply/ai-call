/**
 * SmallClaw - 一次性执行模式
 *
 * 职责：
 * - 检测 stdin 管道，与命令行 prompt 合并
 * - 流式输出回答到 stdout，错误与提示到 stderr
 * - 尽力持久化对话（数据库不可用时不影响主流程）
 */
import { DaxiaAssistant } from "./assistant.js";
import type { ChatGenerationOptions } from "../core/ai/openClawClient.js";
import type { CliArgs } from "./args.js";

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

export async function runOneShot(args: CliArgs): Promise<number> {
  const stdinText = await readStdinIfPiped();
  let question = args.prompt;

  if (stdinText) {
    question = question ? `${stdinText}\n\n---\n${question}` : stdinText;
  }

  if (!question.trim()) {
    process.stderr.write('sc: 请提供问题，例如: sc "tar 解压 tar.gz 的命令"\n');
    process.stderr.write("运行 sc --help 查看完整用法\n");
    return 1;
  }

  const assistant = new DaxiaAssistant();

  const options: ChatGenerationOptions = {
    forceProvider: args.provider === "auto" ? undefined : args.provider,
  };

  if (args.model) {
    options.deepseekModel = args.model;
    options.apiModel = args.model;
    options.ollamaModel = args.model;
  }

  try {
    let answer: string;

    if (args.stream) {
      answer = await assistant.generateOpenClawReplyStream(
        question,
        [],
        options,
        (delta) => {
          process.stdout.write(delta);
        },
      );
    } else {
      answer = await assistant.generateOpenClawReply(question, [], options);
      if (answer) {
        process.stdout.write(answer);
      }
    }

    if (answer && !answer.endsWith("\n")) {
      process.stdout.write("\n");
    }

    void persistExchange(question, answer);
    return 0;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`sc: ${msg}\n`);
    return 1;
  }
}
