import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { executeReadOnlyTool, getToolDefinitions } from "./tools.js";

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

test("只暴露只读工具", () => {
  assert.deepEqual(
    getToolDefinitions().map((tool) => tool.function.name),
    ["find_files", "read_file", "search_text"],
  );
});

test("find_files 和 search_text 使用项目内相对路径与正则", async () => {
  const files = await executeReadOnlyTool("find_files", { pattern: "**/*.ts" }, rootDir);
  assert.deepEqual(JSON.parse(files.content).matches, ["src/example.ts"]);

  const search = await executeReadOnlyTool(
    "search_text",
    { pattern: "answer\\s*=", path: "src" },
    rootDir,
  );
  const result = JSON.parse(search.content);
  assert.equal(result.matches[0].path, "src/example.ts");
  assert.equal(result.matches[0].line, 1);
});

test("读取敏感文件和越界路径会被拒绝", async () => {
  const secret = await executeReadOnlyTool("read_file", { path: ".env" }, rootDir);
  assert.equal(secret.isError, true);

  const outside = await executeReadOnlyTool("read_file", { path: "../secret.txt" }, rootDir);
  assert.equal(outside.isError, true);
  assert.match(outside.content, /项目目录内/);
});

test("未知工具不会执行本地操作", async () => {
  const result = await executeReadOnlyTool("run_command", { command: "echo" }, rootDir);
  assert.equal(result.isError, true);
  assert.match(result.content, /未知工具/);
  assert.match(
    await fs.readFile(join(rootDir, "src", "example.ts"), "utf8"),
    /marker/,
  );
});
