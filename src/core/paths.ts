import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, copyFileSync } from "fs";

export function resolveDataDir(): string {
  return process.env.AI_CALL_DATA_DIR ?? join(homedir(), ".ai-call", "data");
}

export function resolveLegacyDbPath(moduleDir: string): string {
  return join(moduleDir, "..", "..", "..", "data", "daxia.db");
}

export function migrateLegacyData(
  targetDir: string,
  legacyDbPath: string,
): void {
  if (!existsSync(legacyDbPath)) return;
  if (existsSync(join(targetDir, "daxia.db"))) return;
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(legacyDbPath, join(targetDir, "daxia.db"));
}
