import { Request, Response } from "express";
import { DaxiaAssistant } from "../../assistant.js";
import { ConversationModel, MessageModel } from "../../database.js";
import { resolveCommandKey } from "../command/resolveCommandKey.js";
import { ModuleSkillRunner } from "../skills/moduleSkillRunner.js";
import { SkillStore } from "../skills/skillStore.js";

interface CommandRequestBody {
  command?: string;
  conversationId?: number;
  modelPreference?: "auto" | "ollama";
  skillId?: string;
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
  const skillStore = new SkillStore();
  const moduleSkillRunner = new ModuleSkillRunner();

  return async function handleCommand(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { command, conversationId, modelPreference, skillId } =
      req.body as CommandRequestBody;

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

      const effectiveCommand =
        modelPreference === "ollama" && !/^ollama\s+/i.test(command)
          ? `ollama ${command}`
          : command;

      const historyForModel = MessageModel.getByConversation(convId)
        .slice(0, -1)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      let openUrl: string | undefined;

      if (skillId) {
        const selectedSkill = skillStore.getById(skillId);

        if (!selectedSkill) {
          console.log(`❌ 未找到指定 Skill: ${skillId}`);
        } else {
          const output =
            selectedSkill.mode === "module"
              ? await moduleSkillRunner.run(selectedSkill, command)
              : await assistant.runSkillTask(
                  selectedSkill.prompt,
                  command,
                  historyForModel,
                );

          console.log(`🧩 已使用选中 Skill：${selectedSkill.name}`);
          console.log(output);
        }
      } else {
        switch (resolveCommandKey(effectiveCommand)) {
          case "agents": {
            const task = effectiveCommand
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
          default: {
            const autoSkill = skillStore.findAutoRunnable(effectiveCommand);
            if (autoSkill && autoSkill.mode === "module") {
              const skillOutput = await moduleSkillRunner.run(
                autoSkill,
                effectiveCommand,
              );
              console.log(`🧩 已自动调用 Skill：${autoSkill.name}`);
              console.log(skillOutput);
              break;
            }

            await assistant.smartChat(effectiveCommand, historyForModel);
          }
        }
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
