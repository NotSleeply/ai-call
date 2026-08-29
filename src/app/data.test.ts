import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { clearDataDirectory } from "./data.js";

test("runData 清除整个本地 data 目录但不影响配置文件", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "aic-data-clear-"));
  const configPath = join(dirname(dataDir), "config.env");
  const appDir = dirname(fileURLToPath(import.meta.url));
  const dataModule = pathToFileURL(join(appDir, "data.js")).href;

  mkdirSync(join(dataDir, "nested"), { recursive: true });
  writeFileSync(join(dataDir, "daxia.db"), "database", "utf8");
  writeFileSync(
    join(dataDir, "reasoning-capabilities.json"),
    JSON.stringify({ entries: [] }),
    "utf8",
  );
  writeFileSync(join(dataDir, "nested", "extra"), "data", "utf8");
  writeFileSync(configPath, "AIC_MODEL=test-model\n", "utf8");

  const script = [
    "import { runData } from " + JSON.stringify(dataModule) + ";",
    "",
    "const exitCode = runData({ clearData: true });",
    'if (exitCode !== 0) throw new Error("data --clear command failed");',
  ].join("\n");

  try {
    const output = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        env: { ...process.env, AI_CALL_DATA_DIR: dataDir },
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    assert.match(output, /已清除本地运行数据/);
    assert.equal(existsSync(dataDir), false);
    assert.equal(readFileSync(configPath, "utf8"), "AIC_MODEL=test-model\n");
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(configPath, { force: true });
  }
});

test("data --clear 拒绝清除当前工作目录和文件系统根目录", () => {
  assert.throws(
    () => clearDataDirectory(process.cwd()),
    /拒绝清除当前工作目录/,
  );
  assert.throws(
    () => clearDataDirectory(parse(process.cwd()).root),
    /拒绝清除文件系统根目录/,
  );
});
