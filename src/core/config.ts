import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { parse as parseDotEnv } from "dotenv";

export const MODEL_CONFIG_KEYS = [
  "AIC_API_KEY",
  "AIC_BASE_URL",
  "AIC_MODEL",
] as const;

export const PROXY_CONFIG_KEYS = [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
] as const;

export const MANAGED_CONFIG_KEYS = [
  ...MODEL_CONFIG_KEYS,
  ...PROXY_CONFIG_KEYS,
] as const;

export type ManagedConfigKey = (typeof MANAGED_CONFIG_KEYS)[number];

export function resolveConfigPath(): string {
  return join(homedir(), ".ai-call", ".env");
}

function isManagedConfigKey(key: string): key is ManagedConfigKey {
  return (MANAGED_CONFIG_KEYS as readonly string[]).includes(key);
}

export function parseConfigValues(content: string): Map<string, string> {
  const values = new Map<string, string>();

  for (const [rawKey, rawValue] of Object.entries(parseDotEnv(content))) {
    const key = rawKey.toUpperCase();
    if (!isManagedConfigKey(key)) {
      continue;
    }

    values.set(key, rawValue.trim());
  }

  return values;
}

export function readConfigValues(configPath = resolveConfigPath()): Map<string, string> {
  const content = existsSync(configPath)
    ? readFileSync(configPath, "utf8")
    : "";

  return parseConfigValues(content);
}

export function renderConfig(values: ReadonlyMap<string, string>): string {
  return (
    MANAGED_CONFIG_KEYS.filter((key) => values.get(key)?.trim())
      .map((key) => `${key}=${values.get(key)?.trim() ?? ""}`)
      .join("\n") + "\n"
  );
}

export function writeConfigValues(
  values: ReadonlyMap<string, string>,
  configPath = resolveConfigPath(),
): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, renderConfig(values), {
    encoding: "utf8",
    mode: 0o600,
  });

  if (process.platform !== "win32") {
    chmodSync(configPath, 0o600);
  }
}
