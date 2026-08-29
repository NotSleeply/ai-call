import { after, mock, test } from "node:test";
import assert from "node:assert/strict";

const previousApiKey = process.env.AIC_API_KEY;
const previousBaseUrl = process.env.AIC_BASE_URL;
const previousModel = process.env.AIC_MODEL;
process.env.AIC_API_KEY = "test-key";
process.env.AIC_BASE_URL = "http://mock.invalid/v1";
process.env.AIC_MODEL = "test-model";

const {
  OpenClawClient,
  RequestCancelledError,
  RequestTimeoutError,
  REQUEST_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
} = await import("./openClawClient.js");

after(() => {
  if (previousApiKey === undefined) delete process.env.AIC_API_KEY;
  else process.env.AIC_API_KEY = previousApiKey;
  if (previousBaseUrl === undefined) delete process.env.AIC_BASE_URL;
  else process.env.AIC_BASE_URL = previousBaseUrl;
  if (previousModel === undefined) delete process.env.AIC_MODEL;
  else process.env.AIC_MODEL = previousModel;
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
    const client = new OpenClawClient();

    await assert.rejects(
      client.generateReply("hello"),
      /API 请求失败: HTTP 401 Unauthorized: unauthorized/,
    );
  } finally {
    globalThis.fetch = previousFetch;
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
      stream?: boolean;
    };
    assert.equal(body.model, "test-model");
    assert.deepEqual(body.messages, [
      { role: "user", content: "请回复 OK。" },
    ]);
    assert.equal(body.stream, undefined);

    return new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    await new OpenClawClient().testConnection();
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
      new OpenClawClient().generateReply("hello"),
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

test("流式响应已输出内容后不会重试请求", async () => {
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  let pullCount = 0;

  globalThis.fetch = async () => {
    fetchCount += 1;
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
    const client = new OpenClawClient();

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
    const pending = new OpenClawClient().generateReply("hello", [], {
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
    const pending = new OpenClawClient().generateReply("hello");
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
    const pending = new OpenClawClient().generateReplyStream("hello");
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
