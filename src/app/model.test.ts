import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_KEYS,
  DEFAULT_API_BASE_URL,
  DEFAULT_MODEL,
  hasApiKey,
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
