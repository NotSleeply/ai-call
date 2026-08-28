/**
 * AI Call - 交互式模型配置向导（aic config）
 *
 * 职责：
 * - 引导用户选择模型提供方并填写 Key/地址/模型
 * - 写入用户级配置 ~/.ai-call/.env（保留已有键与注释）
 * - 支持立即测试连接；--show 查看当前配置（密钥脱敏）
 * - 非 TTY 环境支持管道逐行输入答案（便于脚本化）
 */
import { createInterface } from "readline";
import { homedir } from "os";
import { join, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { OpenClawClient } from "../core/ai/openClawClient.js";
import { CLI_NAME } from "./args.js";
import { startSpinner } from "./tty.js";
import type { CliArgs } from "./args.js";

type ProviderId = "api" | "deepseek" | "ollama";

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";

interface FieldSpec {
  key: string;
  label: string;
  secret?: boolean;
  defaultFor(env: Map<string, string>): string;
}

interface ProviderSpec {
  id: ProviderId;
  name: string;
  desc: string;
  fields: FieldSpec[];
}

export const PROVIDERS: ProviderSpec[] = [
  {
    id: "api",
    name: "通用 API（OpenAI 兼容）",
    desc: "OpenRouter / OpenAI / Kimi 等",
    fields: [
      {
        key: "MODEL_API_KEY",
        label: "API Key",
        secret: true,
        defaultFor: () => "",
      },
      {
        key: "MODEL_API_BASE_URL",
        label: "API 地址",
        defaultFor: (env) =>
          env.get("MODEL_API_BASE_URL") ?? "https://openrouter.ai/api/v1",
      },
      {
        key: "MODEL_API_MODEL",
        label: "模型名",
        defaultFor: (env) => env.get("MODEL_API_MODEL") ?? "gpt-5-mini",
      },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    desc: "api.deepseek.com",
    fields: [
      {
        key: "DEEPSEEK_API_KEY",
        label: "API Key",
        secret: true,
        defaultFor: () => "",
      },
      {
        key: "DEEPSEEK_MODEL",
        label: "模型名",
        defaultFor: (env) =>
          env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL,
      },
    ],
  },
  {
    id: "ollama",
    name: "Ollama（本地）",
    desc: "http://127.0.0.1:11434",
    fields: [
      {
        key: "OLLAMA_HOST",
        label: "服务地址",
        defaultFor: (env) =>
          env.get("OLLAMA_HOST") ?? "http://127.0.0.1:11434",
      },
      {
        key: "OLLAMA_MODEL",
        label: "模型名",
        defaultFor: (env) => env.get("OLLAMA_MODEL") ?? "qwen3:latest",
      },
    ],
  },
];

interface EnvLine {
  raw: string;
  key: string | null;
}

function parseEnvLines(content: string): EnvLine[] {
  if (!content.trim()) {
    return [];
  }
  return content.split(/\r?\n/).map((raw) => {
    const match = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    return { raw, key: match ? match[1] : null };
  });
}

function renderEnvLines(
  lines: EnvLine[],
  updates: Map<string, string>,
): string {
  const handled = new Set<string>();
  const output: string[] = [];

  for (const line of lines) {
    if (line.key && updates.has(line.key)) {
      output.push(`${line.key}=${updates.get(line.key)}`);
      handled.add(line.key);
    } else {
      output.push(line.raw);
    }
  }

  for (const [key, value] of updates) {
    if (!handled.has(key)) {
      output.push(`${key}=${value}`);
    }
  }

  return output.join("\n").trimEnd() + "\n";
}

function resolveConfigPath(): string {
  return join(homedir(), ".ai-call", ".env");
}

function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "****";
  }
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function showConfig(): void {
  const configPath = resolveConfigPath();

  if (!existsSync(configPath)) {
    console.log(
      `尚未配置模型（未找到 ${configPath}），运行 ${CLI_NAME} config 快速配置`,
    );
    return;
  }

  console.log(`配置文件: ${configPath}`);

  for (const line of parseEnvLines(readFileSync(configPath, "utf8"))) {
    if (!line.key) {
      continue;
    }
    const value = line.raw.slice(line.raw.indexOf("=") + 1).trim();
    const isSecret = /KEY|TOKEN|SECRET|PASSWORD/i.test(line.key);
    console.log(`${line.key}=${isSecret ? maskSecret(value) : value}`);
  }
}

interface Asker {
  ask(question: string): Promise<string>;
  close(): void;
}

function createTtyAsker(): Asker {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    ask: (question) =>
      new Promise<string>((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
      }),
    close: () => rl.close(),
  };
}

