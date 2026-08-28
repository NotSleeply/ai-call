/**
 * AI Call - 命令生成与安全确认执行模式（-x / --exec）
 *
 * 职责：
 * - 调用模型生成可执行命令（专用 system prompt + 代码块约束）
 * - 展示命令并等待用户确认（y 执行，其他取消）
 * - stdin 被管道占用时从控制台（CONIN$ / /dev/tty）读取确认输入
 */
import { spawn } from "child_process";
import { AiCallAssistant } from "./assistant.js";
import { askConfirmation, isConfirmYes, startSpinner } from "./tty.js";
import { buildQuestion, loadRecentHistory, readStdinIfPiped } from "./one-shot.js";
import { CLI_NAME } from "./args.js";
import type { CliArgs } from "./args.js";

const SHELL_INFO = ((): string => {
  if (process.platform === "win32") {
    return "当前操作系统是 Windows，使用 cmd.exe 语法（例如 dir、tasklist、findstr）。不要使用 ls、grep 等 Unix 命令。";
  }
  return `当前操作系统是 ${process.platform}，使用 POSIX shell 语法（bash/sh）。`;
})();

const EXEC_SYSTEM_PROMPT = `你是终端命令生成器。

根据用户的自然语言描述，生成一个可以在终端直接执行的命令。

规则：
1. ${SHELL_INFO}
2. 只输出一个命令，放在 markdown 代码块内（\`\`\`bash 与 \`\`\` 之间）。
3. 不要输出任何解释、说明或注意事项。
4. 涉及删除、覆盖、格式化等危险操作时，优先给出只读或可撤销的替代方案；无法避免时如实给出命令，由用户决定是否执行。
5. 如果用户要求不明确，输出空代码块。`;

export function extractCommand(text: string): { command: string | null; raw: string } {
  const fenceMatch = text.match(
    /```[\w+-]*\s*\r?\n?([\s\S]*?)```/,
  );

  if (fenceMatch) {
    const command = fenceMatch[1].trim();
    return { command: command || null, raw: text };
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // 无代码块时，仅接受不含中文的单行内容作为命令
  if (lines.length === 1 && !/[\u4e00-\u9fff]/.test(lines[0])) {
    return { command: lines[0], raw: text };
  }

  return { command: null, raw: text };
}

/**
 * 从控制台直接读取一行（stdin 被管道占用时使用）。
 * Windows 读 CONIN$，POSIX 读 /dev/tty；失败时返回空串。
 */
function runCommand(command: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      process.stderr.write(`${CLI_NAME}: 执行失败: ${error.message}\n`);
      resolve(1);
    });

    child.on("exit", (code) => {
      resolve(code ?? 1);
    });
  });
}

export async function runExec(args: CliArgs): Promise<number> {
  const stdinText = await readStdinIfPiped();
  const question = (await buildQuestion(args.prompt, stdinText)).trim();

  if (!question) {
    process.stderr.write(
      `${CLI_NAME}: 请提供任务描述，例如: ${CLI_NAME} -x "找出占用 8080 端口的进程"\n`,
    );
    return 1;
  }

  const history = args.continueSession ? await loadRecentHistory() : [];

  const assistant = new AiCallAssistant();
  const options = {
    forceProvider: args.provider === "auto" ? undefined : args.provider,
  };

  if (args.model) {
    Object.assign(options, {
      deepseekModel: args.model,
      apiModel: args.model,
      ollamaModel: args.model,
    });
  }

  const spinner = startSpinner("正在生成命令...");

  let raw: string;

  try {
    raw = await assistant.runSkillTask(EXEC_SYSTEM_PROMPT, question, history, options);
  } catch (error) {
    spinner?.stop();
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: ${msg}\n`);
    return 1;
  }

  spinner?.stop();

  const { command, raw: rawText } = extractCommand(raw);

  if (!command) {
    process.stderr.write(`${CLI_NAME}: 未能从回答中提取出可执行命令，模型原文如下:\n\n`);
    process.stderr.write(`${rawText}\n`);
    return 1;
  }

  process.stdout.write(`$ ${command}\n`);
  const answer = await askConfirmation("执行? [y/N]: ");

  if (answer === "") {
    process.stderr.write(`${CLI_NAME}: 无法读取确认输入，已取消执行\n`);
    return 2;
  }

  if (!isConfirmYes(answer)) {
    process.stderr.write(`${CLI_NAME}: 已取消\n`);
    return 0;
  }

  return runCommand(command);
}
