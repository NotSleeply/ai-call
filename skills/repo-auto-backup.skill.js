import { constants } from "fs";
import { access, cp, mkdir } from "fs/promises";
import { basename, dirname, join, resolve } from "path";

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  "backups",
  ".idea",
  ".vscode",
]);

function pad(num) {
  return String(num).padStart(2, "0");
}

function timeTag(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function extractQuotedPath(task) {
  const match = task.match(/["“](.+?)["”]/);
  return match ? match[1] : "";
}

function extractToPath(task) {
  const quoted = extractQuotedPath(task);
  if (quoted) {
    return quoted;
  }

  const flagMatch = task.match(/--to\s+([^\s]+)/i);
  if (flagMatch) {
    return flagMatch[1];
  }

  const cnMatch = task.match(
    /(?:到|备份到|保存到)\s*([A-Za-z]:[\\/][^，。；;\n]+)/,
  );
  if (cnMatch) {
    return cnMatch[1].trim();
  }

  return "";
}

export const skill = {
  name: "repo_auto_backup",
  description:
    "自动备份当前代码仓库到指定目录，并排除常见大目录，适合日常安全快照。",
  inputs: {
    task: "自然语言任务，例如：备份仓库到 D:/CodeBackups",
  },
  output: "返回备份目录、源目录、排除目录和结果状态。",
  shouldAutoInvoke(task) {
    return /(备份.*仓库|备份.*代码|自动备份|backup\s+(repo|project))/i.test(
      task,
    );
  },
  async handler(context, task) {
    const sourcePath = context.cwd;
    const backupRoot =
      extractToPath(task) || join(dirname(context.cwd), "smallclaw_backups");

    const normalizedSource = resolve(sourcePath)
      .replace(/\\/g, "/")
      .toLowerCase();
    const normalizedBackupRoot = resolve(backupRoot)
      .replace(/\\/g, "/")
      .toLowerCase();

    if (
      normalizedBackupRoot === normalizedSource ||
      normalizedBackupRoot.startsWith(`${normalizedSource}/`)
    ) {
      throw new Error("备份目录不能位于源目录内部，请指定外部目录");
    }

    await access(sourcePath, constants.F_OK);
    await mkdir(backupRoot, { recursive: true });

    const stamp = timeTag(new Date());
    const targetPath = resolve(
      backupRoot,
      `${basename(sourcePath)}_backup_${stamp}`,
    );

    await cp(sourcePath, targetPath, {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: (entryPath) => {
        const normalized = entryPath.replace(/\\/g, "/");
        return !Array.from(EXCLUDED_DIRS).some((dir) =>
          normalized.includes(`/${dir}`),
        );
      },
    });

    context.log(`备份完成: ${targetPath}`);

    return [
      "备份成功。",
      `源目录: ${sourcePath}`,
      `备份目录: ${targetPath}`,
      `已排除: ${Array.from(EXCLUDED_DIRS).join(", ")}`,
      "提示: 你可以继续说“再备份一次到 D:/CodeBackups”执行下一次快照。",
    ].join("\n");
  },
};
