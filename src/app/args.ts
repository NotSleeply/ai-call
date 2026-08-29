/**
 * AI Call - 命令行参数解析
 *
 * 职责：解析 aic [选项] <问题> 参数，输出干净的提示文本
 */

export type SubcommandName = "commit" | "review" | "config";

export const SUBCOMMANDS: SubcommandName[] = ["commit", "review", "config"];

export const CLI_NAME = "aic";

export interface CliArgs {
  mode: "one-shot" | "help" | "version";
  prompt: string;
  model?: string;
  stream: boolean;
  exec: boolean;
  continueSession: boolean;
  subcommand?: SubcommandName;
  yes: boolean;
  show: boolean;
}

export class CliArgError extends Error {}

export const USAGE_TEXT = `AI Call - 终端 AI 助手

用法:
  ${CLI_NAME} [选项] <问题>              提问并输出回答
  echo <内容> | ${CLI_NAME} <问题>       管道内容作为上下文再提问
  echo <内容> | ${CLI_NAME}              直接处理管道内容
  ${CLI_NAME} -x <任务>                  开启命令执行和文件修改权限
  ${CLI_NAME} -c <问题>                  带上上一次对话的上下文继续提问
  ${CLI_NAME} commit [额外要求]          读取 git 改动生成提交信息，确认后执行 git commit
  ${CLI_NAME} review [路径...]           对未提交改动进行代码评审
  ${CLI_NAME} config                     交互式配置模型（首次使用推荐）

选项:
  -m, --model <名>       指定模型名称，临时覆盖配置
  -x, --exec             开启命令执行和文件修改权限（逐次确认）
  -c, --continue         带上上一次对话的上下文继续提问
  -y, --yes              跳过确认，直接执行（用于 commit 子命令）
      --show             显示当前模型配置（配合 config 子命令）
      --no-stream        等待完整回答后一次性输出（Agent 工具循环本身使用完整响应）
  -h, --help             显示此帮助
  -v, --version          显示版本号

输出约定:
  回答输出到 stdout，可直接重定向或继续管道；
  错误与提示输出到 stderr，不会污染管道。

示例:
  ${CLI_NAME} "tar 解压 tar.gz 的命令是什么"
  git diff | ${CLI_NAME} "生成一行符合规范的 commit message"
  cat error.log | ${CLI_NAME} "总结最核心的报错原因"
  ${CLI_NAME} -x "找出占用 8080 端口的进程并杀掉"
  ${CLI_NAME} "用一句话解释这个报错" && ${CLI_NAME} -c "换一种说法"
  ${CLI_NAME} commit && ${CLI_NAME} commit -y
  ${CLI_NAME} review src/app/one-shot.ts
  ${CLI_NAME} config
`;

export function parseCliArgs(argv: string[]): CliArgs {
  const result: CliArgs = {
    mode: "one-shot",
    prompt: "",
    stream: true,
    exec: false,
    continueSession: false,
    yes: false,
    show: false,
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
      case "--show":
        result.show = true;
        break;
      default:
        if (arg.startsWith("-") && arg !== "-") {
          throw new CliArgError(
            `未知选项: ${arg}，运行 ${CLI_NAME} --help 查看用法`,
          );
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
