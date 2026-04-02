#!/usr/bin/env node
import { createInterface } from 'readline';
import { DaxiaAssistant } from './assistant.js';

/**
 * 大虾功能演示Demo
 * 
 * 模拟大虾（AI助手）的核心功能：
 * - 文件操作：读取、写入、搜索文件
 * - 代码分析：搜索代码、分析项目结构
 * - 命令执行：运行系统命令
 * - 智能问答：回答用户问题
 */
class DaxiaDemo {
  private assistant: DaxiaAssistant;
  private rl: ReturnType<typeof createInterface>;

  constructor() {
    this.assistant = new DaxiaAssistant();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    this.printWelcome();
    await this.repl();
  }

  private printWelcome(): void {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║              🦐 大虾功能演示Demo v1.0                    ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  输入 help 查看可用命令                                  ║');
    console.log('║  输入 exit 退出程序                                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
  }

  private async repl(): Promise<void> {
    const ask = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        this.rl.question(prompt, resolve);
      });
    };

    while (true) {
      try {
        const input = await ask('> ');
        const trimmed = input.trim();
        
        if (!trimmed) continue;
        
        if (trimmed.toLowerCase() === 'exit') {
          console.log('\n👋 再见！感谢使用大虾Demo！\n');
          this.rl.close();
          break;
        }

        await this.handleCommand(trimmed);
      } catch (error) {
        console.error('❌ 发生错误:', error);
      }
    }
  }

  private async handleCommand(input: string): Promise<void> {
    const [cmd, ...args] = input.split(/\s+/);
    
    switch (cmd.toLowerCase()) {
      case 'help':
        this.assistant.showHelp();
        break;
      case 'read':
        await this.assistant.readFile(args[0]);
        break;
      case 'write':
        await this.assistant.writeFile(args[0], args.slice(1).join(' '));
        break;
      case 'search':
        await this.assistant.searchContent(args[0]);
        break;
      case 'exec':
        await this.assistant.executeCommand(args.join(' '));
        break;
      case 'analyze':
        await this.assistant.analyzeProject();
        break;
      case 'ask':
        await this.assistant.askQuestion(args.join(' '));
        break;
      case 'list':
        await this.assistant.listFiles(args[0] || '.');
        break;
      default:
        // 智能问答模式
        await this.assistant.smartChat(input);
    }
  }
}

// 启动Demo
const demo = new DaxiaDemo();
demo.start().catch(console.error);
