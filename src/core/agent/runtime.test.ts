import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  ChatTurn,
  OpenClawClient,
  ToolDefinition,
} from "../ai/openClawClient.js";
import { AgentRuntime } from "./runtime.js";

class FakeClient {
  readonly calls: Array<{ tools: ToolDefinition[] }> = [];

  constructor(private readonly turns: ChatTurn[]) {}

  async generateAgentTurn(
    _messages: unknown[],
    tools: ToolDefinition[],
  ): Promise<ChatTurn> {
    this.calls.push({ tools });
    const turn = this.turns.shift();
    if (!turn) throw new Error("fake client 没有更多响应");
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
