import { config as loadDotEnv } from "dotenv";

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

const DEFAULT_OPENCLAW_SYSTEM_PROMPT = `你是一个专业、可靠、安全的 AI 智能体（Agent）。

你的任务是根据用户的自然语言指令，自主规划步骤、调用工具、执行操作，并完成真实任务。

遵守以下规则：

1. 只做用户明确要求的事，不擅自扩展任务。

2. 执行危险操作前必须先询问确认，包括：删除文件、格式化、修改系统配置、网络攻击、泄露信息。

3. 执行步骤必须清晰、可解释，每一步都说明你要做什么、为什么这么做。

4. 遇到错误时自动重试或给出修复方案，不直接崩溃。

5. 不编造不存在的工具或功能，不知道就如实回答。

6. 保护用户隐私，不记录、不泄露敏感信息（密码、密钥、个人数据）。

7. 保持简洁高效，优先使用最稳定、最安全的方式完成任务。

8. 如果任务复杂，拆分成多步执行，执行完一步再进行下一步。

9. 永远以帮助用户、提高效率为目标，不拒绝合理的正常任务。

10. 你的回答要简洁明了，直接给出结果，不要废话，能用一句话说明白的就不要用第二句话，但是你回答中不要体现出简洁版、高效版等标签以及无关信息。

11. 你可以执行调用系统命令、读写文件、搜索内容、分析项目结构等操作来完成任务，但必须严格遵守以上规则。

现在，等待用户指令。`;

loadDotEnv();

export class OpenClawClient {
  private readonly deepSeekApiKey = (process.env.DEEPSEEK_API_KEY || "").trim();
  private readonly deepSeekModel =
    (process.env.DEEPSEEK_MODEL || "deepseek-chat").trim() || "deepseek-chat";
  private readonly deepSeekBaseUrl =
    (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").trim() ||
    "https://api.deepseek.com";
  private readonly openClawSystemPrompt = DEFAULT_OPENCLAW_SYSTEM_PROMPT;

  private isDeepSeekEnabled(): boolean {
    return this.deepSeekApiKey.length > 0;
  }

  private resolveDeepSeekEndpoints(): string[] {
    const base = this.deepSeekBaseUrl.replace(/\/+$/, "");

    if (
      base.endsWith("/chat/completions") ||
      base.endsWith("/v1/chat/completions")
    ) {
      return [base];
    }

    const endpoints = [
      `${base}/chat/completions`,
      base.endsWith("/v1")
        ? `${base}/chat/completions`
        : `${base}/v1/chat/completions`,
    ];

    return [...new Set(endpoints)];
  }

  private normalizeConversationHistory(
    conversationHistory: Array<{ role: string; content: string }>,
  ): Array<{ role: "user" | "assistant"; content: string }> {
    return conversationHistory
      .filter(
        (msg): msg is { role: "user" | "assistant"; content: string } =>
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0,
      )
      .slice(-12);
  }

  private async requestDeepSeek(messages: ChatMessage[]): Promise<string> {
    let lastError = "";

    for (const endpoint of this.resolveDeepSeekEndpoints()) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.deepSeekApiKey}`,
          },
          body: JSON.stringify({
            model: this.deepSeekModel,
            messages,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `HTTP ${response.status} ${response.statusText}: ${errText}`;
          continue;
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        };

        const content = data.choices?.[0]?.message?.content?.trim();

        if (content) {
          return content;
        }

        lastError = data.error?.message || "DeepSeek 返回了空内容";
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        lastError = msg;
      }
    }

    throw new Error(lastError || "DeepSeek 请求失败");
  }

  async generateReply(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<string> {
    const question = userInput.trim();

    if (!question) {
      return "请告诉我你想问什么。";
    }

    if (!this.isDeepSeekEnabled()) {
      return "未检测到 DeepSeek API Key。请先在 .env 中配置 DEEPSEEK_API_KEY。";
    }

    const normalizedHistory =
      this.normalizeConversationHistory(conversationHistory);
    const messages: ChatMessage[] = [
      { role: "system", content: this.openClawSystemPrompt },
      ...normalizedHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: question },
    ];

    try {
      return await this.requestDeepSeek(messages);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `DeepSeek 调用失败：${msg}`;
    }
  }
}
