import { Request, Response } from "express";
import { existsSync } from "fs";
import { copyFile, mkdir, rename, unlink } from "fs/promises";
import { join } from "path";
import { DaxiaAssistant } from "../../assistant.js";
import { ConversationModel, MessageModel } from "../../database.js";
import { resolveCommandKey } from "../command/resolveCommandKey.js";
import { TaskSchedulerService } from "../scheduler/taskSchedulerService.js";
import { ModuleSkillRunner } from "../skills/moduleSkillRunner.js";
import { SkillStore } from "../skills/skillStore.js";

const BOOK_DEMO_SOURCE_PATH = "D:\\桌面\\test\\人间失格.epub";
const BOOK_DEMO_DESKTOP_DIR = "D:\\桌面";
const BOOK_DEMO_TARGET_PATH = join(BOOK_DEMO_DESKTOP_DIR, "人间失格.epub");

interface CommandRequestBody {
  command?: string;
  conversationId?: number;
  modelProvider?: "auto" | "deepseek" | "api" | "ollama";
  modelName?: string;
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

function shouldRunBookDemoScript(input: string): boolean {
  const normalized = input.replace(/\s+/g, "");

  const hasBook = /人间失格/.test(normalized);
  const hasFindIntent = /(忘记.*(哪里|在哪)|帮.*找|找到|查找|寻找)/.test(
    normalized,
  );
  const hasMoveToDesktopIntent =
    /(放(在|到)桌面(上)?|移动到桌面|挪到桌面|放桌面)/.test(normalized);

  return hasBook && hasFindIntent && hasMoveToDesktopIntent;
}

function shouldRun2048Script(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  const withoutAgentPrefix = normalized.replace(
    /^(agents|multiagent|swarm)\s+/,
    "",
  );

  return (
    withoutAgentPrefix.includes("2048") &&
    /(生成|打开|玩|做|来个|小游戏|play|create|make|build|start|game)/i.test(
      withoutAgentPrefix,
    )
  );
}

async function moveFileWithFallback(
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  try {
    await rename(sourcePath, targetPath);
    return;
  } catch {
    await copyFile(sourcePath, targetPath);
    await unlink(sourcePath);
  }
}

async function runBookDemoScript(): Promise<void> {
  console.info("🤔 收到，我先思考一下你的请求...");
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("🔎 正在定位《人间失格》文件...");

      setTimeout(() => {
        void (async () => {
          try {
            console.log(`📍 已检索目标路径：${BOOK_DEMO_SOURCE_PATH}`);

            if (!existsSync(BOOK_DEMO_SOURCE_PATH)) {
              console.log(`❌ 未找到文件：${BOOK_DEMO_SOURCE_PATH}`);
              resolve();
              return;
            }

            await mkdir(BOOK_DEMO_DESKTOP_DIR, { recursive: true });

            if (BOOK_DEMO_SOURCE_PATH === BOOK_DEMO_TARGET_PATH) {
              console.log("✅ 文件已经在桌面上，无需移动。");
              resolve();
              return;
            }

            await moveFileWithFallback(
              BOOK_DEMO_SOURCE_PATH,
              BOOK_DEMO_TARGET_PATH,
            );
            console.log(`📦 已移动到桌面：${BOOK_DEMO_TARGET_PATH}`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })();
      }, 5400);
    }, 9000);
  });
}

