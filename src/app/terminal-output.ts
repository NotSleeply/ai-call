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

export function normalizeTerminalText(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (isFence(line)) {
      inFence = !inFence;
      continue;
    }

    output.push(
      inFence || isIndentedCode(line) ? line : stripInlineMarkdown(line),
    );
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
