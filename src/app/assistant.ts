// @ts-ignore -- NodeNext .js import resolves to .ts at build time; suppress editor false positive.
import {
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
  ): Promise<string> {
    return this.openClawClient.generateReply(
      userInput,
      conversationHistory,
    );
  }

  async generateOpenClawReplyStream(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    onDelta: (delta: string) => void = () => {},
  ): Promise<string> {
    return this.openClawClient.generateReplyStream(
      userInput,
      conversationHistory,
      onDelta,
    );
  }

  async runSkillTask(
    skillPrompt: string,
    task: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<string> {
    return this.openClawClient.generateWithSystemPrompt(
      skillPrompt,
      task,
      conversationHistory,
    );
  }

  async runSkillTaskStream(
    skillPrompt: string,
    task: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    onDelta: (delta: string) => void = () => {},
  ): Promise<string> {
    return this.openClawClient.generateWithSystemPromptStream(
      skillPrompt,
      task,
      conversationHistory,
      onDelta,
    );
  }
}
