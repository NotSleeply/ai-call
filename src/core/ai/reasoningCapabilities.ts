import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { resolveDataDir } from "../paths.js";

export type ReasoningCapability = "supports-none" | "rejects-none";

export const REASONING_CAPABILITY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface ReasoningCapabilityCacheOptions {
  cachePath?: string;
  now?: number;
}

interface ReasoningCapabilityEntry {
  baseUrl: string;
  model: string;
  status: ReasoningCapability;
  timestamp: number;
}

interface ReasoningCapabilityCacheFile {
  entries: ReasoningCapabilityEntry[];
}

export function resolveReasoningCapabilitiesPath(): string {
  return join(resolveDataDir(), "reasoning-capabilities.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function normalizeModel(value: string): string {
  return value.trim();
}

function isReasoningCapability(value: unknown): value is ReasoningCapability {
  return value === "supports-none" || value === "rejects-none";
}

function isFresh(timestamp: number, now: number): boolean {
  return (
    Number.isFinite(timestamp) &&
    now - timestamp < REASONING_CAPABILITY_TTL_MS
  );
}

function isCacheEntry(
  value: unknown,
  now: number,
): value is ReasoningCapabilityEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.baseUrl === "string" &&
    normalizeBaseUrl(value.baseUrl).length > 0 &&
    typeof value.model === "string" &&
    normalizeModel(value.model).length > 0 &&
    isReasoningCapability(value.status) &&
    typeof value.timestamp === "number" &&
    isFresh(value.timestamp, now)
  );
}

function readEntries(
  cachePath: string,
  now: number,
): ReasoningCapabilityEntry[] {
  if (!existsSync(cachePath)) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(cachePath, "utf8"));
    if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
      return [];
    }

    return parsed.entries
      .filter((entry): entry is ReasoningCapabilityEntry =>
        isCacheEntry(entry, now),
      )
      .map((entry) => ({
        baseUrl: normalizeBaseUrl(entry.baseUrl),
        model: normalizeModel(entry.model),
        status: entry.status,
        timestamp: entry.timestamp,
      }));
  } catch {
    return [];
  }
}

function writeEntries(
  cachePath: string,
  entries: ReasoningCapabilityEntry[],
): void {
  try {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(
      cachePath,
      JSON.stringify({ entries } satisfies ReasoningCapabilityCacheFile, null, 2) +
        "\n",
      { encoding: "utf8", mode: 0o600 },
    );
  } catch {
    // 能力缓存只是性能优化，不能因为文件系统问题阻断模型请求。
  }
}

export function getReasoningCapability(
  baseUrl: string,
  model: string,
  options: ReasoningCapabilityCacheOptions = {},
): ReasoningCapability | undefined {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedModel = normalizeModel(model);
  if (!normalizedBaseUrl || !normalizedModel) {
    return undefined;
  }

  const now = options.now ?? Date.now();
  const entries = readEntries(
    options.cachePath ?? resolveReasoningCapabilitiesPath(),
    now,
  );

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (
      entry.baseUrl === normalizedBaseUrl &&
      entry.model === normalizedModel
    ) {
      return entry.status;
    }
  }

  return undefined;
}

export function setReasoningCapability(
  baseUrl: string,
  model: string,
  status: ReasoningCapability,
  options: ReasoningCapabilityCacheOptions = {},
): void {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedModel = normalizeModel(model);
  if (!normalizedBaseUrl || !normalizedModel) {
    return;
  }

  const now = options.now ?? Date.now();
  const cachePath = options.cachePath ?? resolveReasoningCapabilitiesPath();
  const entries = readEntries(cachePath, now).filter(
    (entry) =>
      entry.baseUrl !== normalizedBaseUrl || entry.model !== normalizedModel,
  );

  entries.push({
    baseUrl: normalizedBaseUrl,
    model: normalizedModel,
    status,
    timestamp: now,
  });

  writeEntries(cachePath, entries);
}
