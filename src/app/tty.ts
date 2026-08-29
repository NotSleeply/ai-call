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

/**
 * 从交互终端读取一行秘密文本，不回显输入内容。
 * 非交互环境不读取 stdin，避免吞掉管道内容；调用方应改用环境变量或文件配置。
 */
export async function askSecret(prompt: string): Promise<string> {
  if (process.stdin.isTTY !== true || typeof process.stdin.setRawMode !== "function") {
    return "";
  }

  const stdin = process.stdin;
  const wasRaw = stdin.isRaw === true;
  let value = "";

  process.stderr.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise<string>((resolve) => {
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };

    const onData = (chunk: Buffer | string) => {
      for (const char of String(chunk)) {
        if (char === "\u0003" || char === "\u0004") {
          cleanup();
          process.stderr.write("\n");
          resolve("");
          return;
        }

        if (char === "\r" || char === "\n") {
          cleanup();
          process.stderr.write("\n");
          resolve(value);
          return;
        }

        if (char === "\u0008" || char === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }

        if (char === "\u0015") {
          value = "";
          continue;
        }

        if (char >= " ") {
          value += char;
        }
      }
    };

    stdin.on("data", onData);
  });
}

export function isConfirmYes(answer: string): boolean {
  return /^(y|yes|是|执行|提交)$/i.test(answer);
}
