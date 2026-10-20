import { after, mock, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Dispatcher } from "undici";

const previousApiKey = process.env.AIC_API_KEY;
const previousBaseUrl = process.env.AIC_BASE_URL;
const previousModel = process.env.AIC_MODEL;
const previousDataDir = process.env.AI_CALL_DATA_DIR;
const testDataDir = mkdtempSync(join(tmpdir(), "aic-reasoning-test-"));
process.env.AIC_API_KEY = "test-key";
process.env.AIC_BASE_URL = "http://mock.invalid/v1";
process.env.AIC_MODEL = "test-model";
process.env.AI_CALL_DATA_DIR = testDataDir;

const {
  OpenClawClient,
  RequestCancelledError,
  RequestTimeoutError,
  REQUEST_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
  requestApiResponse,
} = await import("./openClawClient.js");
const { setReasoningCapability } = await import("./reasoningCapabilities.js");

type FetchImplementation = typeof import("undici").fetch;

function createClient() {
  return new OpenClawClient(
    globalThis.fetch as unknown as FetchImplementation,
  );
}

after(() => {
  if (previousApiKey === undefined) delete process.env.AIC_API_KEY;
  else process.env.AIC_API_KEY = previousApiKey;
  if (previousBaseUrl === undefined) delete process.env.AIC_BASE_URL;
  else process.env.AIC_BASE_URL = previousBaseUrl;
  if (previousModel === undefined) delete process.env.AIC_MODEL;
  else process.env.AIC_MODEL = previousModel;
  if (previousDataDir === undefined) delete process.env.AI_CALL_DATA_DIR;
  else process.env.AI_CALL_DATA_DIR = previousDataDir;
  rmSync(testDataDir, { recursive: true, force: true });
});

