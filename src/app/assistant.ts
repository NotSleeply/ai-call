// @ts-ignore -- NodeNext .js import resolves to .ts at build time; suppress editor false positive.
import {
  ChatGenerationOptions,
  OpenClawClient,
} from "../core/ai/openClawClient.js";
import { FileSystemService } from "../core/services/file.service.js";
import { MultiAgentService } from "../core/services/multi-agent.service.js";
import { delay } from "../utils/delay.js";

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
│  agents [任务]           多Agent协同完成任务                 │
│  skill <子命令>          配置/添加/运行自定义Skill          │
│  ollama <问题>           使用本地Ollama回答问题             │
│  new                     开始新对话                         │
│  history                 查看对话历史                       │
│  exit                    退出程序                           │
├─────────────────────────────────────────────────────────────┤
│  💡 提示: 输入任意其他内容将进入智能问答模式               │
└─────────────────────────────────────────────────────────────┘
`;

/**
 * 大虾助手门面类
 */
export class DaxiaAssistant {
  private readonly openClawClient = new OpenClawClient();
  private readonly fileSystemService = new FileSystemService();
  private readonly multiAgentService = new MultiAgentService(
    this.openClawClient,
  );

  showHelp(): void {
    console.log(HELP_TEXT);
  }

  async generateOpenClawReply(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
  ): Promise<string> {
    return this.openClawClient.generateReply(
      userInput,
      conversationHistory,
      options,
    );
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
    options: ChatGenerationOptions = {},
  ): Promise<void> {
    const answer = await this.generateOpenClawReply(
      input,
      conversationHistory,
      options,
    );
    console.log(`💬 ${answer}`);
  }

  async runMultiAgentCollaboration(task?: string): Promise<void> {
    await this.multiAgentService.runCollaboration(task);
  }

  async runSkillTask(
    skillPrompt: string,
    task: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
  ): Promise<string> {
    return this.openClawClient.generateWithSystemPrompt(
      skillPrompt,
      task,
      conversationHistory,
      options,
    );
  }
}
