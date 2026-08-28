import { config as loadDotEnv } from "dotenv";
import { homedir } from "os";
import { join } from "path";

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string }>;
}

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string } | string;
}

export interface ChatGenerationOptions {
  forceProvider?: "deepseek" | "api" | "ollama";
  deepseekModel?: string;
  apiModel?: string;
  ollamaModel?: string;
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

// 依次尝试当前目录 .env 与用户级 ~/.ai-call/.env（前面的优先）
loadDotEnv({
  quiet: true,
  path: [".env", join(homedir(), ".ai-call", ".env")],
});

export class OpenClawClient {
  private readonly deepSeekApiKey = (process.env.DEEPSEEK_API_KEY || "").trim();
  private readonly deepSeekModel =
    (process.env.DEEPSEEK_MODEL || "deepseek-chat").trim() || "deepseek-chat";
  private readonly deepSeekBaseUrl =
    (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").trim() ||
    "https://api.deepseek.com";
  private readonly ollamaHost =
    (process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || "").trim() ||
    "http://127.0.0.1:11434";
  private readonly ollamaModel = (process.env.OLLAMA_MODEL || "").trim();

  private readonly modelApiKey = (
    process.env.MODEL_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.QWEN_API_KEY ||
    process.env.KIMI_API_KEY ||
    process.env.GLM_API_KEY ||
    process.env.DOUBAO_API_KEY ||
    process.env.MINIMAX_API_KEY ||
    ""
  ).trim();
  private readonly modelApiModel =
    (
      process.env.MODEL_API_MODEL ||
      process.env.OPENROUTER_MODEL ||
      process.env.OPENAI_MODEL ||
      process.env.XAI_MODEL ||
      process.env.GEMINI_MODEL ||
      process.env.QWEN_MODEL ||
      process.env.KIMI_MODEL ||
      process.env.GLM_MODEL ||
      process.env.DOUBAO_MODEL ||
      process.env.MINIMAX_MODEL ||
      "gpt-5-mini"
    ).trim() || "gpt-5-mini";
  private readonly modelApiBaseUrl =
    (
      process.env.MODEL_API_BASE_URL ||
      process.env.OPENROUTER_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.XAI_BASE_URL ||
      process.env.GEMINI_BASE_URL ||
      process.env.QWEN_BASE_URL ||
      process.env.KIMI_BASE_URL ||
      process.env.GLM_BASE_URL ||
      process.env.DOUBAO_BASE_URL ||
      process.env.MINIMAX_BASE_URL ||
      "https://openrouter.ai/api/v1"
    ).trim() || "https://openrouter.ai/api/v1";
  private readonly modelApiSiteUrl = (
    process.env.MODEL_API_SITE_URL ||
    process.env.OPENROUTER_SITE_URL ||
    ""
  ).trim();
  private readonly modelApiAppName =
    (
      process.env.MODEL_API_APP_NAME ||
      process.env.OPENROUTER_APP_NAME ||
      "ai-call"
    ).trim() || "ai-call";

  private readonly openClawSystemPrompt = DEFAULT_OPENCLAW_SYSTEM_PROMPT;

  private isDeepSeekEnabled(): boolean {
    return this.deepSeekApiKey.length > 0;
  }

  private isModelApiEnabled(): boolean {
    return this.modelApiKey.length > 0;
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

  private resolveModelApiEndpoints(): string[] {
    const base = this.modelApiBaseUrl.replace(/\/+$/, "");

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

  private resolveOllamaEndpoints(): string[] {
    const normalized = this.ollamaHost.replace(/\/+$/, "");
    const defaults = [
      normalized,
      "http://127.0.0.1:11434",
      "http://localhost:11434",
    ];
    return [...new Set(defaults)];
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

  private async requestDeepSeek(
    messages: ChatMessage[],
    modelOverride?: string,
  ): Promise<string> {
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
            model: (modelOverride || "").trim() || this.deepSeekModel,
            messages,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `HTTP ${response.status} ${response.statusText}: ${errText}`;
          continue;
        }

        const data = (await response.json()) as ChatCompletionsResponse;
        const content = data.choices?.[0]?.message?.content?.trim();

        if (content) {
          return content;
        }

        if (typeof data.error === "string") {
          lastError = data.error;
        } else {
          lastError = data.error?.message || "DeepSeek 返回了空内容";
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        lastError = msg;
      }
    }

    throw new Error(lastError || "DeepSeek 请求失败");
  }

  private async resolveOllamaModel(
    endpoint: string,
    modelOverride?: string,
  ): Promise<string> {
    const trimmedOverride = (modelOverride || "").trim();
    if (trimmedOverride) {
      return trimmedOverride;
    }

    if (this.ollamaModel) {
      return this.ollamaModel;
    }

    const response = await fetch(`${endpoint}/api/tags`);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `读取 Ollama 模型列表失败: HTTP ${response.status} ${response.statusText}: ${errText}`,
      );
    }

    const tags = (await response.json()) as OllamaTagsResponse;
    const model = tags.models?.[0]?.name?.trim();

    if (!model) {
      throw new Error(
        "未检测到本地 Ollama 模型，请先执行例如: ollama pull qwen3",
      );
    }

    return model;
  }

