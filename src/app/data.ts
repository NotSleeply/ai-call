import { rmSync } from "node:fs";
import { parse, resolve } from "node:path";
import { CLI_NAME } from "./args.js";
import type { CliArgs } from "./args.js";
import { resolveDataDir } from "../core/paths.js";

function resolveClearTarget(dataDir: string): string {
  if (!dataDir.trim()) {
    throw new Error("本地 data 目录路径为空，已拒绝清除");
  }

  const target = resolve(dataDir);
  if (target === parse(target).root) {
    throw new Error("拒绝清除文件系统根目录");
  }

  if (target === resolve(process.cwd())) {
    throw new Error("拒绝清除当前工作目录");
  }

  return target;
}

export function clearDataDirectory(dataDir = resolveDataDir()): void {
  const target = resolveClearTarget(dataDir);
  rmSync(target, { recursive: true, force: true });
}

export function runData(args: CliArgs): number {
  if (!args.clearData) {
    process.stderr.write(CLI_NAME + ": data 子命令需要配合 --clear 使用\n");
    return 1;
  }

  try {
    clearDataDirectory();
    process.stdout.write(CLI_NAME + ": 已清除本地运行数据\n");
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(CLI_NAME + ": " + message + "\n");
    return 1;
  }
}
