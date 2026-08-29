import { after, test } from "node:test";
import assert from "node:assert/strict";

const previousApiKey = process.env.AIC_API_KEY;
const previousBaseUrl = process.env.AIC_BASE_URL;
const previousModel = process.env.AIC_MODEL;
process.env.AIC_API_KEY = "test-key";
process.env.AIC_BASE_URL = "http://mock.invalid/v1";
process.env.AIC_MODEL = "test-model";

const { OpenClawClient } = await import("./openClawClient.js");

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
