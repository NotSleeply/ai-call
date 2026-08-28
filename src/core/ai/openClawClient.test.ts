import { after, test } from "node:test";
import assert from "node:assert/strict";

const previousApiKey = process.env.MODEL_API_KEY;
const previousBaseUrl = process.env.MODEL_API_BASE_URL;
process.env.MODEL_API_KEY = "test-key";
process.env.MODEL_API_BASE_URL = "http://mock.invalid/v1";

const { OpenClawClient } = await import("./openClawClient.js");

after(() => {
  if (previousApiKey === undefined) {
    delete process.env.MODEL_API_KEY;
  } else {
    process.env.MODEL_API_KEY = previousApiKey;
  }

  if (previousBaseUrl === undefined) {
    delete process.env.MODEL_API_BASE_URL;
  } else {
    process.env.MODEL_API_BASE_URL = previousBaseUrl;
  }
});

test("非流式 provider 失败会抛出错误", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("unauthorized", {
      status: 401,
      statusText: "Unauthorized",
    });

  try {
    const client = new OpenClawClient();

    await assert.rejects(
      client.generateReply("hello", [], { forceProvider: "api" }),
      /通用 API 调用失败：HTTP 401 Unauthorized: unauthorized/,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("流式响应已输出内容后不会重试 endpoint", async () => {
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
        { forceProvider: "api" },
        (delta) => deltas.push(delta),
      ),
      /通用 API 调用失败：stream interrupted/,
    );

    assert.deepEqual(deltas, ["part"]);
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
