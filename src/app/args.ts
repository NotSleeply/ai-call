/**
 * AI Call - 命令行参数解析
 *
 * 职责：解析 aic [选项] <问题> 参数，输出干净的提示文本
 */

export type SubcommandName = "model" | "proxy" | "clear";

export const SUBCOMMANDS: SubcommandName[] = ["model", "proxy", "clear"];

export const CLI_NAME = "aic";

export interface CliArgs {
  mode: "one-shot" | "help" | "version";
  prompt: string;
  modelName?: string;
  baseUrl?: string;
  continueSession: boolean;
  initConfig: boolean;
  subcommand?: SubcommandName;
}

export class CliArgError extends Error {}

export const USAGE_TEXT = `AI Call - 终端 AI 助手

用法:
  ${CLI_NAME} [选项] <问题>              提问并输出回答
  echo <内容> | ${CLI_NAME} <问题>       管道内容作为上下文再提问
  echo <内容> | ${CLI_NAME}              直接处理管道内容
  ${CLI_NAME} -c <问题>                  带上上一次对话的上下文继续提问
  ${CLI_NAME} model                      查看配置；不完整时进入交互配置
  ${CLI_NAME} model --init                强制进入交互配置
  ${CLI_NAME} model <名称> --base-url <地址>  非交互设置当前模型和 API 地址
  ${CLI_NAME} proxy                       查看当前代理配置
  ${CLI_NAME} proxy --init                交互配置标准网络代理
  ${CLI_NAME} clear                       清空本地 -c 对话历史

选项:
  -c, --continue         带上上一次对话的上下文继续提问
      --base-url <地址>  设置模型使用的 OpenAI-compatible API 地址（配合 model 子命令）
  -h, --help             显示此帮助
  -v, --version          显示版本号

输出约定:
  回答输出到 stdout，可直接重定向或继续管道；
  错误与提示输出到 stderr，不会污染管道。

示例:
  ${CLI_NAME} "tar 解压 tar.gz 的命令是什么"
  git diff | ${CLI_NAME} "生成一行符合规范的 commit message"
  cat error.log | ${CLI_NAME} "总结最核心的报错原因"
  ${CLI_NAME} "用一句话解释这个报错" && ${CLI_NAME} -c "换一种说法"
  ${CLI_NAME} model deepseek-chat --base-url https://api.deepseek.com/v1
`;

export function parseCliArgs(argv: string[]): CliArgs {
  const result: CliArgs = {
    mode: "one-shot",
    prompt: "",
    continueSession: false,
    initConfig: false,
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
      case "--base-url": {
        const value = argv[++i];
        if (!value || value.startsWith("-")) {
          throw new CliArgError("--base-url 需要一个 API 地址参数");
        }
        result.baseUrl = value;
        break;
      }
      case "--init":
        result.initConfig = true;
        break;
      case "-c":
      case "--continue":
        result.continueSession = true;
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

  if (
    result.initConfig &&
    result.subcommand !== "model" &&
    result.subcommand !== "proxy"
  ) {
    throw new CliArgError("--init 只能配合 model 或 proxy 子命令使用");
  }

  if (result.subcommand === "model") {
    if (result.initConfig && (promptParts.length > 0 || result.baseUrl)) {
      throw new CliArgError("model --init 不能同时提供模型名称或 --base-url");
    }

    if (promptParts.length > 1) {
      throw new CliArgError("model 子命令最多接受一个模型名称");
    }

    result.modelName = promptParts[0]?.trim();
    result.prompt = "";

    if (result.modelName && !result.baseUrl) {
      throw new CliArgError("设置模型时必须同时提供 --base-url <地址>");
    }

    if (!result.modelName && result.baseUrl) {
      throw new CliArgError("设置 API 地址时必须同时提供模型名称");
    }
  } else if (result.subcommand === "proxy") {
    if (promptParts.length > 0) {
      throw new CliArgError("proxy 子命令不接受参数");
    }

    if (result.baseUrl) {
      throw new CliArgError("--base-url 只能配合 model 子命令使用");
    }

    if (result.continueSession) {
      throw new CliArgError("proxy 子命令不能配合 -c");
    }

    result.prompt = "";
  } else if (result.subcommand === "clear") {
    if (promptParts.length > 0) {
      throw new CliArgError("clear 子命令不接受问题参数");
    }

    if (result.baseUrl) {
      throw new CliArgError("--base-url 只能配合 model 子命令使用");
    }

    if (result.continueSession) {
      throw new CliArgError("clear 子命令不能配合 -c");
    }

    result.prompt = "";
  } else if (result.baseUrl) {
    throw new CliArgError("--base-url 只能配合 model 子命令使用");
  }

  return result;
}