test("非流式 API 失败会抛出错误", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "http://mock.invalid/v1/chat/completions");
    return new Response("unauthorized", {
      status: 401,
      statusText: "Unauthorized",
    });
  };

  try {
    const client = createClient();

    await assert.rejects(
      client.generateReply("hello"),
      /API 请求失败: HTTP 401 Unauthorized: unauthorized/,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("API 请求会显式传递代理 dispatcher", async () => {
  const previousFetch = globalThis.fetch;
  let requestInit: RequestInit & { dispatcher?: Dispatcher } | undefined;

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://mock.invalid/v1/chat/completions");
    requestInit = init as RequestInit & { dispatcher?: Dispatcher };
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const previousHttpsProxy = process.env.HTTPS_PROXY;
  const previousHttpsProxyLowercase = process.env.https_proxy;
  process.env.HTTPS_PROXY = "http://proxy-for-test.invalid:7890";
  process.env.https_proxy = "http://proxy-for-test.invalid:7890";

  try {
    await createClient().generateReply("hello");
    assert.ok(requestInit?.dispatcher);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousHttpsProxy === undefined) delete process.env.HTTPS_PROXY;
    else process.env.HTTPS_PROXY = previousHttpsProxy;
    if (previousHttpsProxyLowercase === undefined) delete process.env.https_proxy;
    else process.env.https_proxy = previousHttpsProxyLowercase;
  }
});

test("连接测试会实际请求当前模型的聊天接口", async () => {
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://mock.invalid/v1/chat/completions");
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers && (init.headers as Record<string, string>).Authorization, "Bearer test-key");

    const body = JSON.parse(String(init?.body)) as {
      model?: string;
      messages?: Array<{ role?: string; content?: string }>;
      temperature?: unknown;
      reasoning_effort?: unknown;
      stream?: boolean;
    };
    assert.equal(body.model, "test-model");
    assert.deepEqual(body.messages, [
      { role: "user", content: "请回复 OK。" },
    ]);
    assert.equal(body.temperature, undefined);
    assert.equal(body.reasoning_effort, undefined);
    assert.equal(body.stream, undefined);

    return new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    await createClient().testConnection();
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("函数工具被 chat completions 拒绝时改走 responses", async () => {
  const previousFetch = globalThis.fetch;
  const previousModelForTest = process.env.AIC_MODEL;
  process.env.AIC_MODEL = "gpt-6.1-sol";
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const tool = {
    type: "function" as const,
    function: {
      name: "find_files",
      description: "find files",
      parameters: { type: "object", properties: {} },
    },
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push({ url, body });

    if (url.endsWith("/chat/completions")) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              "Function tools with reasoning_effort are not supported for gpt-6.1-sol in /v1/chat/completions. To use function tools, use /v1/responses or set reasoning_effort to 'none'.",
          },
        }),
        { status: 400, statusText: "Bad Request" },
      );
    }

    // 复现原始报错：该模型拒绝 none，修复后请求应不携带推理强度。
    if ((body.reasoning as { effort?: unknown } | undefined)?.effort === "none") {
      return new Response(
        JSON.stringify({
          error: {
            message: "Unsupported value: 'none' is not supported with the 'gpt-6.1-sol' model. Supported values are: 'low', 'medium', 'high', 'xhigh', and 'max'.",
            type: "invalid_request_error",
            param: "reasoning.effort",
            code: "unsupported_value",
          },
        }),
        { status: 400, statusText: "Bad Request" },
      );
    }

    const encoder = new TextEncoder();
    const chunks = [
      'data: {"type":"response.output_text.delta","delta":"你好"}\n\n',
      'data: {"type":"response.output_item.added","output_index":1,"item":{"type":"function_call","call_id":"call-1","name":"find_files","arguments":""}}\n\n',
      'data: {"type":"response.function_call_arguments.delta","output_index":1,"delta":"{\\"pattern\\":\\"*.ts\\"}"}\n\n',
    ];
    return new Response(
      new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      }),
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );
  };

  try {
    const deltas: string[] = [];
    const turn = await createClient().generateAgentTurnStream(
      [
        { role: "system", content: "系统提示" },
        { role: "user", content: "你好" },
      ],
      [tool],
      (delta) => deltas.push(delta),
    );

    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, "http://mock.invalid/v1/chat/completions");
    assert.equal(requests[0].body.reasoning_effort, undefined);
    assert.equal(requests[1].url, "http://mock.invalid/v1/responses");
    assert.equal(requests[1].body.stream, true);
    assert.equal(requests[1].body.reasoning, undefined);
    assert.equal(requests[1].body.reasoning_effort, undefined);
    assert.equal(requests[1].body.instructions, "系统提示");
    assert.deepEqual(requests[1].body.tools, [
      {
        type: "function",
        name: "find_files",
        description: "find files",
        parameters: { type: "object", properties: {} },
      },
    ]);
    assert.equal(turn.content, "你好");
    assert.deepEqual(deltas, ["你好"]);
    assert.deepEqual(turn.toolCalls, [
      {
        id: "call-1",
        type: "function",
        function: {
          name: "find_files",
          arguments: '{"pattern":"*.ts"}',
        },
      },
    ]);

    requests.length = 0;
    await createClient().generateAgentTurnStream(
      [
        { role: "user", content: "你好" },
        {
          role: "assistant",
          content: null,
          tool_calls: turn.toolCalls,
        },
        {
          role: "tool",
          content: "[]",
          tool_call_id: "call-1",
        },
      ],
      [tool],
    );

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "http://mock.invalid/v1/responses");
    assert.deepEqual(requests[0].body.input, [
      { role: "user", content: "你好" },
      {
        type: "function_call",
        call_id: "call-1",
        name: "find_files",
        arguments: '{"pattern":"*.ts"}',
      },
      {
        type: "function_call_output",
        call_id: "call-1",
        output: "[]",
      },
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousModelForTest === undefined) delete process.env.AIC_MODEL;
    else process.env.AIC_MODEL = previousModelForTest;
  }
});

