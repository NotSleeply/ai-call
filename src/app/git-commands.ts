/**
 * AI Call - Git 只读子命令（review）
 *
 * 职责：
 * - aic review: 对未提交改动进行代码评审
 */
import { spawn } from "child_process";
import { AiCallAssistant } from "./assistant.js";
import { startSpinner } from "./tty.js";
import { CLI_NAME } from "./args.js";
import type { CliArgs } from "./args.js";

const MAX_DIFF_CHARS = 20000;

const REVIEW_PROMPT = `你是资深代码评审专家。

根据提供的 git diff 统计与内容，对本次改动进行代码评审。

要求：
1. 先给出总体评价（1-2 句）。
2. 列出发现的问题，按严重程度排序（高/中/低），每条注明涉及的文件或代码位置。
3. 给出具体改进建议。
4. 指出做得好的地方（至少 1 条）。
5. 使用中文，简洁直接，不输出任何前言。`;

interface ExecGitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function execGit(args: string[]): Promise<ExecGitResult> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { windowsHide: true });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      resolve({ ok: false, stdout: "", stderr: error.message });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, stdout, stderr });
    });
  });
}

function buildDiffTask(stat: string, diff: string): string {
  let content = diff;
  if (content.length > MAX_DIFF_CHARS) {
    content = `${content.slice(0, MAX_DIFF_CHARS)}\n\n[diff 过长，已截断]`;
  }

  return `git diff --stat:\n${stat}\n\ngit diff:\n${content}`;
}

export async function runReview(args: CliArgs): Promise<number> {
  const pathFilter = args.prompt.trim();
  const diffArgs = ["diff", "HEAD"];

  if (pathFilter) {
    diffArgs.push("--", ...pathFilter.split(/\s+/));
  }

  const diff = await execGit(diffArgs);

  if (!diff.ok) {
    const hint = diff.stderr.trim() || "git diff 执行失败";
    process.stderr.write(`${CLI_NAME}: git diff 失败: ${hint}\n`);
    return 1;
  }

  if (!diff.stdout.trim()) {
    process.stdout.write("没有可评审的改动\n");
    return 0;
  }

  const statArgs = ["diff", "HEAD", "--stat"];

  if (pathFilter) {
    statArgs.push("--", ...pathFilter.split(/\s+/));
  }

  const stat = await execGit(statArgs);
  const task = buildDiffTask(stat.stdout, diff.stdout);

  const assistant = new AiCallAssistant();
  const spinner = startSpinner("正在评审代码...");

  try {
    const answer = await assistant.runSkillTaskStream(
      REVIEW_PROMPT,
      task,
      [],
      (delta) => {
        if (spinner?.isSpinning) {
          spinner.stop();
        }
        process.stdout.write(delta);
      },
    );

    if (answer && !answer.endsWith("\n")) {
      process.stdout.write("\n");
    }

    return 0;
  } catch (error) {
    spinner?.stop();
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: ${msg}\n`);
    return 1;
  }
}
