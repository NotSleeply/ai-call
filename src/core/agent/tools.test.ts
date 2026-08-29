import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { executeLocalTool, getToolDefinitions } from "./tools.js";

let rootDir = "";

before(async () => {
  rootDir = await fs.mkdtemp(join(tmpdir(), "aic-tools-"));
  await fs.mkdir(join(rootDir, "src"));
  await fs.writeFile(
    join(rootDir, "src", "example.ts"),
    "const answer = 42;\n// marker\n",
    "utf8",
  );
  await fs.writeFile(join(rootDir, ".env"), "AIC_API_KEY=secret\n", "utf8");
});

after(async () => {
  await fs.rm(rootDir, { recursive: true, force: true });
});

test("只读模式不暴露执行和编辑工具", () => {
  assert.deepEqual(
    getToolDefinitions(false).map((tool) => tool.function.name),
    ["find_files", "read_file", "search_text"],
  );
  assert.deepEqual(
    getToolDefinitions(true).map((tool) => tool.function.name),
    ["find_files", "read_file", "search_text", "run_command", "edit_file"],
  );
});

test("find_files 和 search_text 使用项目内相对路径与正则", async () => {
  const files = await executeLocalTool("find_files", { pattern: "**/*.ts" }, rootDir);
  assert.deepEqual(JSON.parse(files.content).matches, ["src/example.ts"]);

  const search = await executeLocalTool(
    "search_text",
    { pattern: "answer\\s*=", path: "src" },
    rootDir,
  );
  const result = JSON.parse(search.content);
  assert.equal(result.matches[0].path, "src/example.ts");
  assert.equal(result.matches[0].line, 1);
});

test("读取敏感文件和越界路径会被拒绝", async () => {
  const secret = await executeLocalTool("read_file", { path: ".env" }, rootDir);
  assert.equal(secret.isError, true);

  const outside = await executeLocalTool("read_file", { path: "../secret.txt" }, rootDir);
  assert.equal(outside.isError, true);
  assert.match(outside.content, /项目目录内/);
});

test("run_command 使用参数数组执行且不启动 shell", async () => {
  const result = await executeLocalTool(
    "run_command",
    {
      command: process.execPath,
      args: ["-e", "process.stdout.write('ok')"],
      cwd: ".",
      timeoutMs: 2_000,
    },
    rootDir,
  );
  const content = JSON.parse(result.content);
  assert.equal(content.success, true);
  assert.equal(content.stdout, "ok");

  const shell = await executeLocalTool(
    "run_command",
    { command: "echo ok && echo unsafe" },
    rootDir,
  );
  assert.equal(shell.isError, true);
});

test("edit_file 只接受能匹配当前内容的补丁", async () => {
  const result = await executeLocalTool(
    "edit_file",
    {
      path: "src/example.ts",
      patch: [
        "*** Begin Patch",
        "*** Update File: src/example.ts",
        "@@",
        " const answer = 42;",
        "-// marker",
        "+// changed",
        "*** End Patch",
      ].join("\n"),
    },
    rootDir,
  );
  assert.equal(result.isError, undefined);
  assert.match((await fs.readFile(join(rootDir, "src", "example.ts"), "utf8")), /changed/);
});