for (const endpoint of ["chat/completions", "responses"]) {
  test(`${endpoint} 的推理强度不受支持时移除参数并只重试一次`, async () => {
    const requestBodies: Array<Record<string, unknown>> = [];
    const effortParam = endpoint === "responses" ? "reasoning.effort" : "reasoning_effort";
    const body = {
      model: "gpt-6.1-sol",
      ...(endpoint === "responses"
        ? { input: "hello", reasoning: { effort: "none", summary: "auto" } }
        : { messages: [{ role: "user", content: "hello" }], reasoning_effort: "none" }),
    };
    const fetchImplementation = (async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (requestBodies.length === 1) {
        return new Response(JSON.stringify({ error: {
          message: "Unsupported value: 'none' is not supported with the 'gpt-6.1-sol' model. Supported values are: 'low', 'medium', 'high', 'xhigh', and 'max'.",
          type: "invalid_request_error",
          param: effortParam,
          code: "unsupported_value",
        } }), { status: 400, statusText: "Bad Request" });
      }
      return new Response("OK", { status: 200 });
    }) as FetchImplementation;

    const response = await requestApiResponse(
      fetchImplementation,
      `http://mock.invalid/v1/${endpoint}`,
      {},
      body,
      new AbortController().signal,
    );
    assert.equal(await response.text(), "OK");
    assert.equal(requestBodies.length, 2);
    assert.deepEqual(requestBodies[0], body);
    assert.equal(requestBodies[1].reasoning_effort, undefined);
    assert.deepEqual(requestBodies[1].reasoning, endpoint === "responses" ? { summary: "auto" } : undefined);
    assert.deepEqual(body, requestBodies[0]);
  });

  for (const scenario of ["unrelated-error", "repeated-error", "no-effort"]) {
    test(`${endpoint} 不会因 ${scenario} 反复重试`, async () => {
      const requestBodies: Array<Record<string, unknown>> = [];
      const effortParam = endpoint === "responses" ? "reasoning.effort" : "reasoning_effort";
      const body: Record<string, unknown> = { model: "gpt-6.1-sol" };
      if (scenario !== "no-effort") {
        if (endpoint === "responses") body.reasoning = { effort: "none" };
        else body.reasoning_effort = "none";
      }
      const fetchImplementation = (async (_input, init) => {
        requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return new Response(JSON.stringify({ error: {
          message: "Unsupported value",
          param: scenario === "unrelated-error" ? "tools" : effortParam,
          code: "unsupported_value",
        } }), { status: 400, statusText: "Bad Request" });
      }) as FetchImplementation;

      await assert.rejects(
        requestApiResponse(
          fetchImplementation,
          `http://mock.invalid/v1/${endpoint}`,
          {},
          body,
          new AbortController().signal,
        ),
        /API 请求失败: HTTP 400 Bad Request/,
      );
      assert.equal(requestBodies.length, scenario === "repeated-error" ? 2 : 1);
      if (scenario === "repeated-error") {
        assert.equal(requestBodies[1].reasoning_effort, undefined);
        assert.equal(requestBodies[1].reasoning, undefined);
      }
    });
  }
}

test("已有推理能力缓存不会重新注入 none", async () => {
  const previousFetch = globalThis.fetch;
  const previousModelForTest = process.env.AIC_MODEL;
  const requestBodies: Array<Record<string, unknown>> = [];

  globalThis.fetch = async (_input, init) => {
    requestBodies.push(
      JSON.parse(String(init?.body)) as Record<string, unknown>,
    );

    return new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    for (const status of ["supports-none", "rejects-none"] as const) {
      process.env.AIC_MODEL = `cached-${status}-model`;
      setReasoningCapability("http://mock.invalid/v1", process.env.AIC_MODEL, status);
      requestBodies.length = 0;
      await createClient().generateReply("hello");
      assert.equal(requestBodies.length, 1);
      assert.equal(requestBodies[0].reasoning_effort, undefined);
      assert.equal(requestBodies[0].reasoning, undefined);
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousModelForTest === undefined) delete process.env.AIC_MODEL;
    else process.env.AIC_MODEL = previousModelForTest;
  }
});

