#!/usr/bin/env node
import { createInterface } from "readline";
import { AiCallAssistant } from "./assistant.js";
import { Database } from "../core/database/index.js";

/**
 * AI Call CLI - 命令行交互层
 *
 * 职责：处理用户输入、命令分发、对话管理
 */
export class AiCallCLI {
  private assistant: AiCallAssistant;
  private rl: ReturnType<typeof createInterface>;
  private db: ReturnType<(typeof Database)["getInstance"]>;
  private currentConversationId: number | null = null;

  constructor() {
    this.assistant = new AiCallAssistant();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.db = Database.getInstance();
  }

  async start(): Promise<void> {
    this.printWelcome();
    await this.loadOrCreateConversation();
    await this.repl();
  }

  private printWelcome(): void {
    console.log("");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║           🦐 AI Call - AI编程助手 v1.0                    ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log("║  输入 help 查看可用命令                                  ║");
    console.log("║  输入 exit 退出程序                                      ║");
    console.log("║  输入 history 查看对话历史                               ║");
    console.log("║  输入 new 开始新对话                                     ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("");
  }

  private async loadOrCreateConversation(): Promise<void> {
    const conversations = this.db.getConversations();

    if (conversations.length > 0) {
      this.currentConversationId = conversations[0].id;
      console.log(
        `📝 已加载对话: ${conversations[0].title} (ID: ${conversations[0].id})`,
      );
      console.log(
        `💬 历史消息: ${this.db.getMessages(this.currentConversationId).length} 条`,
      );
      console.log("");
    } else {
      this.currentConversationId = this.db.createConversation("CLI 对话");
      console.log("✨ 已创建新对话");
      console.log("");
    }
  }

  private saveUserMessage(content: string): void {
    if (this.currentConversationId) {
      this.db.addMessage(this.currentConversationId, "user", content);
    }
  }

  private saveAssistantMessage(content: string): void {
    if (this.currentConversationId) {
      this.db.addMessage(this.currentConversationId, "assistant", content);
    }
  }

  private async captureOutput(fn: () => Promise<void>): Promise<string> {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);

    process.stdout.write = ((
      chunk: string | Uint8Array,
      encoding?: BufferEncoding | ((error?: Error | null) => void),
      callback?: (error?: Error | null) => void,
    ): boolean => {
      const text =
        typeof chunk === "string"
          ? chunk
          : Buffer.from(chunk).toString(
              typeof encoding === "string" ? encoding : undefined,
            );

      chunks.push(text);

      if (typeof encoding === "function") {
        return originalWrite(chunk, encoding);
      }

      return originalWrite(chunk, encoding, callback);
    }) as typeof process.stdout.write;

    try {
      await fn();
      return chunks.join("").trimEnd();
    } finally {
      process.stdout.write = originalWrite as typeof process.stdout.write;
    }
  }

  private async repl(): Promise<void> {
    const ask = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        this.rl.question(prompt, resolve);
      });
    };

    while (true) {
      try {
        const input = await ask("> ");
        const trimmed = input.trim();

        if (!trimmed) continue;

        if (trimmed.toLowerCase() === "exit") {
          console.log("\n👋 再见！感谢使用 AI Call！\n");
          this.rl.close();
          break;
        }

        await this.handleCommand(trimmed);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE") {
          break;
        }
        console.error("❌ 发生错误:", error);
      }
    }
  }

  private async handleCommand(input: string): Promise<void> {
    const [cmd, ...args] = input.split(/\s+/);

    // 特殊命令处理
    if (cmd.toLowerCase() === "history") {
      this.showHistory();
      return;
    }

    if (cmd.toLowerCase() === "new") {
      await this.createNewConversation();
      return;
    }

    // 保存用户消息
    this.saveUserMessage(input);

    const historyForModel = this.currentConversationId
      ? this.db
          .getMessages(this.currentConversationId)
          .slice(0, -1)
          .map((msg) => ({ role: msg.role, content: msg.content }))
      : [];

    let output = "";

    switch (cmd.toLowerCase()) {
      case "help":
        output = await this.captureOutput(async () => {
          this.assistant.showHelp();
        });
        this.saveAssistantMessage(output);
        break;
      case "read":
        output = await this.captureOutput(async () => {
          await this.assistant.readFile(args[0]);
        });
        this.saveAssistantMessage(output);
        break;
      case "write":
        output = await this.captureOutput(async () => {
          await this.assistant.writeFile(args[0], args.slice(1).join(" "));
        });
        this.saveAssistantMessage(output);
        break;
      case "search":
        output = await this.captureOutput(async () => {
          await this.assistant.searchContent(args[0]);
        });
        this.saveAssistantMessage(output);
        break;
      case "exec":
        output = await this.captureOutput(async () => {
          await this.assistant.executeCommand(args.join(" "));
        });
        this.saveAssistantMessage(output);
        break;
      case "analyze":
        output = await this.captureOutput(async () => {
          await this.assistant.analyzeProject();
        });
        this.saveAssistantMessage(output);
        break;
      case "ask":
        output = await this.captureOutput(async () => {
          await this.assistant.askQuestion(args.join(" "), historyForModel);
        });
        this.saveAssistantMessage(output);
        break;
      case "list":
        output = await this.captureOutput(async () => {
          await this.assistant.listFiles(args[0] || ".");
        });
        this.saveAssistantMessage(output);
        break;
      case "agents":
        output = await this.captureOutput(async () => {
          await this.assistant.runMultiAgentCollaboration(args.join(" "));
        });
        this.saveAssistantMessage(output);
        break;
      default:
        // 智能问答模式
        output = await this.captureOutput(async () => {
          await this.assistant.smartChat(input, historyForModel);
        });
        this.saveAssistantMessage(output);
    }

    // 更新对话标题
    if (this.currentConversationId) {
      const messages = this.db.getMessages(this.currentConversationId);
      if (messages.length <= 2) {
        const title =
          input.length > 30 ? input.substring(0, 30) + "..." : input;
        this.db.updateConversationTitle(this.currentConversationId, title);
      }
    }
  }

  private showHistory(): void {
    if (!this.currentConversationId) {
      console.log("❌ 当前没有活跃的对话");
      return;
    }

    const messages = this.db.getMessages(this.currentConversationId);

    if (messages.length === 0) {
      console.log("📭 暂无对话历史");
      return;
    }

    console.log("\n📜 对话历史:");
    console.log("─".repeat(50));

    for (const msg of messages) {
      const prefix = msg.role === "user" ? "👤 你" : "🦐 aic";
      const time = new Date(msg.timestamp).toLocaleTimeString();
      console.log(`[${time}] ${prefix}:`);
      console.log(msg.content);
      console.log("");
    }

    console.log("─".repeat(50));
  }

  private async createNewConversation(): Promise<void> {
    this.currentConversationId = this.db.createConversation("新对话");
    console.log("✨ 已创建新对话");
    console.log("💬 可以开始聊天了！");
    console.log("");
  }
}