export function createCommandHandler(
  assistant: DaxiaAssistant,
  scheduler: TaskSchedulerService,
  publicServerOrigin: string,
) {
  const skillStore = new SkillStore();
  const moduleSkillRunner = new ModuleSkillRunner();

  return async function handleCommand(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { command, conversationId, modelProvider, modelName, skillId } =
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

      const chatModelOptions =
        modelProvider === "deepseek"
          ? {
              forceProvider: "deepseek" as const,
              deepseekModel: modelName,
            }
          : modelProvider === "api"
            ? {
                forceProvider: "api" as const,
                apiModel: modelName,
              }
            : modelProvider === "ollama"
              ? {
                  forceProvider: "ollama" as const,
                  ollamaModel: modelName,
                }
              : undefined;

      const effectiveCommand = command;

      const historyForModel = MessageModel.getByConversation(convId)
        .slice(0, -1)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      let openUrl: string | undefined;

      if (shouldRunBookDemoScript(effectiveCommand)) {
        console.info("🎬 人间失格找书并移动到桌面");
        await runBookDemoScript();
      } else if (skillId) {
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
                  chatModelOptions,
                );

          console.log(`🧩 已使用选中 Skill：${selectedSkill.name}`);
          console.log(output);
        }
      } else {
        const firstToken = effectiveCommand
          .trim()
          .toLowerCase()
          .split(/\s+/)[0];
        const explicitCommandTokens = new Set([
          "agents",
          "multiagent",
          "swarm",
          "schedule",
          "cron",
          "timer",
          "定时",
          "定时任务",
          "weather",
          "news",
          "email",
          "summary",
          "2048",
          "wx",
          "analyze",
          "help",
        ]);

        // Prefer user-defined module auto triggers for natural language input.
        if (!explicitCommandTokens.has(firstToken)) {
          const autoSkill = skillStore.findAutoRunnable(effectiveCommand);
          if (autoSkill && autoSkill.mode === "module") {
            const skillOutput = await moduleSkillRunner.run(
              autoSkill,
              effectiveCommand,
            );
            console.log(`🧩 已自动调用 Skill：${autoSkill.name}`);
            console.log(skillOutput);

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
            });
            return;
          }
        }

        switch (resolveCommandKey(effectiveCommand)) {
          case "schedule": {
            const scheduleText = effectiveCommand
              .replace(/^(schedule|cron|timer|定时任务|定时)\s*/i, "")
              .trim();

            if (!scheduleText || /^(help|h|帮助)$/i.test(scheduleText)) {
              console.log("⏰ 定时任务命令:");
              console.log("1) schedule add <秒> <命令>");
              console.log("2) schedule list");
              console.log("3) schedule run <任务ID>");
              console.log("4) schedule on <任务ID>");
              console.log("5) schedule off <任务ID>");
              console.log("6) schedule del <任务ID>");
              console.log("示例: schedule add 600 weather");
              break;
            }

            if (/^(list|ls|列表)$/i.test(scheduleText)) {
              const tasks = scheduler.listTasks(convId);
              if (tasks.length === 0) {
                console.log("📭 当前会话还没有定时任务");
                break;
              }

              console.log("⏰ 当前会话定时任务列表:");
              for (const task of tasks) {
                const status = task.enabled ? "启用" : "停用";
                const lastRun = task.lastRunAt || "未执行";
                console.log(
                  `#${task.id} [${status}] 每 ${task.intervalSeconds}s -> ${task.command} (上次执行: ${lastRun})`,
                );
              }
              break;
            }

            const addMatch = scheduleText.match(
              /^(add|新增)\s+(\d+)\s+([\s\S]+)$/i,
            );
            if (addMatch) {
              const intervalSeconds = Number.parseInt(addMatch[2], 10);
              const taskCommand = addMatch[3].trim();

              if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
                console.log("❌ 秒数必须是大于 0 的整数");
                break;
              }

              if (!taskCommand) {
                console.log("❌ 定时任务命令不能为空");
                break;
              }

              if (resolveCommandKey(taskCommand) === "schedule") {
                console.log("❌ 不支持在定时任务中嵌套 schedule 命令");
                break;
              }

              const task = scheduler.addTask({
                conversationId: convId,
                name: taskCommand.slice(0, 24),
                command: taskCommand,
                modelProvider: "auto",
                frequencyType: "interval",
                intervalSeconds,
                enabled: true,
              });
              console.log(
                `✅ 已创建定时任务 #${task.id}: 每 ${task.intervalSeconds}s 执行 ${task.command}`,
              );
              break;
            }

            const runMatch = scheduleText.match(/^(run|执行)\s+(\d+)$/i);
            if (runMatch) {
              const taskId = Number.parseInt(runMatch[2], 10);
              const output = await scheduler.runTaskNow(taskId);
              console.log(output);
              break;
            }

            const onMatch = scheduleText.match(/^(on|启用|开启)\s+(\d+)$/i);
            if (onMatch) {
              const taskId = Number.parseInt(onMatch[2], 10);
              const updated = scheduler.setTaskEnabled(taskId, true);
              if (!updated) {
                console.log(`❌ 未找到定时任务 #${taskId}`);
                break;
              }
              console.log(`✅ 已启用定时任务 #${updated.id}`);
              break;
            }

            const offMatch = scheduleText.match(
              /^(off|禁用|关闭|停用)\s+(\d+)$/i,
            );
            if (offMatch) {
              const taskId = Number.parseInt(offMatch[2], 10);
              const updated = scheduler.setTaskEnabled(taskId, false);
              if (!updated) {
                console.log(`❌ 未找到定时任务 #${taskId}`);
                break;
              }
              console.log(`✅ 已停用定时任务 #${updated.id}`);
              break;
            }

            const delMatch = scheduleText.match(
              /^(del|delete|remove|删除)\s+(\d+)$/i,
            );
            if (delMatch) {
              const taskId = Number.parseInt(delMatch[2], 10);
              const deleted = scheduler.deleteTask(taskId);
              if (!deleted) {
                console.log(`❌ 未找到定时任务 #${taskId}`);
                break;
              }
              console.log(`🗑️ 已删除定时任务 #${taskId}`);
              break;
            }

            console.log("❌ 无效的定时任务命令，输入 schedule help 查看帮助");
            break;
          }
          case "agents": {
            if (shouldRun2048Script(effectiveCommand)) {
              await assistant.copy2048();
              openUrl = `${publicServerOrigin}/out/2048/index.html?t=${Date.now()}`;
              break;
            }

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
            await assistant.smartChat(
              effectiveCommand,
              historyForModel,
              chatModelOptions,
            );
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
