/**
 * AI Call - 终端确认输入
 *
 * 职责：
 * - stdin 是 TTY 时用 readline 询问确认
 * - stdin 被管道占用时从控制台（Windows CONIN$ / POSIX /dev/tty）读取
 */
import { createInterface } from "readline";
import { openSync, closeSync, readSync } from "fs";
import yoctoSpinner from "yocto-spinner";

export type SpinnerInstance = ReturnType<typeof yoctoSpinner>;

function isStderrInteractive(): boolean {
  return Boolean(
    process.stderr.isTTY &&
      process.env.TERM !== "dumb" &&
      !("CI" in process.env),
  );
}

/**
 * 仅在 stderr 是交互终端时创建转圈提示；管道/重定向下返回 null，
 * 保证 stderr 不被污染。
 */
export function startSpinner(text: string): SpinnerInstance | null {
  if (!isStderrInteractive()) {
    return null;
  }
  return yoctoSpinner({ text }).start();
}

/**
 * 从控制台直接读取一行（stdin 被管道占用时使用）。
 * Windows 读 CONIN$，POSIX 读 /dev/tty；失败时返回空串。
 */
export function readTtyLineSync(): string {
  const ttyPath = process.platform === "win32" ? "CONIN$" : "/dev/tty";

  try {
    const fd = openSync(ttyPath, "r");
    const buf = Buffer.alloc(1);
    let line = "";

    while (true) {
      const n = readSync(fd, buf, 0, 1, null);
      if (n === 0) {
        continue;
      }

      const ch = String.fromCharCode(buf[0]);
      if (ch === "\n" || ch === "\r") {
        break;
      }
      line += ch;
    }

    closeSync(fd);
    return line.trim();
  } catch {
    return "";
  }
}

/**
 * 向用户询问确认，返回原始回答。
 * 无法读取（如无控制台）时返回空串。
 */
export async function askConfirmation(prompt: string): Promise<string> {
  if (process.stdin.isTTY === true) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    try {
      return await new Promise<string>((resolve) => {
        rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
      });
    } finally {
      rl.close();
    }
  }

  process.stderr.write(prompt);
  return readTtyLineSync();
}

export function isConfirmYes(answer: string): boolean {
  return /^(y|yes|是|执行|提交)$/i.test(answer);
}
