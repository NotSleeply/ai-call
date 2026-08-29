import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_KEYS,
  DEFAULT_API_BASE_URL,
  DEFAULT_MODEL,
  hasConfig,
} from "./config.js";

test("单一 API 配置包含固定的三项键", () => {
  assert.deepEqual(CONFIG_KEYS, ["AIC_API_KEY", "AIC_BASE_URL", "AIC_MODEL"]);
  assert.equal(DEFAULT_API_BASE_URL, "https://api.openai.com/v1");
  assert.equal(DEFAULT_MODEL, "gpt-5-mini");
});

test("hasConfig 只认可非空 AIC_API_KEY", () => {
  assert.equal(hasConfig(""), false);
  assert.equal(hasConfig("# comment\nAIC_API_KEY=\n"), false);
  assert.equal(hasConfig("DEEPSEEK_API_KEY=sk-old\n"), false);
  assert.equal(hasConfig("AIC_API_KEY=sk-test\n"), true);
});
