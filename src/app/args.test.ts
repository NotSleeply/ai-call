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
  assert.equal(args.initConfig, false);
});

test("proxy 子命令支持查看和交互配置", () => {
  const viewArgs = parseCliArgs(["proxy"]);
  assert.equal(viewArgs.subcommand, "proxy");
  assert.equal(viewArgs.initConfig, false);
  assert.equal(viewArgs.prompt, "");

  const initArgs = parseCliArgs(["proxy", "--init"]);
  assert.equal(initArgs.subcommand, "proxy");
  assert.equal(initArgs.initConfig, true);
  assert.equal(initArgs.prompt, "");
  assert.throws(
    () => parseCliArgs(["proxy", "http://127.0.0.1:7890"]),
    /proxy 子命令不接受参数/,
  );
});

test("clear 子命令只用于清空本地历史", () => {
  const args = parseCliArgs(["clear"]);

  assert.equal(args.subcommand, "clear");
  assert.equal(args.prompt, "");
  assert.throws(
    () => parseCliArgs(["clear", "hello"]),
    /clear 子命令不接受问题参数/,
  );
  assert.throws(
    () => parseCliArgs(["clear", "-c"]),
    /clear 子命令不能配合 -c/,
  );
  assert.throws(
    () => parseCliArgs(["clear", "--base-url", "https://example.com/v1"]),
    /--base-url 只能配合 model 子命令使用/,
  );
});

test("data --clear 只清除本地运行数据", () => {
  const args = parseCliArgs(["data", "--clear"]);

  assert.equal(args.subcommand, "data");
  assert.equal(args.clearData, true);
  assert.equal(args.prompt, "");
  assert.throws(
    () => parseCliArgs(["data"]),
    /data 子命令需要配合 --clear 使用/,
  );
  assert.throws(
    () => parseCliArgs(["data", "--clear", "hello"]),
    /data 子命令不接受问题参数/,
  );
  assert.throws(
    () => parseCliArgs(["data", "--clear", "-c"]),
    /data 子命令不能配合 -c/,
  );
  assert.throws(
    () => parseCliArgs(["data", "--clear", "--base-url", "https://example.com/v1"]),
    /--base-url 只能配合 model 子命令使用/,
  );
  assert.throws(
    () => parseCliArgs(["--clear", "hello"]),
    /--clear 只能配合 data 子命令使用/,
  );
});

test("model --init 强制进入交互配置", () => {
  const args = parseCliArgs(["model", "--init"]);

  assert.equal(args.subcommand, "model");
  assert.equal(args.initConfig, true);
  assert.equal(args.prompt, "");
  assert.throws(
    () => parseCliArgs(["--init", "hello"]),
    /--init 只能配合 model 或 proxy 子命令使用/,
  );
  assert.throws(
    () =>
      parseCliArgs([
        "model",
        "--init",
        "gpt-5-mini",
        "--base-url",
        "https://api.openai.com/v1",
      ]),
    /model --init 不能同时提供模型名称或 --base-url/,
  );
});

test("Git 操作名称不再作为专用子命令", () => {
  const args = parseCliArgs(["commit", "review"]);

  assert.equal(args.subcommand, undefined);
  assert.equal(args.prompt, "commit review");
});

test("执行权限、临时模型和旧配置显示参数已移除", () => {
  assert.throws(
    () => parseCliArgs(["-m", "gpt-5-mini", "hello"]),
    CliArgError,
  );
  assert.throws(() => parseCliArgs(["-x", "hello"]), CliArgError);
  assert.throws(() => parseCliArgs(["--yes"]), CliArgError);
  assert.throws(() => parseCliArgs(["--show"]), CliArgError);
  assert.throws(() => parseCliArgs(["--no-stream"]), CliArgError);
  assert.throws(
    () => parseCliArgs(["model", "deepseek-chat"]),
    /--base-url/,
  );
});
