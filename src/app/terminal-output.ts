/**
 * AI Call - 终端纯文本输出
 *
 * 模型通过系统提示避免 Markdown；这里仅对常见的 Markdown 包装做保守兜底，
 * 不处理缩进代码或代码围栏中的内容，避免破坏代码本身。
 */

function isFence(line: string): boolean {
  return /^\s*(`{3,}|~{3,})/.test(line);
}

function isIndentedCode(line: string): boolean {
  return /^\s{4,}/.test(line);
}

function stripInlineMarkdown(line: string): string {
  const codeSpans: string[] = [];
  let result = line.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const index = codeSpans.push(code) - 1;
    return `\u0000${index}\u0000`;
  });

  result = result
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/^\s{0,3}>\s?/, "  ")
    .replace(/^\s*[-+*]\s+/, "• ")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, "")
    .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/~~([^~\n]+)~~/g, "$1");

  return result.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => {
    return codeSpans[Number(index)] ?? "";
  });
}

function normalizeLine(line: string, state: { inFence: boolean }): string | null {
  if (isFence(line)) {
    state.inFence = !state.inFence;
    return null;
  }

  return state.inFence || isIndentedCode(line) ? line : stripInlineMarkdown(line);
}

export function normalizeTerminalText(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  const state = { inFence: false };

  for (const line of lines) {
    const normalized = normalizeLine(line, state);
    if (normalized !== null) {
      output.push(normalized);
    }
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 按增量处理终端文本。只在收到完整行后清理 Markdown，避免破坏被分在
 * 不同流式块中的行内代码或代码围栏。
 */
export class TerminalTextStreamNormalizer {
  private buffer = "";
  private readonly state = { inFence: false };
  private newlineRun = 0;
  private hasContent = false;

  push(text: string): string {
    this.buffer += text.replace(/\r\n?/g, "\n");
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    return lines
      .map((line) => this.formatLine(line))
      .join("");
  }

  finish(): string {
    if (!this.buffer) {
      return "";
    }

    const result = this.formatLine(this.buffer);
    this.buffer = "";
    return result;
  }

  private formatLine(line: string): string {
    const normalized = normalizeLine(line, this.state);
    if (normalized === null) {
      return "";
    }

    if (!normalized) {
      if (!this.hasContent || this.newlineRun >= 2) {
        return "";
      }

      this.newlineRun++;
      return "\n";
    }

    this.newlineRun = 1;
    this.hasContent = true;
    return `${normalized}\n`;
  }
}
