import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DEEPSEEK_MODEL, PROVIDERS } from "./config.js";

test("DeepSeek 默认模型是 deepseek-v4-flash", () => {
  assert.equal(DEFAULT_DEEPSEEK_MODEL, "deepseek-v4-flash");
});

test("DeepSeek 配置不询问 API 地址", () => {
  const deepseek = PROVIDERS.find((p) => p.id === "deepseek");
  assert.ok(deepseek);
  const keys = deepseek.fields.map((f) => f.key);
  assert.deepEqual(keys, ["DEEPSEEK_API_KEY", "DEEPSEEK_MODEL"]);
});

test("DeepSeek 模型名默认值是 deepseek-v4-flash", () => {
  const deepseek = PROVIDERS.find((p) => p.id === "deepseek");
  assert.ok(deepseek);
  const modelField = deepseek.fields.find((f) => f.key === "DEEPSEEK_MODEL");
  assert.ok(modelField);
  assert.equal(modelField.defaultFor(new Map()), "deepseek-v4-flash");
});
