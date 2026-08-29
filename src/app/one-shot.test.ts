import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAgentStatus } from "./one-shot.js";

test("终端状态文本能区分模型、工具和最终输出阶段", () => {
  assert.equal(
    formatAgentStatus({ type: "thinking", round: 1 }),
    "正在分析问题...",
  );
  assert.equal(
    formatAgentStatus({ type: "thinking", round: 2 }),
    "正在继续分析（第 2 轮）...",
  );
  assert.equal(
    formatAgentStatus({
      type: "tool",
      toolName: "find_files",
      callNumber: 1,
    }),
    "正在查找文件...",
  );
  assert.equal(
    formatAgentStatus({
      type: "tool",
      toolName: "read_file",
      callNumber: 2,
    }),
    "正在读取文件...",
  );
  assert.equal(
    formatAgentStatus({
      type: "tool",
      toolName: "search_text",
      callNumber: 3,
    }),
    "正在搜索内容...",
  );
  assert.equal(
    formatAgentStatus({
      type: "tool-result",
      toolName: "search_text",
      callNumber: 3,
    }),
    "正在整理查询结果...",
  );
  assert.equal(
    formatAgentStatus({ type: "finalizing" }),
    "正在整理最终回答...",
  );
  assert.equal(
    formatAgentStatus({ type: "generating" }),
    "正在生成回答...",
  );
});
