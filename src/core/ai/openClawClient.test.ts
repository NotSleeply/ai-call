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
} = await import("./openClawClient.js");

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
    assert.equal(body.reasoning_effort, "none");
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

test("工具请求在模型不支持 reasoning_effort 时回退", async () => {
  const previousFetch = globalThis.fetch;
  const previousModelForTest = process.env.AIC_MODEL;
  process.env.AIC_MODEL = "unsupported-reasoning-model";
  const requestBodies: Array<Record<string, unknown>> = [];

  globalThis.fetch = async (_input, init) => {
    requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);

    if (requestBodies.length === 1) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              "Function tools with reasoning_effort are not supported for this model",
          },
        }),
        { status: 400, statusText: "Bad Request" },
      );
    }

    return new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const turn = await createClient().generateAgentTurn(
      [{ role: "user", content: "hello" }],
      [
        {
          type: "function",
          function: {
            name: "find_files",
            description: "find files",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
    );

    assert.equal(turn.content, "OK");
    assert.equal(requestBodies.length, 2);
    assert.equal(requestBodies[0].reasoning_effort, "none");
    assert.equal(requestBodies[1].reasoning_effort, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousModelForTest === undefined) delete process.env.AIC_MODEL;
    else process.env.AIC_MODEL = previousModelForTest;
  }
});

test("已记录模型不支持 reasoning_effort 后后续请求不再重试", async () => {
  const previousFetch = globalThis.fetch;
  const previousModelForTest = process.env.AIC_MODEL;
  process.env.AIC_MODEL = "cached-reject-model";
  const requestBodies: Array<Record<string, unknown>> = [];

  globalThis.fetch = async (_input, init) => {
    requestBodies.push(
      JSON.parse(String(init?.body)) as Record<string, unknown>,
    );

    if (requestBodies.length === 1) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              "Function tools with reasoning_effort are not supported for this model",
          },
        }),
        { status: 400, statusText: "Bad Request" },
      );
    }

    return new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const client = createClient();
    await client.generateAgentTurn(
      [{ role: "user", content: "hello" }],
      [
        {
          type: "function",
          function: {
            name: "find_files",
            description: "find files",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
    );

    assert.equal(requestBodies.length, 2);
    assert.equal(requestBodies[0].reasoning_effort, "none");
    assert.equal(requestBodies[1].reasoning_effort, undefined);

    requestBodies.length = 0;
    globalThis.fetch = async (_input, init) => {
      const requestBody = JSON.parse(
        String(init?.body),
      ) as Record<string, unknown>;
      requestBodies.push(requestBody);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    await createClient().generateReply("hello");
    assert.equal(requestBodies.length, 1);
    assert.equal(requestBodies[0].reasoning_effort, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousModelForTest === undefined) delete process.env.AIC_MODEL;
    else process.env.AIC_MODEL = previousModelForTest;
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
    assert.equal(requestBody.reasoning_effort, "none");
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
