import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTerminalText,
  TerminalTextStreamNormalizer,
} from "./terminal-output.js";

test("清理常见 Markdown 包装", () => {
  const result = normalizeTerminalText(`
## 作用

**实现** \`solution.py\`

[查看文档](https://example.com)

\`\`\`python
print("hello")
\`\`\`

- 第一项
- 第二项
`);

  assert.equal(
    result,
    `作用

实现 solution.py

查看文档 (https://example.com)

print("hello")

• 第一项
• 第二项`,
  );
});

test("保留缩进代码中的符号", () => {
  const result = normalizeTerminalText(
    "代码：\n    const value = `a * b`;\n    # comment",
  );

  assert.equal(result, "代码：\n    const value = `a * b`;\n    # comment");
});

test("保留行内代码中的真实标识符", () => {
  const result = normalizeTerminalText("Python 特殊方法是 `__init__`。");

  assert.equal(result, "Python 特殊方法是 __init__。");
});

test("流式终端文本按完整行清理 Markdown", () => {
  const normalizer = new TerminalTextStreamNormalizer();

  assert.equal(normalizer.push("**实现** `sol"), "");
  assert.equal(normalizer.push("ution.py`\n\n```python\n"), "实现 solution.py\n\n");
  assert.equal(normalizer.push("print(\"hello\")\n```\n"), "print(\"hello\")\n");
  assert.equal(normalizer.finish(), "");
});
