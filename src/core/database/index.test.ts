import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { test } from "node:test";

test("trimMessages 只保留最新的消息", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "aic-database-"));
  const databaseModule = pathToFileURL(
    join(dirname(fileURLToPath(import.meta.url)), "index.js"),
  ).href;

  const script = `
    import { Database } from ${JSON.stringify(databaseModule)};

    const db = Database.getInstance();
    const conversationId = db.createConversation("retention-test");
    for (let index = 0; index < 20; index += 1) {
      db.addMessage(conversationId, "user", "message-" + index);
    }

    db.trimMessages(conversationId, 12);

    const messages = db.getMessages(conversationId);
    if (messages.length !== 12) {
      throw new Error("expected 12 messages, got " + messages.length);
    }
    if (messages[0].content !== "message-8" || messages.at(-1)?.content !== "message-19") {
      throw new Error("old messages were not trimmed in chronological order");
    }
  `;

  try {
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        env: { ...process.env, AI_CALL_DATA_DIR: dataDir },
        stdio: "pipe",
      });
    });
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
