import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCommand } from "./exec.js";

test("extractCommand 接受完整响应中的单条代码命令", () => {
  assert.equal(
    extractCommand("```bash\necho hello\n```").command,
    "echo hello",
  );
});

test("extractCommand 拒绝代码块中的多条命令", () => {
  assert.equal(
    extractCommand("```bash\necho one\necho two\n```").command,
    null,
  );
});

test("extractCommand 拒绝代码块外的夹带文本", () => {
  assert.equal(
    extractCommand("请执行:\n```bash\necho hello\n```").command,
    null,
  );
});

test("extractCommand 拒绝控制字符", () => {
  assert.equal(extractCommand("echo\u001b[31m hello").command, null);
});
