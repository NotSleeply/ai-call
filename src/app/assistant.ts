// @ts-ignore -- NodeNext .js import resolves to .ts at build time; suppress editor false positive.
import {
  ChatGenerationOptions,
  OpenClawClient,
} from "../core/ai/openClawClient.js";

/**
 * AI Call 助手门面类
 */
export class AiCallAssistant {
  private readonly openClawClient = new OpenClawClient();

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

  async generateOpenClawReplyStream(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
    onDelta: (delta: string) => void = () => {},
  ): Promise<string> {
    return this.openClawClient.generateReplyStream(
      userInput,
      conversationHistory,
      options,
      onDelta,
    );
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

  async runSkillTaskStream(
    skillPrompt: string,
    task: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
    onDelta: (delta: string) => void = () => {},
  ): Promise<string> {
    return this.openClawClient.generateWithSystemPromptStream(
      skillPrompt,
      task,
      conversationHistory,
      options,
      onDelta,
    );
  }
}
