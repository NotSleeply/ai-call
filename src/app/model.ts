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
import { askSecret, askText } from "./tty.js";
import type { CliArgs } from "./args.js";
import { OpenClawClient } from "../core/ai/openClawClient.js";

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

export function isCompleteModelConfig(
  modelName: string,
  baseUrl: string,
  apiKey: string,
): boolean {
  return Boolean(
    modelName.trim() && validateBaseUrl(baseUrl.trim()) && apiKey.trim(),
  );
}

export function hasApiKey(content: string): boolean {
  const values = envMap(parseEnvLines(content));
  return Boolean(values.get("AIC_API_KEY")?.trim());
}

interface CurrentModelConfig {
  content: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

function readCurrentModelConfig(): CurrentModelConfig {
  const { content, values } = readUserConfig();
  return {
    content,
    model: effectiveValue("AIC_MODEL", values),
    baseUrl: effectiveValue("AIC_BASE_URL", values),
    apiKey: effectiveValue("AIC_API_KEY", values),
  };
}

function showModel(config = readCurrentModelConfig()): void {
  const model = config.model || DEFAULT_MODEL;
  const baseUrl = config.baseUrl || DEFAULT_API_BASE_URL;
  const apiKey = config.apiKey;

  process.stdout.write("当前模型配置:\n");
  process.stdout.write(`模型: ${model}\n`);
  process.stdout.write(`API 地址: ${baseUrl}\n`);
  process.stdout.write(`API Key: ${maskSecret(apiKey)}\n`);
  process.stdout.write(`配置文件: ${resolveConfigPath()}\n`);
}

function writeMissingKeyHint(configPath: string): void {
  process.stderr.write(
    `${CLI_NAME}: 未配置 AIC_API_KEY，请运行 ${CLI_NAME} model 完成首次配置，或在环境变量和 ${configPath} 中配置。\n`,
  );
}

function writeInteractiveSetupHint(configPath: string): void {
  process.stderr.write(
    `${CLI_NAME}: 当前模型配置不完整，请在交互终端运行 ${CLI_NAME} model 完成模型、API 地址和 API Key 配置；非交互环境请设置 AIC_MODEL、AIC_BASE_URL 和 AIC_API_KEY，或编辑 ${configPath}。\n`,
  );
}

async function askRequiredText(
  prompt: string,
  label: string,
  currentValue = "",
): Promise<string> {
  while (true) {
    const enteredValue = (await askText(prompt)).trim();
    const value = enteredValue || currentValue;
    if (value) {
      return value;
    }

    if (!value) {
      process.stderr.write(`${CLI_NAME}: ${label}不能为空，请重新输入。\n`);
    }
  }
}

async function runInteractiveModelSetup(
  config: CurrentModelConfig,
): Promise<number> {
  const configPath = resolveConfigPath();
  process.stderr.write("首次配置 AI Call，请依次输入以下内容：\n");

  const modelPrompt = config.model
    ? "1/3 模型名称（回车保留当前值）: "
    : "1/3 模型名称: ";
  const modelName = await askRequiredText(modelPrompt, "模型名称", config.model);

  let baseUrl = "";
  while (!baseUrl) {
    const prompt = config.baseUrl
      ? "2/3 API 地址（回车保留当前值）: "
      : "2/3 API 地址: ";
    const entered = await askText(prompt);
    const candidate = entered || config.baseUrl;
    if (validateBaseUrl(candidate)) {
      baseUrl = candidate;
      continue;
    }

    process.stderr.write(
      `${CLI_NAME}: API 地址必须是有效的 http:// 或 https:// 地址，请重新输入。\n`,
    );
  }

  let enteredApiKey = "";
  if (config.apiKey) {
    enteredApiKey = (await askSecret(
      "3/3 API Key（回车保留当前值，输入时不显示）: ",
    )).trim();
  } else {
    enteredApiKey = await askRequiredSecret();
  }

  return saveModelConfigAndMaybeTest(
    configPath,
    config.content,
    modelName,
    baseUrl,
    enteredApiKey || undefined,
  );
}

async function askRequiredSecret(): Promise<string> {
  while (true) {
    const value = (await askSecret("3/3 API Key（输入时不显示）: ")).trim();
    if (value) {
      return value;
    }
    process.stderr.write(`${CLI_NAME}: API Key 不能为空，请重新输入。\n`);
  }
}

export function isConfirmationAnswer(value: string): boolean {
  return value.trim().toLowerCase() === "y";
}

async function testCurrentModelConnection(): Promise<void> {
  await new OpenClawClient().testConnection();
}

export async function askToTestModelConnection(
  ask: (prompt: string) => Promise<string> = askText,
  testConnection: () => Promise<void> = testCurrentModelConnection,
): Promise<number> {
  const answer = await ask("是否立即测试模型连接？(y/N): ");
  if (!isConfirmationAnswer(answer)) {
    return 0;
  }

  process.stderr.write("正在测试模型连接...\n");

  try {
    await testConnection();
    process.stdout.write("模型连接测试成功。\n");
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: 模型连接测试失败: ${message}\n`);
    return 1;
  }
}

function saveModelConfig(
  configPath: string,
  content: string,
  modelName: string,
  baseUrl: string,
  enteredApiKey?: string,
): number {
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

async function saveModelConfigAndMaybeTest(
  configPath: string,
  content: string,
  modelName: string,
  baseUrl: string,
  enteredApiKey?: string,
): Promise<number> {
  const result = saveModelConfig(
    configPath,
    content,
    modelName,
    baseUrl,
    enteredApiKey,
  );

  if (result !== 0 || process.stdin.isTTY !== true) {
    return result;
  }

  return askToTestModelConnection();
}

export async function runModel(args: CliArgs): Promise<number> {
  const modelName = args.modelName?.trim() ?? "";

  if (!modelName) {
    const current = readCurrentModelConfig();
    if (
      !args.initConfig &&
      isCompleteModelConfig(current.model, current.baseUrl, current.apiKey)
    ) {
      showModel(current);
      return 0;
    }

    if (process.stdin.isTTY !== true) {
      showModel(current);
      writeInteractiveSetupHint(resolveConfigPath());
      return 1;
    }

    return runInteractiveModelSetup(current);
  }

  const baseUrl = args.baseUrl?.trim() ?? "";
  if (!validateBaseUrl(baseUrl)) {
    process.stderr.write(
      `${CLI_NAME}: --base-url 必须是有效的 http:// 或 https:// 地址\n`,
    );
    return 1;
  }

  const current = readCurrentModelConfig();
  const configPath = resolveConfigPath();
  const existingApiKey = current.apiKey;
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

  return saveModelConfigAndMaybeTest(
    configPath,
    current.content,
    modelName,
    baseUrl,
    enteredApiKey || undefined,
  );
}
