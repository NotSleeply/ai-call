import { CLI_NAME } from "./args.js";

const CLI_CONVERSATION_TITLE = "CLI 对话";

export async function runClear(): Promise<number> {
  try {
    const { Database } = await import("../core/database/index.js");
    const db = Database.getInstance();
    const conversation = db
      .getConversations()
      .find((item) => item.title === CLI_CONVERSATION_TITLE);

    if (conversation) {
      db.clearConversationHistory(conversation.id);
    }

    process.stdout.write(`${CLI_NAME}: 已清除本地对话历史\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${CLI_NAME}: ${message}\n`);
    return 1;
  }
}
