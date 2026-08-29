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

test("只读模式不会执行动作工具，并且动作需要确认", async () => {
  const client = new FakeClient([
    toolCall("run_command", { command: "node" }, "1"),
    { content: "没有执行", toolCalls: [] },
  ]);
  let confirmationCount = 0;
  const runtime = new AgentRuntime(client as unknown as OpenClawClient);
  const answer = await runtime.run("执行命令", [], {
    allowActions: false,
    confirmAction: async () => {
      confirmationCount++;
      return true;
    },
  });

  assert.equal(answer, "没有执行");
  assert.equal(confirmationCount, 0);
});

test("确认输入异常不会被 Agent 吞掉", async () => {
  const client = new FakeClient([
    toolCall("run_command", { command: "node" }, "1"),
  ]);
  const runtime = new AgentRuntime(client as unknown as OpenClawClient);

  await assert.rejects(
    runtime.run("执行命令", [], {
      allowActions: true,
      confirmAction: async () => {
        throw new Error("确认输入不可用");
      },
    }),
    /确认输入不可用/,
  );
});
