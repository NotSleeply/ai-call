/**
 * AI Call - 终端交互辅助
 *
 * 职责：
 * - 仅在交互终端中安全读取 API Key
 * - 在交互终端中显示等待提示
 */
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
