#!/usr/bin/env node
/**
 * AI Call - 应用入口
 *
 * 职责：解析命令行参数，分发到一次性模式（默认）或交互式 REPL
 */
import { CliArgError, CLI_NAME, parseCliArgs, USAGE_TEXT } from "./app/args.js";
import { runOneShot } from "./app/one-shot.js";
import { runExec } from "./app/exec.js";
import { runCommit, runReview } from "./app/git-commands.js";

const VERSION = "1.0.0";

async function main(): Promise<void> {
  let args;

  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof CliArgError) {
      process.stderr.write(`${CLI_NAME}: ${error.message}\n\n`);
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
      process.stdout.write(`${CLI_NAME} ${VERSION}\n`);
      return;
    case "interactive": {
      // 延迟加载 REPL，避免一次性模式承担数据库启动开销
      const { AiCallCLI } = await import("./app/cli.js");
      const cli = new AiCallCLI();
      await cli.start();
      return;
    }
    case "one-shot": {
      if (args.subcommand === "commit") {
        process.exitCode = await runCommit(args);
      } else if (args.subcommand === "review") {
        process.exitCode = await runReview(args);
      } else if (args.exec) {
        process.exitCode = await runExec(args);
      } else {
        process.exitCode = await runOneShot(args);
      }
      return;
    }
  }
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${CLI_NAME}: ${msg}\n`);
  process.exitCode = 1;
});
