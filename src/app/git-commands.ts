/**
 * AI Call - Git 只读子命令（commit / review）
 *
 * 职责：
 * - aic commit: 读取 git 改动并生成提交信息，不执行 git commit
 * - aic review: 对未提交改动进行代码评审
 */
import { spawn } from "child_process";
import { AiCallAssistant } from "./assistant.js";
import { startSpinner } from "./tty.js";
import { CLI_NAME } from "./args.js";
import type { CliArgs } from "./args.js";

const MAX_DIFF_CHARS = 20000;

const COMMIT_PROMPT = `你是 Git 提交信息生成器。

根据提供的 git diff 统计与内容，生成一条规范的提交信息。

要求：
1. 使用约定式提交格式（type: subject），type 从 feat/fix/refactor/docs/style/test/chore/perf 中选择。
2. 主题行不超过 72 个字符，使用中文，不加句号。
3. 改动较复杂时，主题行后空一行，再用 2-5 条要点说明主要变更。
4. 只输出提交信息本身，不要代码块、不要引号包裹、不要任何解释。`;

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

type DiffResult =
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "diff"; stat: string; diff: string };

async function getDiffForCommit(): Promise<DiffResult> {
  const staged = await execGit(["diff", "--cached"]);

  if (staged.ok && staged.stdout.trim()) {
    const stat = await execGit(["diff", "--cached", "--stat"]);
    return {
      kind: "diff",
      stat: stat.stdout,
      diff: staged.stdout,
    };
  }

  const head = await execGit(["diff", "HEAD"]);

  if (!head.ok) {
    const hint = head.stderr.trim() || "git diff 执行失败";
    return { kind: "error", message: `git diff 失败: ${hint}` };
  }

  if (!head.stdout.trim()) {
    return { kind: "empty" };
  }

  const stat = await execGit(["diff", "HEAD", "--stat"]);
  return { kind: "diff", stat: stat.stdout, diff: head.stdout };
}

function buildDiffTask(stat: string, diff: string): string {
  let content = diff;
  if (content.length > MAX_DIFF_CHARS) {
    content = `${content.slice(0, MAX_DIFF_CHARS)}\n\n[diff 过长，已截断]`;
  }

  return `git diff --stat:\n${stat}\n\ngit diff:\n${content}`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```[\w+-]*\s*\r?\n([\s\S]*?)\r?\n?```$/);
  return fence ? fence[1].trim() : trimmed;
}

export async function runCommit(args: CliArgs): Promise<number> {
  const diffResult = await getDiffForCommit();

  if (diffResult.kind === "error") {
    process.stderr.write(`${CLI_NAME}: ${diffResult.message}\n`);
    return 1;
  }

  if (diffResult.kind === "empty") {
    const untracked = await execGit(["ls-files", "--others", "--exclude-standard"]);
    const untrackedCount = untracked.ok
      ? untracked.stdout.split(/\r?\n/).filter((line) => line.trim())
          .length
      : 0;

    if (untrackedCount > 0) {
      process.stdout.write(
        `没有可提交的改动（存在 ${untrackedCount} 个未跟踪文件，如需纳入请先 git add）\n`,
      );
    } else {
      process.stdout.write("没有可提交的改动\n");
    }
    return 0;
  }

  const assistant = new AiCallAssistant();
  const extraRequirement = args.prompt.trim();
  const task =
    buildDiffTask(diffResult.stat, diffResult.diff) +
    (extraRequirement ? `\n\n用户的额外要求：${extraRequirement}` : "");

  const spinner = startSpinner("正在生成提交信息...");

  let message: string;

  try {
    message = await assistant.runSkillTask(
      COMMIT_PROMPT,
      task,
      [],
    );
  } catch (error) {
    spinner?.stop();
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: ${msg}\n`);
    return 1;
  }

  spinner?.stop();
  message = stripCodeFence(message).trim();

  if (!message) {
    process.stderr.write(`${CLI_NAME}: 生成提交信息失败，请检查模型配置\n`);
    return 1;
  }

  if (!message.endsWith("\n")) {
    process.stdout.write(message);
    process.stdout.write("\n");
  } else {
    process.stdout.write(message);
  }
  return 0;
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
