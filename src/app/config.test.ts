import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DEEPSEEK_MODEL,
  PROVIDERS,
  hasProviderConfig,
  parseProviderChoice,
} from "./config.js";

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

test("hasProviderConfig 空内容或仅注释返回 false", () => {
  assert.equal(hasProviderConfig(""), false);
  assert.equal(hasProviderConfig("# 注释\nDEEPSEEK_API_KEY=\n"), false);
});

test("hasProviderConfig 有任一提供方 Key 返回 true", () => {
  assert.equal(hasProviderConfig("DEEPSEEK_API_KEY=sk-abc\n"), true);
  assert.equal(hasProviderConfig("MODEL_API_KEY=x\n"), true);
  assert.equal(hasProviderConfig("OLLAMA_HOST=http://127.0.0.1:11434\n"), true);
});

test("parseProviderChoice 回车和 0 都退出", () => {
  assert.equal(parseProviderChoice("", 3), null);
  assert.equal(parseProviderChoice("0", 3), null);
});

test("parseProviderChoice 合法数字返回 0 基索引", () => {
  assert.equal(parseProviderChoice("1", 3), 0);
  assert.equal(parseProviderChoice("2", 3), 1);
  assert.equal(parseProviderChoice("3", 3), 2);
});

test("parseProviderChoice 越界或非法输入退出", () => {
  assert.equal(parseProviderChoice("99", 3), null);
  assert.equal(parseProviderChoice("abc", 3), null);
  assert.equal(parseProviderChoice("-1", 3), null);
});
