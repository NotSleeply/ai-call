import { Request, Response } from "express";
import { DaxiaAssistant } from "../../assistant.js";
import { ConversationModel, MessageModel } from "../../database.js";
import { resolveCommandKey } from "../command/resolveCommandKey.js";

interface CommandRequestBody {
  command?: string;
  conversationId?: number;
}

function beginConsoleCapture(): {
  logs: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const originalLog = console.log;

  console.log = (...args: unknown[]) => {
    logs.push(args.map((arg) => String(arg)).join(" "));
  };

  return {
    logs,
    restore: () => {
      console.log = originalLog;
    },
  };
}

export function createCommandHandler(
  assistant: DaxiaAssistant,
  publicServerOrigin: string,
) {
  return async function handleCommand(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { command, conversationId } = req.body as CommandRequestBody;

    if (!command) {
      res.json({
        success: false,
        message: "命令不能为空",
      });
      return;
    }

    const convId = conversationId || 1;
    const capture = beginConsoleCapture();

    try {
      MessageModel.add(convId, "user", command);

      const historyForModel = MessageModel.getByConversation(convId)
        .slice(0, -1)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      let openUrl: string | undefined;

      switch (resolveCommandKey(command)) {
        case "agents": {
          const task = command
            .replace(/^(agents|multiagent|swarm)\s*/i, "")
            .trim();
          await assistant.runMultiAgentCollaboration(task || undefined);
          break;
        }
        case "weather":
          await assistant.summarizeWeather();
          break;
        case "news":
          await assistant.summarizeNews();
          break;
        case "email":
          await assistant.summarizeEmail();
          break;
        case "summary":
          await assistant.generateSummary();
          break;
        case "2048":
          await assistant.copy2048();
          openUrl = `${publicServerOrigin}/out/2048/index.html?t=${Date.now()}`;
          break;
        case "wx": {
          const qrCodeUrl = await assistant.generateQRCodeBase64();
          await assistant.connectWeChat();
          MessageModel.add(
            convId,
            "assistant",
            "请使用微信扫描二维码登录",
            qrCodeUrl,
          );

          capture.restore();
          res.json({
            success: true,
            message: "微信连接成功",
            data: { qrCodeUrl, message: capture.logs.join("\n") },
          });
          return;
        }
        case "analyze":
          await assistant.analyzeProject();
          break;
        case "help":
          assistant.showHelp();
          break;
        default:
          await assistant.smartChat(command, historyForModel);
      }

      const data = capture.logs.join("\n");
      capture.restore();

      MessageModel.add(convId, "assistant", data);

      const conv = ConversationModel.getById(convId);
      if (conv && conv.title === "新对话") {
        ConversationModel.updateTitle(
          convId,
          command.slice(0, 20) + (command.length > 20 ? "..." : ""),
        );
      }

      res.json({
        success: true,
        message: "命令执行成功",
        data,
        ...(openUrl ? { openUrl } : {}),
      });
    } catch (error) {
      capture.restore();
      const message = error instanceof Error ? error.message : "命令执行失败";
      res.json({
        success: false,
        message,
      });
    }
  };
}
