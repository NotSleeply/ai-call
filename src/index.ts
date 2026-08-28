#!/usr/bin/env node
/**
 * SmallClaw - 应用入口
 *
 * 职责：解析命令行参数，分发到一次性模式（默认）或交互式 REPL
 */
import { CliArgError, parseCliArgs, USAGE_TEXT } from "./app/args.js";
import { runOneShot } from "./app/one-shot.js";

const VERSION = "1.0.0";

async function main(): Promise<void> {
  let args;

  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof CliArgError) {
      process.stderr.write(`sc: ${error.message}\n\n`);
      process.stderr.write(USAGE_TEXT);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  switch (args.mode) {
    case "help":
      process.stdout.write(USAGE_TEXT);
      return;
    case "version":
      process.stdout.write(`sc ${VERSION}\n`);
      return;
    case "interactive": {
      // 延迟加载 REPL，避免一次性模式承担数据库启动开销
      const { SmallClawCLI } = await import("./app/cli.js");
      const cli = new SmallClawCLI();
      await cli.start();
      return;
    }
    case "one-shot":
      process.exitCode = await runOneShot(args);
      return;
  }
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`sc: ${msg}\n`);
  process.exitCode = 1;
});
