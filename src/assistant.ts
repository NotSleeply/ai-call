import { OpenClawClient } from "./assistant_modules/core/openClawClient.js";
import { FileSystemService } from "./assistant_modules/services/fileSystemService.js";
import { GameService } from "./assistant_modules/services/gameService.js";
import { MultiAgentService } from "./assistant_modules/services/multiAgentService.js";
import { SummaryService } from "./assistant_modules/services/summaryService.js";
import { WeChatService } from "./assistant_modules/services/weChatService.js";
import { delay } from "./assistant_modules/utils/delay.js";

const HELP_TEXT = `
┌─────────────────────────────────────────────────────────────┐
│                    📚 可用命令列表                          │
├─────────────────────────────────────────────────────────────┤
│  help                    显示此帮助信息                     │
│  read <文件名>           读取文件内容                       │
│  write <文件名> <内容>   写入文件内容                       │
│  search <关键词>         搜索代码中的关键词                  │
│  exec <命令>             执行系统命令                       │
│  analyze                 分析当前项目结构                    │
│  list [目录]             列出目录内容                       │
│  ask <问题>              智能问答                           │
│  wx                      连接微信                           │
│  weather                 总结天气                           │
│  news                    总结新闻                           │
│  email                   总结邮件                           │
│  summary                 生成对话总结（Markdown格式）       │
│  agents [任务]           多Agent协同完成任务演示            │
│  ollama <问题>           使用本地Ollama回答问题             │
│  2048                    生成2048游戏到out目录               │
│  exit                    退出程序                           │
├─────────────────────────────────────────────────────────────┤
│  💡 提示: 输入任意其他内容将进入智能问答模式               │
└─────────────────────────────────────────────────────────────┘
`;

/**
 * 大虾助手门面类
 * 保持对外 API 不变，内部实现按功能拆分到独立模块。
 */
export class DaxiaAssistant {
  private readonly openClawClient = new OpenClawClient();
  private readonly fileSystemService = new FileSystemService();
  private readonly weChatService = new WeChatService();
  private readonly summaryService = new SummaryService();
  private readonly gameService = new GameService();
  private readonly multiAgentService = new MultiAgentService(
    this.openClawClient,
  );

  showHelp(): void {
    console.log(HELP_TEXT);
  }

  async generateOpenClawReply(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<string> {
    return this.openClawClient.generateReply(userInput, conversationHistory);
  }

  async readFile(filename?: string): Promise<void> {
    await this.fileSystemService.readFile(filename);
  }

  async writeFile(filename?: string, content?: string): Promise<void> {
    await this.fileSystemService.writeFile(filename, content);
  }

  async searchContent(keyword?: string): Promise<void> {
    await this.fileSystemService.searchContent(keyword);
  }

  async executeCommand(command?: string): Promise<void> {
    await this.fileSystemService.executeCommand(command);
  }

  async analyzeProject(): Promise<void> {
    await this.fileSystemService.analyzeProject();
  }

  async listFiles(dir: string): Promise<void> {
    await this.fileSystemService.listFiles(dir);
  }

  async askQuestion(
    question?: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<void> {
    if (!question) {
      console.log("❌ 请输入问题，例如: ask 什么是TypeScript?");
      return;
    }

    console.log(`\n🤔 问题: ${question}`);
    console.log("─".repeat(60));

    const answer = await this.generateOpenClawReply(
      question,
      conversationHistory,
    );

    process.stdout.write("💬 ");
    for (const char of answer) {
      process.stdout.write(char);
      await delay(20);
    }
    console.log("\n");
  }

  async smartChat(
    input: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<void> {
    const answer = await this.generateOpenClawReply(input, conversationHistory);
    console.log(`💬 ${answer}`);
  }

  async connectWeChat(): Promise<void> {
    await this.weChatService.connectWeChat();
  }

  async generateQRCodeBase64(): Promise<string> {
    return this.weChatService.generateQRCodeBase64();
  }

  async summarizeWeather(): Promise<void> {
    await this.summaryService.summarizeWeather();
  }

  async summarizeNews(): Promise<void> {
    await this.summaryService.summarizeNews();
  }

  async summarizeEmail(): Promise<void> {
    await this.summaryService.summarizeEmail();
  }

  async generateSummary(): Promise<void> {
    await this.summaryService.generateSummary();
  }

  async runMultiAgentCollaboration(task?: string): Promise<void> {
    await this.multiAgentService.runCollaboration(task);
  }

  async copy2048(): Promise<void> {
    await this.gameService.copy2048();
  }
}
