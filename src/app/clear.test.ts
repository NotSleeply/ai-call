import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { test } from "node:test";

test("runClear 清空本地 CLI 历史", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "aic-clear-"));
  const appDir = dirname(fileURLToPath(import.meta.url));
  const databaseModule = pathToFileURL(
    join(appDir, "../core/database/index.js"),
  ).href;
  const clearModule = pathToFileURL(join(appDir, "clear.js")).href;

  const script = `
    import { Database } from ${JSON.stringify(databaseModule)};
    import { runClear } from ${JSON.stringify(clearModule)};

    const db = Database.getInstance();
    const conversationId = db.createConversation("CLI 对话");
    db.addMessage(conversationId, "user", "secret");
    db.addMessage(conversationId, "assistant", "answer");

    const exitCode = await runClear();
    if (exitCode !== 0) {
      throw new Error("clear command failed");
    }
    if (db.getMessages(conversationId).length !== 0) {
      throw new Error("conversation history was not cleared");
    }
  `;

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

    assert.match(output, /已清除本地对话历史/);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
