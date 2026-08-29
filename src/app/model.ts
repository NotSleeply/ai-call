/**
 * AI Call - 当前模型配置命令（aic model）
 *
 * 一个用户只保留一组当前配置：API Key、API 地址和模型名。
 * API Key 只在交互终端中输入，不作为命令行参数传递。
 */
import { config as loadDotEnv } from "dotenv";
import { homedir } from "os";
import { join, dirname } from "path";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { CLI_NAME } from "./args.js";
import { askSecret } from "./tty.js";
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

loadDotEnv({
  quiet: true,
  path: [".env", resolveConfigPath()],
});

function readUserConfig(): { content: string; values: Map<string, string> } {
  const configPath = resolveConfigPath();
  const content = existsSync(configPath)
    ? readFileSync(configPath, "utf8")
    : "";

  return { content, values: envMap(parseEnvLines(content)) };
}

function effectiveValue(
  key: (typeof CONFIG_KEYS)[number],
  userValues: Map<string, string>,
): string {
  return (process.env[key]?.trim() || userValues.get(key)?.trim() || "").trim();
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

export function validateBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function hasApiKey(content: string): boolean {
  const values = envMap(parseEnvLines(content));
  return Boolean(values.get("AIC_API_KEY")?.trim());
}

function showModel(): void {
  const { values } = readUserConfig();
  const model = effectiveValue("AIC_MODEL", values) || DEFAULT_MODEL;
  const baseUrl =
    effectiveValue("AIC_BASE_URL", values) || DEFAULT_API_BASE_URL;
  const apiKey = effectiveValue("AIC_API_KEY", values);

  process.stdout.write("当前模型配置:\n");
  process.stdout.write(`模型: ${model}\n`);
  process.stdout.write(`API 地址: ${baseUrl}\n`);
  process.stdout.write(`API Key: ${maskSecret(apiKey)}\n`);
  process.stdout.write(`配置文件: ${resolveConfigPath()}\n`);
}

function writeMissingKeyHint(configPath: string): void {
  process.stderr.write(
    `${CLI_NAME}: 未配置 AIC_API_KEY。交互终端请运行 aic model <模型> --base-url <地址> 并输入；非交互环境请设置环境变量 AIC_API_KEY，或在 ${configPath} 中添加 AIC_API_KEY=...\n`,
  );
}

export async function runModel(args: CliArgs): Promise<number> {
  const modelName = args.modelName?.trim() ?? "";

  if (!modelName) {
    showModel();
    return 0;
  }

  const baseUrl = args.baseUrl?.trim() ?? "";
  if (!validateBaseUrl(baseUrl)) {
    process.stderr.write(
      `${CLI_NAME}: --base-url 必须是有效的 http:// 或 https:// 地址\n`,
    );
    return 1;
  }

  const configPath = resolveConfigPath();
  const { content, values } = readUserConfig();
  const existingApiKey = effectiveValue("AIC_API_KEY", values);
  let enteredApiKey = "";

  if (process.stdin.isTTY === true) {
    const prompt = existingApiKey
      ? "API Key（回车保留当前值，输入时不显示）: "
      : "API Key（输入时不显示）: ";
    enteredApiKey = (await askSecret(prompt)).trim();

    if (!existingApiKey && !enteredApiKey) {
      process.stderr.write(`${CLI_NAME}: API Key 不能为空\n`);
      return 1;
    }
  } else if (!existingApiKey) {
    writeMissingKeyHint(configPath);
    return 1;
  }

  const updates = new Map<string, string>();
  if (enteredApiKey) {
    updates.set("AIC_API_KEY", enteredApiKey);
  }
  updates.set("AIC_BASE_URL", baseUrl);
  updates.set("AIC_MODEL", modelName);

  try {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      renderEnvLines(parseEnvLines(content), updates),
      { encoding: "utf8", mode: 0o600 },
    );
    if (process.platform !== "win32") {
      chmodSync(configPath, 0o600);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: 保存模型配置失败: ${message}\n`);
    return 1;
  }

  process.env.AIC_BASE_URL = baseUrl;
  process.env.AIC_MODEL = modelName;
  if (enteredApiKey) {
    process.env.AIC_API_KEY = enteredApiKey;
  }

  process.stdout.write(`模型配置已保存到 ${configPath}\n`);
  process.stdout.write(`模型: ${modelName}\n`);
  process.stdout.write(`API 地址: ${baseUrl}\n`);
  return 0;
}
