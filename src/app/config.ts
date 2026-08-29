/**
 * AI Call - 单一 OpenAI-compatible API 配置向导（aic config）
 *
 * 配置只包含 API Key、API 地址和模型名。DeepSeek、OpenRouter 等服务只要
 * 提供 OpenAI-compatible 接口，就使用同一组配置，不再按厂商分支。
 */
import { createInterface } from "readline";
import { homedir } from "os";
import { join, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { OpenClawClient } from "../core/ai/openClawClient.js";
import { CLI_NAME } from "./args.js";
import { startSpinner } from "./tty.js";
import type { CliArgs } from "./args.js";

export const DEFAULT_API_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_MODEL = "gpt-5-mini";

export const CONFIG_KEYS = [
  "AIC_API_KEY",
  "AIC_BASE_URL",
  "AIC_MODEL",
] as const;

interface EnvLine {
  raw: string;
  key: string | null;
}

interface ConfigField {
  key: (typeof CONFIG_KEYS)[number];
  label: string;
  secret?: boolean;
  defaultValue: string;
}

const CONFIG_FIELDS: ConfigField[] = [
  { key: "AIC_API_KEY", label: "API Key", secret: true, defaultValue: "" },
  {
    key: "AIC_BASE_URL",
    label: "API 地址",
    defaultValue: DEFAULT_API_BASE_URL,
  },
  { key: "AIC_MODEL", label: "模型名", defaultValue: DEFAULT_MODEL },
];

function parseEnvLines(content: string): EnvLine[] {
  if (!content) {
    return [];
  }

  return content.split(/\r?\n/).map((raw) => {
    const match = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    return { raw, key: match ? match[1] : null };
  });
}

function envMap(lines: EnvLine[]): Map<string, string> {
  const values = new Map<string, string>();

  for (const line of lines) {
    if (line.key) {
      values.set(line.key, line.raw.slice(line.raw.indexOf("=") + 1).trim());
    }
  }

  return values;
}

function renderEnvLines(
  lines: EnvLine[],
  updates: Map<string, string>,
): string {
  const handled = new Set<string>();
  const output: string[] = [];

  for (const line of lines) {
    if (line.key && updates.has(line.key)) {
      output.push(`${line.key}=${updates.get(line.key) ?? ""}`);
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

export function resolveConfigPath(): string {
  return join(homedir(), ".ai-call", ".env");
}

function maskSecret(value: string): string {
  if (!value) {
    return "（未设置）";
  }

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

  const values = envMap(parseEnvLines(readFileSync(configPath, "utf8")));
  console.log(`配置文件: ${configPath}`);

  for (const field of CONFIG_FIELDS) {
    const value = values.get(field.key) ?? "";
    console.log(`${field.key}=${field.secret ? maskSecret(value) : value}`);
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
  const ready = (async () => {
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

let pipedAsker: Asker | null = null;

function createAsker(): Asker {
  if (process.stdin.isTTY === true) {
    return createTtyAsker();
  }

  pipedAsker ??= createPipedAsker();
  return pipedAsker;
}

function validateBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0;
  } catch {
    return false;
  }
}

async function testConnection(updates: Map<string, string>): Promise<void> {
  for (const [key, value] of updates) {
    process.env[key] = value;
  }

  const client = new OpenClawClient();
  const spinner = startSpinner("正在测试连接...");

  try {
    const reply = await client.generateReply("只回复：成功");
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

export function hasConfig(content: string): boolean {
  const values = envMap(parseEnvLines(content));
  return Boolean(values.get("AIC_API_KEY")?.trim());
}

async function runWizard(): Promise<number> {
  const asker = createAsker();

  try {
    console.log("\n  AI Call API 配置向导\n");

    const configPath = resolveConfigPath();
    const existing = existsSync(configPath)
      ? readFileSync(configPath, "utf8")
      : "";
    const existingValues = envMap(parseEnvLines(existing));
    const updates = new Map<string, string>();

    for (const field of CONFIG_FIELDS) {
      const defaultValue = existingValues.get(field.key) || field.defaultValue;
      const question = field.secret
        ? `  ${field.label}（必填）: `
        : `  ${field.label} [${defaultValue}]: `;
      const answer = await asker.ask(question);

      if (field.secret && !answer) {
        console.log(`  ❌ ${field.label} 不能为空\n`);
        return 1;
      }

      const value = answer || defaultValue;

      if (field.key === "AIC_BASE_URL" && !validateBaseUrl(value)) {
        console.log(`  ❌ API 地址无效，必须是 http:// 或 https:// 地址\n`);
        return 1;
      }

      updates.set(field.key, value);
    }

    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, renderEnvLines(parseEnvLines(existing), updates), "utf8");

    console.log(`\n  ✅ 配置已保存到 ${configPath}\n`);

    const testAnswer = await asker.ask("  是否立即测试连接? [y/N]: ");
    if (/^(y|yes|是)$/i.test(testAnswer)) {
      await testConnection(updates);
    }

    return 0;
  } finally {
    asker.close();
  }
}

export async function runConfig(args: CliArgs): Promise<number> {
  if (args.show) {
    showConfig();
    return 0;
  }

  const configPath = resolveConfigPath();
  if (existsSync(configPath) && hasConfig(readFileSync(configPath, "utf8"))) {
    console.log("\n  当前已配置模型:\n");
    showConfig();

    const asker = createAsker();
    try {
      const answer = await asker.ask("\n  是否重新配置? [y/N]: ");
      if (!/^(y|yes|是)$/i.test(answer)) {
        return 0;
      }
    } finally {
      asker.close();
    }
  }

  return runWizard();
}