  private async requestOllama(
    messages: ChatMessage[],
    modelOverride?: string,
  ): Promise<string> {
    let lastError = "";

    for (const endpoint of this.resolveOllamaEndpoints()) {
      try {
        const model = await this.resolveOllamaModel(endpoint, modelOverride);
        const response = await fetch(`${endpoint}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            stream: false,
            messages,
            options: {
              temperature: 0.7,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `HTTP ${response.status} ${response.statusText}: ${errText}`;
          continue;
        }

        const data = (await response.json()) as {
          message?: { content?: string };
          error?: string;
        };

        const content = data.message?.content?.trim();

        if (content) {
          return content;
        }

        lastError = data.error || "Ollama 返回了空内容";
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(lastError || "Ollama 请求失败");
  }

  private async requestModelApi(
    messages: ChatMessage[],
    modelOverride?: string,
  ): Promise<string> {
    let lastError = "";

    for (const endpoint of this.resolveModelApiEndpoints()) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.modelApiKey}`,
        };

        if (this.modelApiSiteUrl) {
          headers["HTTP-Referer"] = this.modelApiSiteUrl;
        }

        if (this.modelApiAppName) {
          headers["X-Title"] = this.modelApiAppName;
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: (modelOverride || "").trim() || this.modelApiModel,
            messages,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `HTTP ${response.status} ${response.statusText}: ${errText}`;
          continue;
        }

        const data = (await response.json()) as ChatCompletionsResponse;
        const content = data.choices?.[0]?.message?.content?.trim();

        if (content) {
          return content;
        }

        if (typeof data.error === "string") {
          lastError = data.error;
        } else {
          lastError = data.error?.message || "通用 API 返回了空内容";
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(lastError || "通用 API 请求失败");
  }

  private buildMessages(
    systemPrompt: string,
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ): ChatMessage[] {
    const normalizedHistory =
      this.normalizeConversationHistory(conversationHistory);
    return [
      { role: "system", content: systemPrompt },
      ...normalizedHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: userInput },
    ];
  }

  private async generateByOptions(
    messages: ChatMessage[],
    options: ChatGenerationOptions,
  ): Promise<string> {
    if (options.forceProvider === "deepseek") {
      if (!this.isDeepSeekEnabled()) {
        return "当前未配置 DeepSeek API Key，无法按所选模型执行。";
      }

      try {
        return await this.requestDeepSeek(messages, options.deepseekModel);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return `DeepSeek 调用失败：${msg}`;
      }
    }

    if (options.forceProvider === "api") {
      if (!this.isModelApiEnabled()) {
        return "当前未配置通用 API Key，无法按所选模型执行。";
      }

      try {
        return await this.requestModelApi(messages, options.apiModel);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return `通用 API 调用失败：${msg}`;
      }
    }

    if (options.forceProvider === "ollama") {
      try {
        return await this.requestOllama(messages, options.ollamaModel);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return `Ollama 调用失败：${msg}`;
      }
    }

    const errors: string[] = [];

    if (this.isModelApiEnabled()) {
      try {
        return await this.requestModelApi(messages, options.apiModel);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`API: ${msg}`);
      }
    }

    if (this.isDeepSeekEnabled()) {
      try {
        return await this.requestDeepSeek(messages, options.deepseekModel);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`DeepSeek: ${msg}`);
      }
    }

    try {
      return await this.requestOllama(messages, options.ollamaModel);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Ollama: ${msg}`);
    }

    if (!this.isModelApiEnabled() && !this.isDeepSeekEnabled()) {
      return "未检测到 API Key，且 Ollama 调用失败。请在 .env 中设置 MODEL_API_KEY / DEEPSEEK_API_KEY 或配置 OLLAMA。";
    }

    return errors.length > 0
      ? `自动选模失败：${errors.join("；")}`
      : "自动选模失败：未获取到可用回复。";
  }

  private async readResponseLines(
    response: Response,
    onLine: (line: string) => void,
  ): Promise<void> {
    if (!response.body) {
      throw new Error("响应体为空，无法读取流式内容");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        onLine(line);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      onLine(buffer);
    }
  }

  private async requestDeepSeekStream(
    messages: ChatMessage[],
    onDelta: (delta: string) => void,
    modelOverride?: string,
  ): Promise<string> {
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
            model: (modelOverride || "").trim() || this.deepSeekModel,
            messages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `HTTP ${response.status} ${response.statusText}: ${errText}`;
          continue;
        }

        let fullText = "";
        let receivedDelta = false;

        await this.readResponseLines(response, (line) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) return;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") return;

          try {
            const data = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = data.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              fullText += delta;
              receivedDelta = true;
              onDelta(delta);
            }
          } catch {
            // 忽略无法解析的流式数据块
          }
        });

        if (receivedDelta) {
          return fullText.trim();
        }

        // 流式无增量时退回非流式请求
        const fallback = await this.requestDeepSeek(messages, modelOverride);
        if (fallback) {
          onDelta(fallback);
          return fallback;
        }

        lastError = "DeepSeek 返回了空内容";
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(lastError || "DeepSeek 请求失败");
  }

  private async requestOllamaStream(
    messages: ChatMessage[],
    onDelta: (delta: string) => void,
    modelOverride?: string,
  ): Promise<string> {
    let lastError = "";

    for (const endpoint of this.resolveOllamaEndpoints()) {
      try {
        const model = await this.resolveOllamaModel(endpoint, modelOverride);
        const response = await fetch(`${endpoint}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages,
            options: {
              temperature: 0.7,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `HTTP ${response.status} ${response.statusText}: ${errText}`;
          continue;
        }

        let fullText = "";
        let receivedDelta = false;

        await this.readResponseLines(response, (line) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          try {
            const data = JSON.parse(trimmed) as {
              message?: { content?: string };
            };
            const delta = data.message?.content;
            if (typeof delta === "string" && delta.length > 0) {
              fullText += delta;
              receivedDelta = true;
              onDelta(delta);
            }
          } catch {
            // 忽略无法解析的流式数据块
          }
        });

        if (receivedDelta) {
          return fullText.trim();
        }

        // 流式无增量时退回非流式请求
        const fallback = await this.requestOllama(messages, modelOverride);
        if (fallback) {
          onDelta(fallback);
          return fallback;
        }

        lastError = "Ollama 返回了空内容";
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(lastError || "Ollama 请求失败");
  }

