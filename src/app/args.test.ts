import { test } from "node:test";
import assert from "node:assert/strict";
import { CliArgError, parseCliArgs } from "./args.js";

test("model 子命令解析模型名称和 API 地址", () => {
  const args = parseCliArgs([
    "model",
    "deepseek-chat",
    "--base-url",
    "https://api.deepseek.com/v1",
  ]);

  assert.equal(args.subcommand, "model");
  assert.equal(args.modelName, "deepseek-chat");
  assert.equal(args.baseUrl, "https://api.deepseek.com/v1");
  assert.equal(args.prompt, "");
});

test("model 不带参数时用于显示当前配置", () => {
  const args = parseCliArgs(["model"]);

  assert.equal(args.subcommand, "model");
  assert.equal(args.modelName, undefined);
  assert.equal(args.baseUrl, undefined);
});

test("临时模型和 config 显示参数已移除", () => {
  assert.throws(
    () => parseCliArgs(["-m", "gpt-5-mini", "hello"]),
    CliArgError,
  );
  assert.throws(() => parseCliArgs(["--show"]), CliArgError);
  assert.throws(
    () => parseCliArgs(["model", "deepseek-chat"]),
    /--base-url/,
  );
});
