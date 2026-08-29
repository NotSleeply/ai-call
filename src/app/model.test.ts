import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_KEYS,
  DEFAULT_API_BASE_URL,
  DEFAULT_MODEL,
  askToTestModelConnection,
  hasApiKey,
  isCompleteModelConfig,
  isConfirmationAnswer,
  validateBaseUrl,
} from "./model.js";

test("单一模型配置包含固定的三项键", () => {
  assert.deepEqual(CONFIG_KEYS, ["AIC_API_KEY", "AIC_BASE_URL", "AIC_MODEL"]);
  assert.equal(DEFAULT_API_BASE_URL, "https://api.openai.com/v1");
  assert.equal(DEFAULT_MODEL, "gpt-5-mini");
});

test("hasApiKey 只认可非空 AIC_API_KEY", () => {
  assert.equal(hasApiKey(""), false);
  assert.equal(hasApiKey("# comment\nAIC_API_KEY=\n"), false);
  assert.equal(hasApiKey("DEEPSEEK_API_KEY=sk-old\n"), false);
  assert.equal(hasApiKey("AIC_API_KEY=sk-test\n"), true);
});

test("模型配置只接受 HTTP 或 HTTPS 地址", () => {
  assert.equal(validateBaseUrl("https://api.openai.com/v1"), true);
  assert.equal(validateBaseUrl("http://localhost:11434/v1"), true);
  assert.equal(validateBaseUrl("ftp://example.com"), false);
  assert.equal(validateBaseUrl("not-a-url"), false);
});

test("完整模型配置必须包含模型、有效地址和 API Key", () => {
  assert.equal(
    isCompleteModelConfig(
      "gpt-5-mini",
      "https://api.openai.com/v1",
      "sk-test",
    ),
    true,
  );
  assert.equal(
    isCompleteModelConfig("", "https://api.openai.com/v1", "sk-test"),
    false,
  );
  assert.equal(isCompleteModelConfig("gpt-5-mini", "", "sk-test"), false);
  assert.equal(
    isCompleteModelConfig("gpt-5-mini", "ftp://example.com", "sk-test"),
    false,
  );
  assert.equal(
    isCompleteModelConfig("gpt-5-mini", "https://api.openai.com/v1", ""),
    false,
  );
});

test("连接测试确认只接受单个 y 或 Y", () => {
  assert.equal(isConfirmationAnswer("y"), true);
  assert.equal(isConfirmationAnswer(" Y "), true);
  assert.equal(isConfirmationAnswer("yes"), false);
  assert.equal(isConfirmationAnswer(""), false);
  assert.equal(isConfirmationAnswer("n"), false);
});

test("连接测试确认默认为跳过，确认后才调用测试函数", async () => {
  const answers = ["", "n", "yes", "Y"];
  let testCount = 0;

  for (const answer of answers) {
    const result = await askToTestModelConnection(
      async (prompt) => {
        assert.equal(prompt, "是否立即测试模型连接？(y/N): ");
        return answer;
      },
      async () => {
        testCount += 1;
      },
    );

    assert.equal(result, 0);
  }

  assert.equal(testCount, 1);
});

test("连接测试失败返回失败状态", async () => {
  const result = await askToTestModelConnection(
    async () => "y",
    async () => {
      throw new Error("连接被拒绝");
    },
  );

  assert.equal(result, 1);
});
