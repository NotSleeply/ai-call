#!/usr/bin/env node
/**
 * AI Call - 应用入口
 *
 * 职责：解析命令行参数，分发到一次性只读问答或子命令
 */
import { CliArgError, CLI_NAME, parseCliArgs, USAGE_TEXT } from "./app/args.js";
import { runOneShot } from "./app/one-shot.js";
import { runModel } from "./app/model.js";
import { runProxy } from "./app/proxy.js";
import { runClear } from "./app/clear.js";
import { runData } from "./app/data.js";
import { VERSION } from "./version.js";

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
    case "one-shot": {
      if (args.subcommand === "model") {
        process.exitCode = await runModel(args);
      } else if (args.subcommand === "proxy") {
        process.exitCode = await runProxy(args);
      } else if (args.subcommand === "clear") {
        process.exitCode = await runClear();
      } else if (args.subcommand === "data") {
        process.exitCode = await runData(args);
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