  private async requestModelApiStream(
    messages: ChatMessage[],
    onDelta: (delta: string) => void,
    modelOverride?: string,
  ): Promise<string> {
    let lastError = "";

    for (const endpoint of this.resolveModelApiEndpoints()) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.modelApiKey}`,
        };

        if (this.modelApiSiteUrl) {
          headers["HTTP-Referer"] = this.modelApiSiteUrl;
        }

        if (this.modelApiAppName) {
          headers["X-Title"] = this.modelApiAppName;
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: (modelOverride || "").trim() || this.modelApiModel,
            messages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `HTTP ${response.status} ${response.statusText}: ${errText}`;
          continue;
        }

        let fullText = "";
        let receivedDelta = false;

        await this.readResponseLines(response, (line) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) return;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") return;

          try {
            const data = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = data.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              fullText += delta;
              receivedDelta = true;
              onDelta(delta);
            }
          } catch {
            // 忽略无法解析的流式数据块
          }
        });

        if (receivedDelta) {
          return fullText.trim();
        }

        // 流式无增量时退回非流式请求
        const fallback = await this.requestModelApi(messages, modelOverride);
        if (fallback) {
          onDelta(fallback);
          return fallback;
        }

        lastError = "通用 API 返回了空内容";
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(lastError || "通用 API 请求失败");
  }

  private async generateByOptionsStream(
    messages: ChatMessage[],
    options: ChatGenerationOptions,
    onDelta: (delta: string) => void,
  ): Promise<string> {
    if (options.forceProvider === "deepseek") {
      if (!this.isDeepSeekEnabled()) {
        throw new Error("当前未配置 DeepSeek API Key，无法按所选模型执行。");
      }

      try {
        return await this.requestDeepSeekStream(
          messages,
          onDelta,
          options.deepseekModel,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`DeepSeek 调用失败：${msg}`);
      }
    }

    if (options.forceProvider === "api") {
      if (!this.isModelApiEnabled()) {
        throw new Error("当前未配置通用 API Key，无法按所选模型执行。");
      }

      try {
        return await this.requestModelApiStream(
          messages,
          onDelta,
          options.apiModel,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`通用 API 调用失败：${msg}`);
      }
    }

    if (options.forceProvider === "ollama") {
      try {
        return await this.requestOllamaStream(
          messages,
          onDelta,
          options.ollamaModel,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Ollama 调用失败：${msg}`);
      }
    }

    const errors: string[] = [];

    if (this.isModelApiEnabled()) {
      try {
        return await this.requestModelApiStream(
          messages,
          onDelta,
          options.apiModel,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`API: ${msg}`);
      }
    }

    if (this.isDeepSeekEnabled()) {
      try {
        return await this.requestDeepSeekStream(
          messages,
          onDelta,
          options.deepseekModel,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`DeepSeek: ${msg}`);
      }
    }

    try {
      return await this.requestOllamaStream(
        messages,
        onDelta,
        options.ollamaModel,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Ollama: ${msg}`);
    }

    if (!this.isModelApiEnabled() && !this.isDeepSeekEnabled()) {
      throw new Error(
        "未检测到 API Key，且 Ollama 调用失败。请在 .env 中设置 MODEL_API_KEY / DEEPSEEK_API_KEY 或配置 OLLAMA。",
      );
    }

    throw new Error(
      errors.length > 0
        ? `自动选模失败：${errors.join("；")}`
        : "自动选模失败：未获取到可用回复。",
    );
  }

  async generateReplyStream(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
    onDelta: (delta: string) => void = () => {},
  ): Promise<string> {
    const { question, mergedOptions, askedForOllama } = this.resolveInput(
      userInput,
      options,
    );

    if (!question) {
      throw new Error(
        askedForOllama
          ? "请在 ollama 后面补充问题，例如: ollama 解释一下这段代码"
          : "请告诉我你想问什么。",
      );
    }

    const messages = this.buildMessages(
      this.openClawSystemPrompt,
      question,
      conversationHistory,
    );

    return this.generateByOptionsStream(messages, mergedOptions, onDelta);
  }

  private resolveInput(
    userInput: string,
    options: ChatGenerationOptions,
  ): {
    question: string;
    mergedOptions: ChatGenerationOptions;
    askedForOllama: boolean;
  } {
    const rawQuestion = userInput.trim();
    const ollamaWithModelMatch = rawQuestion.match(
      /^ollama:([^\s]+)\s+([\s\S]+)$/i,
    );
    const forceOllamaByPrefix = /^ollama[\s:]+/i.test(rawQuestion);
    const question = ollamaWithModelMatch
      ? ollamaWithModelMatch[2].trim()
      : forceOllamaByPrefix
        ? rawQuestion.replace(/^ollama[\s:]+/i, "").trim()
        : rawQuestion;

    const mergedOptions = forceOllamaByPrefix
      ? {
          ...options,
          forceProvider: "ollama" as const,
          ollamaModel:
            ollamaWithModelMatch?.[1]?.trim() ||
            (options.ollamaModel || "").trim() ||
            undefined,
        }
      : options;

    return {
      question,
      mergedOptions,
      askedForOllama: forceOllamaByPrefix || Boolean(ollamaWithModelMatch),
    };
  }

  async generateReply(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
  ): Promise<string> {
    const { question, mergedOptions, askedForOllama } = this.resolveInput(
      userInput,
      options,
    );

    if (!question) {
      return askedForOllama
        ? "请在 ollama 后面补充问题，例如: ollama 解释一下这段代码"
        : "请告诉我你想问什么。";
    }

    const messages = this.buildMessages(
      this.openClawSystemPrompt,
      question,
      conversationHistory,
    );

    return this.generateByOptions(messages, mergedOptions);
  }

  async generateWithSystemPrompt(
    systemPrompt: string,
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
  ): Promise<string> {
    const question = userInput.trim();

    if (!question) {
      return "请输入要让 skill 处理的任务内容。";
    }

    const messages = this.buildMessages(
      systemPrompt.trim() || this.openClawSystemPrompt,
      question,
      conversationHistory,
    );

    return this.generateByOptions(messages, options);
  }

  async generateWithSystemPromptStream(
    systemPrompt: string,
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: ChatGenerationOptions = {},
    onDelta: (delta: string) => void = () => {},
  ): Promise<string> {
    const question = userInput.trim();

    if (!question) {
      throw new Error("请输入要让 skill 处理的任务内容。");
    }

    const messages = this.buildMessages(
      systemPrompt.trim() || this.openClawSystemPrompt,
      question,
      conversationHistory,
    );

    return this.generateByOptionsStream(messages, options, onDelta);
  }
}
