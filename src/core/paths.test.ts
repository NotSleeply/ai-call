import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir, tmpdir } from "os";
import { join, normalize } from "path";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "fs";
import {
  migrateLegacyData,
  resolveDataDir,
  resolveLegacyDbPath,
} from "./paths.js";

test("resolveLegacyDbPath 从 dist/core/database 回溯到项目根 data", () => {
  const moduleDir = join("opt", "aic", "dist", "core", "database");
  assert.equal(
    normalize(resolveLegacyDbPath(moduleDir)),
    normalize(join("opt", "aic", "data", "daxia.db")),
  );
});

test("resolveDataDir 默认落到 ~/.ai-call/data", () => {
  delete process.env.AI_CALL_DATA_DIR;
  assert.equal(resolveDataDir(), join(homedir(), ".ai-call", "data"));
});

test("resolveDataDir 尊重 AI_CALL_DATA_DIR 环境变量", () => {
  process.env.AI_CALL_DATA_DIR = "D:/tmp/ai-call-test";
  assert.equal(resolveDataDir(), "D:/tmp/ai-call-test");
  delete process.env.AI_CALL_DATA_DIR;
});

test("migrateLegacyData 在新库不存在时复制旧库", () => {
  const dir = mkdtempSync(join(tmpdir(), "aic-test-"));
  const legacyDb = join(dir, "legacy", "daxia.db");
  const targetDir = join(dir, "new");
  mkdirSync(join(dir, "legacy"), { recursive: true });
  writeFileSync(legacyDb, "legacy-db-content");

  migrateLegacyData(targetDir, legacyDb);

  assert.ok(existsSync(join(targetDir, "daxia.db")));
  assert.equal(
    readFileSync(join(targetDir, "daxia.db"), "utf8"),
    "legacy-db-content",
  );
});

test("migrateLegacyData 在新库已存在时保持不动", () => {
  const dir = mkdtempSync(join(tmpdir(), "aic-test-"));
  const legacyDb = join(dir, "legacy", "daxia.db");
  const targetDir = join(dir, "new");
  mkdirSync(join(dir, "legacy"), { recursive: true });
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(legacyDb, "legacy");
  writeFileSync(join(targetDir, "daxia.db"), "new");

  migrateLegacyData(targetDir, legacyDb);

  assert.equal(readFileSync(join(targetDir, "daxia.db"), "utf8"), "new");
});

test("migrateLegacyData 旧库不存在时不创建任何东西", () => {
  const dir = mkdtempSync(join(tmpdir(), "aic-test-"));
  const targetDir = join(dir, "new");

  migrateLegacyData(targetDir, join(dir, "nope", "daxia.db"));

  assert.ok(!existsSync(targetDir));
});
