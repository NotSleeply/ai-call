import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  ChatTurn,
  OpenClawClient,
  ToolDefinition,
} from "../ai/openClawClient.js";
import { AgentRuntime, type AgentStatus } from "./runtime.js";

class FakeClient {
  readonly calls: Array<{ tools: ToolDefinition[] }> = [];
  readonly signals: Array<AbortSignal | undefined> = [];

  constructor(private readonly turns: ChatTurn[]) {}

  async generateAgentTurnStream(
    _messages: unknown[],
    tools: ToolDefinition[],
    onDelta: (delta: string) => void,
    options?: { signal?: AbortSignal },
  ): Promise<ChatTurn> {
    this.calls.push({ tools });
    this.signals.push(options?.signal);
    const turn = this.turns.shift();
    if (!turn) throw new Error("fake client 没有更多响应");
    if (turn.toolCalls.length === 0 && turn.content) {
      onDelta(turn.content);
    }
    return turn;
  }
}

function toolCall(name: string, args: object, id: string): ChatTurn {
  return {
    content: "",
    toolCalls: [
      {
        id,
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  };
}

test("Agent 串行调用工具，并在第三次后强制最终总结", async () => {
  const client = new FakeClient([
    toolCall("find_files", { pattern: "*.ts" }, "1"),
    toolCall("find_files", { pattern: "*.json" }, "2"),
    toolCall("find_files", { pattern: "*.md" }, "3"),
    { content: "已完成总结", toolCalls: [] },
  ]);

  const runtime = new AgentRuntime(client as unknown as OpenClawClient);
  const answer = await runtime.run("检查项目", [], { rootDir: process.cwd() });

  assert.equal(answer, "已完成总结");
  assert.equal(client.calls.length, 4);
  assert.equal(client.calls[0].tools.length, 3);
  assert.equal(client.calls[2].tools.length, 3);
  assert.equal(client.calls[3].tools.length, 0);
});

test("Agent 始终只暴露只读工具", async () => {
  const client = new FakeClient([
    toolCall("find_files", { pattern: "*.ts" }, "1"),
    { content: "已完成只读检查", toolCalls: [] },
  ]);
  const runtime = new AgentRuntime(client as unknown as OpenClawClient);
  const answer = await runtime.run("检查项目", [], { rootDir: process.cwd() });

  assert.equal(answer, "已完成只读检查");
  assert.deepEqual(
    client.calls[0].tools.map((tool) => tool.function.name),
    ["find_files", "read_file", "search_text"],
  );
});

test("模型请求执行工具时不会执行本地操作", async () => {
  const client = new FakeClient([
    toolCall("run_command", { command: "node" }, "1"),
    { content: "未执行任何命令", toolCalls: [] },
  ]);
  const runtime = new AgentRuntime(client as unknown as OpenClawClient);

  assert.equal(await runtime.run("执行命令"), "未执行任何命令");
  assert.equal(client.calls.length, 2);
});

test("Agent 将取消信号传递给模型请求", async () => {
  const controller = new AbortController();
  const client = new FakeClient([{ content: "已完成", toolCalls: [] }]);
  const runtime = new AgentRuntime(client as unknown as OpenClawClient);

  await runtime.run("检查项目", [], { signal: controller.signal });

  assert.equal(client.signals[0], controller.signal);
});

test("Agent 按阶段报告状态并转发最终回答增量", async () => {
  const client = new FakeClient([
    toolCall("find_files", { pattern: "*.ts" }, "1"),
    { content: "已完成检查", toolCalls: [] },
  ]);
  const statuses: AgentStatus[] = [];
  const deltas: string[] = [];
  const runtime = new AgentRuntime(client as unknown as OpenClawClient);

  const answer = await runtime.run("检查项目", [], {
    rootDir: process.cwd(),
    onStatus: (status) => statuses.push(status),
    onDelta: (delta) => deltas.push(delta),
  });

  assert.equal(answer, "已完成检查");
  assert.deepEqual(
    statuses.map((status) => status.type),
    ["thinking", "tool", "tool-result", "thinking", "generating"],
  );
  assert.deepEqual(deltas, ["已完成检查"]);
  assert.equal(statuses[1].type, "tool");
  assert.equal(
    (statuses[1] as Extract<AgentStatus, { type: "tool" }>).toolName,
    "find_files",
  );
});