function createPipedAsker(): Asker {
  const chunks: Buffer[] = [];
  const pending: string[] = [];
  let ready: Promise<void> | null = null;

  ready = (async () => {
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    for (const line of Buffer.concat(chunks).toString("utf8").split(/\r?\n/)) {
      pending.push(line);
    }
  })();

  return {
    ask: async () => {
      await ready;
      return (pending.shift() ?? "").trim();
    },
    close: () => {},
  };
}

async function testConnection(
  providerId: ProviderId,
  updates: Map<string, string>,
): Promise<void> {
  for (const [key, value] of updates) {
    process.env[key] = value;
  }

  const client = new OpenClawClient();
  const spinner = startSpinner("正在测试连接...");

  try {
    const reply = await client.generateReply("只回复两个字:成功", [], {
      forceProvider: providerId,
    });

    spinner?.stop();

    if (reply.includes("成功")) {
      console.log(`  ✅ 连接正常，模型回复: ${reply.trim()}\n`);
    } else {
      console.log(`  ⚠️ 连接异常: ${reply.trim().slice(0, 120)}\n`);
    }
  } catch (error) {
    spinner?.stop();
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ 连接失败: ${msg}\n`);
  }
}

async function runWizard(): Promise<number> {
  const asker =
    process.stdin.isTTY === true ? createTtyAsker() : createPipedAsker();

  try {
    console.log("\n  AI Call 模型配置向导\n");

    PROVIDERS.forEach((provider, index) => {
      console.log(`  ${index + 1}) ${provider.name}   ${provider.desc}`);
    });

    const choiceRaw = await asker.ask(
      `\n  选择模型提供方 [1-${PROVIDERS.length}] (默认 1): `,
    );

    const parsed = Number.parseInt(choiceRaw || "1", 10);
    const index = Number.isInteger(parsed)
      ? Math.min(Math.max(parsed - 1, 0), PROVIDERS.length - 1)
      : 0;

    const provider = PROVIDERS[index];

    const configPath = resolveConfigPath();
    const existing = existsSync(configPath)
      ? readFileSync(configPath, "utf8")
      : "";

    const lines = parseEnvLines(existing);
    const env = new Map<string, string>();

    for (const line of lines) {
      if (line.key) {
        env.set(line.key, line.raw.slice(line.raw.indexOf("=") + 1).trim());
      }
    }

    const updates = new Map<string, string>();

    for (const field of provider.fields) {
      const defaultValue = field.defaultFor(env);
      const question = field.secret
        ? `  ${field.label}（必填）: `
        : `  ${field.label} [${defaultValue}]: `;

      const answer = await asker.ask(question);

      if (field.secret && !answer) {
        console.log(`  ❌ ${field.label} 不能为空\n`);
        return 1;
      }

      updates.set(field.key, answer || defaultValue);
    }

    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, renderEnvLines(lines, updates), "utf8");

    console.log(`\n  ✅ 配置已保存到 ${configPath}\n`);

    const testAnswer = await asker.ask("  是否立即测试连接? [y/N]: ");

    if (/^(y|yes|是)$/i.test(testAnswer)) {
      await testConnection(provider.id, updates);
    }

    return 0;
  } finally {
    asker.close();
  }
}

export function runConfig(args: CliArgs): Promise<number> | number {
  if (args.show) {
    showConfig();
    return 0;
  }

  return runWizard();
}
