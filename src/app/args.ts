/**
 * SmallClaw - 命令行参数解析
 *
 * 职责：解析 sc [选项] <问题> 参数，输出干净的提示文本
 */

export type ProviderName = "auto" | "deepseek" | "api" | "ollama";

export type SubcommandName = "commit" | "review";

export const SUBCOMMANDS: SubcommandName[] = ["commit", "review"];

export interface CliArgs {
  mode: "one-shot" | "interactive" | "help" | "version";
  prompt: string;
  provider: ProviderName;
  model?: string;
  stream: boolean;
  exec: boolean;
  continueSession: boolean;
  subcommand?: SubcommandName;
  yes: boolean;
}

export class CliArgError extends Error {}

export const USAGE_TEXT = `SmallClaw - 大虾 AI 终端助手

用法:
  sc [选项] <问题>              提问并流式输出回答
  echo <内容> | sc <问题>       管道内容作为上下文再提问
  echo <内容> | sc              直接处理管道内容
  sc -x <任务>                  生成命令，确认后执行
  sc -c <问题>                  带上上一次对话的上下文继续提问
  sc commit [额外要求]          读取 git 改动生成提交信息，确认后执行 git commit
  sc review [路径...]           对未提交改动进行代码评审
  sc -i                         进入交互式 REPL（旧模式）

选项:
  -p, --provider <名>    指定模型提供方: auto | deepseek | api | ollama（默认 auto）
  -m, --model <名>       指定模型名称，覆盖 .env 中的配置
  -x, --exec             生成命令并确认后执行
  -c, --continue         带上上一次对话的上下文继续提问
  -y, --yes              跳过确认，直接执行（用于 commit 子命令）
      --no-stream        禁用流式输出，等待完整回答后一次性输出
  -i, --interactive      进入交互式 REPL
  -h, --help             显示此帮助
  -v, --version          显示版本号

输出约定:
  回答输出到 stdout，可直接重定向或继续管道；
  错误与提示输出到 stderr，不会污染管道。

示例:
  sc "tar 解压 tar.gz 的命令是什么"
  git diff | sc "生成一行符合规范的 commit message"
  cat error.log | sc "总结最核心的报错原因"
  sc -x "找出占用 8080 端口的进程并杀掉"
  sc "用一句话解释这个报错" && sc -c "换一种说法"
  sc commit && sc commit -y
  sc review src/app/cli.ts
`;

const PROVIDERS: ProviderName[] = ["auto", "deepseek", "api", "ollama"];

export function parseCliArgs(argv: string[]): CliArgs {
  const result: CliArgs = {
    mode: "one-shot",
    prompt: "",
    provider: "auto",
    stream: true,
    exec: false,
    continueSession: false,
    yes: false,
  };

  const promptParts: string[] = [];
  let onlyPositional = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (onlyPositional) {
      promptParts.push(arg);
      continue;
    }

    switch (arg) {
      case "--":
        onlyPositional = true;
        break;
      case "-h":
      case "--help":
        result.mode = "help";
        return result;
      case "-v":
      case "--version":
        result.mode = "version";
        return result;
      case "-i":
      case "--interactive":
        result.mode = "interactive";
        return result;
      case "-p":
      case "--provider": {
        const value = argv[++i];
        if (!value || !PROVIDERS.includes(value as ProviderName)) {
          throw new CliArgError(
            `无效的 provider: ${value || "（空）"}，可选值: auto | deepseek | api | ollama`,
          );
        }
        result.provider = value as ProviderName;
        break;
      }
      case "-m":
      case "--model": {
        const value = argv[++i];
        if (!value || value.startsWith("-")) {
          throw new CliArgError("--model 需要一个模型名称参数");
        }
        result.model = value;
        break;
      }
      case "--no-stream":
        result.stream = false;
        break;
      case "-x":
      case "--exec":
        result.exec = true;
        break;
      case "-c":
      case "--continue":
        result.continueSession = true;
        break;
      case "-y":
      case "--yes":
        result.yes = true;
        break;
      default:
        if (arg.startsWith("-") && arg !== "-") {
          throw new CliArgError(`未知选项: ${arg}，运行 sc --help 查看用法`);
        }
        if (
          !onlyPositional &&
          result.subcommand === undefined &&
          (SUBCOMMANDS as string[]).includes(arg)
        ) {
          result.subcommand = arg as SubcommandName;
        } else {
          promptParts.push(arg);
        }
    }
  }

  result.prompt = promptParts.join(" ").trim();
  return result;
}
