import { CLI_NAME } from "./args.js";
import { askSecret, askText } from "./tty.js";
import type { CliArgs } from "./args.js";
import { PROXY_CONFIG_KEYS } from "../core/config.js";
import {
  readProxyConfiguration,
  saveProxyConfiguration,
  validateProxyUrl,
} from "../core/network/proxy.js";

const PROXY_URL_KEYS = new Set([
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
]);

function isProxyUrlKey(key: string): boolean {
  return PROXY_URL_KEYS.has(key);
}

export function maskProxyUrl(value: string): string {
  try {
    const url = new URL(value);
    const hasCredentials = Boolean(url.username || url.password);
    const suffix = `${url.pathname === "/" ? "" : url.pathname}${url.search}${url.hash}`;
    return `${url.protocol}//${hasCredentials ? "[认证信息已隐藏]@" : ""}${url.host}${suffix}`;
  } catch {
    return "（格式无效）";
  }
}

function displayProxyValue(key: string, value: string): string {
  if (!value) {
    return "（未设置）";
  }

  return isProxyUrlKey(key) ? maskProxyUrl(value) : value;
}

function showProxyConfiguration(): void {
  const configuration = readProxyConfiguration();

  process.stdout.write("当前代理配置:\n");
  for (const key of PROXY_CONFIG_KEYS) {
    const entry = configuration.entries[key];
    process.stdout.write(
      `${key}: ${displayProxyValue(key, entry.value)} [${entry.source}]\n`,
    );
  }
  process.stdout.write(`配置文件: ${configuration.configPath}\n`);
}

function promptValueLabel(
  key: string,
  value: string,
  source: string,
): string {
  if (!value) {
    return "未设置";
  }

  return `${displayProxyValue(key, value)}，来源：${source}`;
}

async function askProxyValue(
  key: (typeof PROXY_CONFIG_KEYS)[number],
  currentValue: string,
  currentSource: string,
): Promise<string | undefined> {
  while (true) {
    const prompt = `${key}（当前 ${promptValueLabel(
      key,
      currentValue,
      currentSource,
    )}；回车保留，输入 - 清除本地配置）: `;
    const entered = (
      isProxyUrlKey(key) ? await askSecret(prompt) : await askText(prompt)
    ).trim();

    if (!entered) {
      return undefined;
    }
    if (entered === "-") {
      return "";
    }

    if (isProxyUrlKey(key) && !validateProxyUrl(entered)) {
      process.stderr.write(
        `${CLI_NAME}: ${key} 必须是有效的 http:// 或 https:// 代理地址，请重新输入。\n`,
      );
      continue;
    }

    return entered;
  }
}

async function runInteractiveProxySetup(): Promise<number> {
  const configPath = readProxyConfiguration().configPath;
  const current = readProxyConfiguration();
  const updates: Partial<
    Record<(typeof PROXY_CONFIG_KEYS)[number], string>
  > = {};

  process.stderr.write(
    "配置网络代理；代理地址支持 http:// 或 https://，输入 - 可清除本地配置。\n",
  );

  for (const key of PROXY_CONFIG_KEYS) {
    const value = await askProxyValue(
      key,
      current.entries[key].value,
      current.entries[key].source,
    );
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  try {
    saveProxyConfiguration(updates, configPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: 保存代理配置失败: ${message}\n`);
    return 1;
  }

  process.stdout.write(`代理配置已保存到 ${configPath}\n`);
  showProxyConfiguration();
  return 0;
}

export async function runProxy(args: CliArgs): Promise<number> {
  if (!args.initConfig) {
    showProxyConfiguration();
    return 0;
  }

  if (process.stdin.isTTY !== true) {
    showProxyConfiguration();
    process.stderr.write(
      `${CLI_NAME}: 代理交互配置需要终端，请设置 HTTPS_PROXY、HTTP_PROXY、ALL_PROXY 和 NO_PROXY，或在终端运行 ${CLI_NAME} proxy --init。\n`,
    );
    return 1;
  }

  return runInteractiveProxySetup();
}