test("Agent 流式响应可以解析文本和工具调用", async () => {
  const previousFetch = globalThis.fetch;
  let requestCount = 0;
  const textEncoder = new TextEncoder();
  const sse = (data: unknown) => "data: " + JSON.stringify(data) + "\n\n";
  const tool = {
    type: "function" as const,
    function: {
      name: "find_files",
      description: "find files",
      parameters: { type: "object", properties: {} },
    },
  };

  globalThis.fetch = async (_input, init) => {
    const requestBody = JSON.parse(
      String(init?.body),
    ) as Record<string, unknown>;
    assert.equal(requestBody.stream, true);
    requestCount += 1;

    const chunks =
      requestCount === 1
        ? [
            sse({
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: "call-1",
                        type: "function",
                        function: { name: "find_files", arguments: "" },
                      },
                    ],
                  },
                },
              ],
            }),
            sse({
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        function: {
                          arguments: JSON.stringify({ pattern: "*.ts" }),
                        },
                      },
                    ],
                  },
                },
              ],
            }),
            "data: [DONE]\n\n",
          ]
        : [
            sse({ choices: [{ delta: { content: "流式" } }] }),
            sse({ choices: [{ delta: { content: "回答" } }] }),
            "data: [DONE]\n\n",
          ];

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(textEncoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };

  try {
    const client = createClient();
    const firstTurn = await client.generateAgentTurnStream(
      [{ role: "user", content: "查找 TypeScript 文件" }],
      [tool],
    );

    assert.equal(firstTurn.content, "");
    assert.deepEqual(firstTurn.toolCalls, [
      {
        id: "call-1",
        type: "function",
        function: {
          name: "find_files",
          arguments: JSON.stringify({ pattern: "*.ts" }),
        },
      },
    ]);

    const deltas: string[] = [];
    const finalTurn = await client.generateAgentTurnStream(
      [{ role: "user", content: "总结" }],
      [],
      (delta) => deltas.push(delta),
    );

    assert.equal(finalTurn.content, "流式回答");
    assert.deepEqual(deltas, ["流式", "回答"]);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("fetch failed 会显示底层网络错误原因", async () => {
  const previousFetch = globalThis.fetch;
  const cause = Object.assign(
    new Error("getaddrinfo ENOTFOUND api.example.com"),
    { code: "ENOTFOUND" },
  );

  globalThis.fetch = async () => {
    throw new TypeError("fetch failed", { cause });
  };

  try {
    await assert.rejects(
      createClient().generateReply("hello"),
      (error) => {
        assert.match(
          (error as Error).message,
          /无法解析 API 地址，请检查域名和 DNS/,
        );
        assert.match((error as Error).message, /ENOTFOUND/);
        assert.match((error as Error).message, /api\.example\.com/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("流式响应中断后不重试且不强制发送 temperature", async () => {
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  let pullCount = 0;

  globalThis.fetch = async (_input, init) => {
    fetchCount += 1;
    const requestBody = JSON.parse(String(init?.body)) as {
      temperature?: unknown;
      reasoning_effort?: unknown;
      stream?: unknown;
    };
    assert.equal(requestBody.temperature, undefined);
    assert.equal(requestBody.reasoning_effort, undefined);
    assert.equal(requestBody.stream, true);
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pullCount === 0) {
          pullCount += 1;
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"part"}}]}\n\n',
            ),
          );
          return;
        }

        controller.error(new Error("stream interrupted"));
      },
    });

    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };

  try {
    const deltas: string[] = [];
    const client = createClient();

    await assert.rejects(
      client.generateReplyStream(
        "hello",
        [],
        (delta) => deltas.push(delta),
      ),
      /stream interrupted/,
    );

    assert.deepEqual(deltas, ["part"]);
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("传入的 AbortSignal 会中断请求", async () => {
  const previousFetch = globalThis.fetch;
  const controller = new AbortController();
  let forwardedSignal: AbortSignal | undefined;

  globalThis.fetch = async (_input, init) => {
    forwardedSignal = init?.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => {
      if (!init?.signal) {
        reject(new Error("请求没有传递 AbortSignal"));
        return;
      }

      init.signal.addEventListener(
        "abort",
        () => reject(new Error("fetch aborted")),
        { once: true },
      );
    });
  };

  try {
    const pending = createClient().generateReply("hello", [], {
      signal: controller.signal,
    });
    controller.abort();

    await assert.rejects(
      pending,
      (error) => error instanceof RequestCancelledError,
    );
    assert.equal(forwardedSignal?.aborted, true);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("请求在连接阶段无响应时超时", async () => {
  const previousFetch = globalThis.fetch;
  mock.timers.enable();

  globalThis.fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      if (!init?.signal) {
        reject(new Error("请求没有传递 AbortSignal"));
        return;
      }

      init.signal.addEventListener(
        "abort",
        () => reject(new Error("fetch aborted")),
        { once: true },
      );
    });

  try {
    const pending = createClient().generateReply("hello");
    mock.timers.tick(REQUEST_TIMEOUT_MS);

    await assert.rejects(
      pending,
      (error) => error instanceof RequestTimeoutError,
    );
  } finally {
    mock.timers.reset();
    globalThis.fetch = previousFetch;
  }
});

test("流式响应长时间没有新内容时超时", async () => {
  const previousFetch = globalThis.fetch;
  mock.timers.enable();

  globalThis.fetch = async (_input, init) => {
    const body = new ReadableStream<Uint8Array>({
      start(streamController) {
        init?.signal?.addEventListener(
          "abort",
          () =>
            streamController.error(init.signal?.reason ?? new Error("aborted")),
          { once: true },
        );
      },
    });

    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };

  try {
    const pending = createClient().generateReplyStream("hello");
    mock.timers.tick(STREAM_IDLE_TIMEOUT_MS);

    await assert.rejects(
      pending,
      (error) => error instanceof RequestTimeoutError,
    );
  } finally {
    mock.timers.reset();
    globalThis.fetch = previousFetch;
  }
});
