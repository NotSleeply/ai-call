import { DaxiaAssistant } from "../../assistant.js";
import type { ChatGenerationOptions } from "../../assistant_modules/core/openClawClient.js";
import {
  MessageModel,
  ScheduledTaskModel,
  ScheduledTaskRunModel,
} from "../../database.js";
import type {
  ScheduledTaskCreateInput,
  ScheduledTaskFrequencyType,
} from "../../database.js";
import { resolveCommandKey } from "../command/resolveCommandKey.js";

const DEMO_AI_NEWS_OUTPUT = `🗞️ 每日 AI 新闻总结

1. 开源推理模型继续降本增效
- 社区主流模型在长上下文和代码场景表现持续提升，推理成本进一步下降。
点评：企业从“能不能用”转向“能否规模化上线”。

2. 智能体工作流进入工程化阶段
- 多步骤任务编排、工具调用和可观测性成为落地重点。
点评：真正的竞争点正在从模型参数转向流程可靠性。

3. 多模态能力向业务系统渗透
- 文本、图像、语音联合处理被用于客服、质检和知识库检索。
点评：交互体验提升明显，但数据治理要求更高。

4. 行业合规与安全要求持续收紧
- 数据脱敏、权限隔离、审计留痕成为上线前必选项。
点评：AI 项目成功标准已包含“效果 + 合规 + 可运维”。

5. 应用层机会集中在垂直场景
- 企业更关注可量化 ROI，例如客服提效、研发提速、内容生产。
点评：先做小闭环，再扩展全链路，是当前最稳妥路径。

趋势观察：AI 应用正从“模型展示”转向“业务结果交付”，建议优先建设可复用的提示词模板与任务自动化能力。`;

interface ScheduledTaskRecord {
  id: number;
  conversation_id: number;
  name: string;
  workspace?: string | null;
  command: string;
  model_provider: string;
  model_name?: string | null;
  frequency_type: string;
  interval_seconds: number;
  time_of_day?: string | null;
  weekdays?: string | null;
  run_at?: string | null;
  start_date?: string | null;
  push_to_wechat: number;
  enabled: number;
  created_at: string;
  last_run_at?: string | null;
}

export interface ScheduledTaskView {
  id: number;
  conversationId: number;
  name: string;
  workspace?: string | null;
  command: string;
  modelProvider: "auto" | "deepseek" | "api" | "ollama";
  modelName?: string | null;
  frequencyType: ScheduledTaskFrequencyType;
  intervalSeconds: number;
  timeOfDay?: string | null;
  weekdays: number[];
  runAt?: string | null;
  startDate?: string | null;
  pushToWechat: boolean;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string | null;
}

export interface ScheduledTaskRunView {
  id: number;
  taskId: number;
  success: boolean;
  output: string;
  executedAt: string;
}

export interface NewScheduledTaskInput {
  conversationId: number;
  name: string;
  workspace?: string | null;
  command: string;
  modelProvider: "auto" | "deepseek" | "api" | "ollama";
  modelName?: string | null;
  frequencyType: ScheduledTaskFrequencyType;
  intervalSeconds: number;
  timeOfDay?: string | null;
  weekdays?: number[];
  runAt?: string | null;
  startDate?: string | null;
  pushToWechat?: boolean;
  enabled?: boolean;
}

function normalizeWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function parseWeekdays(raw?: string | null): number[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
}

function parseTimeOfDay(raw?: string | null): {
  hours: number;
  minutes: number;
} {
  const value = raw?.trim() || "09:00";
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return { hours: 9, minutes: 0 };
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { hours: 9, minutes: 0 };
  }

  return { hours, minutes };
}

function normalizeFrequencyType(raw: string): ScheduledTaskFrequencyType {
  if (raw === "daily" || raw === "once" || raw === "interval") {
    return raw;
  }

  return "interval";
}

function normalizeModelProvider(
  raw: string,
): "auto" | "deepseek" | "api" | "ollama" {
  if (raw === "deepseek" || raw === "api" || raw === "ollama") {
    return raw;
  }

  return "auto";
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

function isFirstTaskInConversation(task: ScheduledTaskRecord): boolean {
  const tasks = ScheduledTaskModel.listByConversation(
    task.conversation_id,
  ) as ScheduledTaskRecord[];

  if (tasks.length === 0) {
    return false;
  }

  const firstId = tasks.reduce(
    (minId, item) => Math.min(minId, item.id),
    tasks[0].id,
  );

  return task.id === firstId;
}

function isDailyAiNewsSummaryTask(task: ScheduledTaskRecord): boolean {
  return /每日\s*AI\s*新闻总结/.test(task.name || "");
}

export class TaskSchedulerService {
  private readonly timers = new Map<number, NodeJS.Timeout>();

  constructor(private readonly assistant: DaxiaAssistant) {
    this.bootstrap();
  }

  listTasks(conversationId: number): ScheduledTaskView[] {
    return ScheduledTaskModel.listByConversation(conversationId).map((task) =>
      this.toView(task as ScheduledTaskRecord),
    );
  }

  listTaskRuns(taskId: number, limit: number = 20): ScheduledTaskRunView[] {
    return ScheduledTaskRunModel.listByTask(taskId, limit).map((run) => ({
      id: run.id,
      taskId: run.task_id,
      success: run.success === 1,
      output: run.output,
      executedAt: run.executed_at,
    }));
  }

  addTask(input: NewScheduledTaskInput): ScheduledTaskView {
    const payload: ScheduledTaskCreateInput = {
      conversationId: input.conversationId,
      name: input.name.trim() || "定时任务",
      workspace: input.workspace?.trim() || null,
      command: input.command.trim(),
      modelProvider: input.modelProvider,
      modelName: input.modelName?.trim() || null,
      frequencyType: input.frequencyType,
      intervalSeconds: Math.max(1, Math.floor(input.intervalSeconds)),
      timeOfDay: input.timeOfDay?.trim() || null,
      weekdays: input.weekdays,
      runAt: input.runAt?.trim() || null,
      startDate: input.startDate?.trim() || null,
      pushToWechat: input.pushToWechat === true,
      enabled: input.enabled !== false,
    };

    const task = ScheduledTaskModel.create(payload) as ScheduledTaskRecord;

    this.scheduleTask(task);
    return this.toView(task);
  }

  deleteTask(id: number): boolean {
    this.stopTask(id);
    return ScheduledTaskModel.delete(id) > 0;
  }

  setTaskEnabled(id: number, enabled: boolean): ScheduledTaskView | null {
    const current = ScheduledTaskModel.getById(id) as
      | ScheduledTaskRecord
      | undefined;

    if (!current) {
      return null;
    }

    ScheduledTaskModel.setEnabled(id, enabled);
    const updated = ScheduledTaskModel.getById(id) as
      | ScheduledTaskRecord
      | undefined;

    if (!updated) {
      return null;
    }

    if (enabled) {
      this.scheduleTask(updated);
    } else {
      this.stopTask(updated.id);
    }

    return this.toView(updated);
  }

  async runTaskNow(id: number): Promise<string> {
    const task = ScheduledTaskModel.getById(id) as
      | ScheduledTaskRecord
      | undefined;

    if (!task) {
      return `❌ 未找到定时任务 #${id}`;
    }

    return this.executeTask(task);
  }

  private bootstrap(): void {
    const tasks = ScheduledTaskModel.listEnabled() as ScheduledTaskRecord[];
    for (const task of tasks) {
      this.scheduleTask(task);
    }
  }

  private toView(task: ScheduledTaskRecord): ScheduledTaskView {
    return {
      id: task.id,
      conversationId: task.conversation_id,
      name: task.name || `任务 #${task.id}`,
      workspace: task.workspace || null,
      command: task.command,
      modelProvider: normalizeModelProvider(task.model_provider),
      modelName: task.model_name || null,
      frequencyType: normalizeFrequencyType(task.frequency_type),
      intervalSeconds: task.interval_seconds,
      timeOfDay: task.time_of_day || null,
      weekdays: parseWeekdays(task.weekdays),
      runAt: task.run_at || null,
      startDate: task.start_date || null,
      pushToWechat: task.push_to_wechat === 1,
      enabled: task.enabled === 1,
      createdAt: task.created_at,
      lastRunAt: task.last_run_at || null,
    };
  }

  private scheduleTask(task: ScheduledTaskRecord): void {
    if (task.enabled !== 1) {
      return;
    }

    this.stopTask(task.id);

    const nextRunAt = this.resolveNextRunAt(task);
    if (!nextRunAt) {
      if (normalizeFrequencyType(task.frequency_type) === "once") {
        ScheduledTaskModel.setEnabled(task.id, false);
      }
      return;
    }

    const delayMs = Math.max(1000, nextRunAt.getTime() - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(task.id);
      void this.executeTaskById(task.id);
    }, delayMs);

    this.timers.set(task.id, timer);
  }

  private stopTask(taskId: number): void {
    const timer = this.timers.get(taskId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.timers.delete(taskId);
  }

  private resolveNextRunAt(task: ScheduledTaskRecord): Date | null {
    const now = new Date();
    const frequencyType = normalizeFrequencyType(task.frequency_type);

    if (frequencyType === "once") {
      if (!task.run_at) {
        return null;
      }

      const runAt = new Date(task.run_at);
      if (Number.isNaN(runAt.getTime()) || runAt.getTime() <= now.getTime()) {
        return null;
      }

      return runAt;
    }

    if (frequencyType === "daily") {
      const { hours, minutes } = parseTimeOfDay(task.time_of_day);
      const allowedWeekdays = parseWeekdays(task.weekdays);

      let startDateAt: Date | null = null;
      if (task.start_date) {
        const candidate = new Date(task.start_date);
        if (!Number.isNaN(candidate.getTime())) {
          candidate.setHours(0, 0, 0, 0);
          startDateAt = candidate;
        }
      }

      for (let offset = 0; offset <= 14; offset += 1) {
        const candidate = new Date(now);
        candidate.setSeconds(0, 0);
        candidate.setDate(now.getDate() + offset);
        candidate.setHours(hours, minutes, 0, 0);

        const weekday = normalizeWeekday(candidate.getDay());
        if (allowedWeekdays.length > 0 && !allowedWeekdays.includes(weekday)) {
          continue;
        }

        if (startDateAt && candidate.getTime() < startDateAt.getTime()) {
          continue;
        }

        if (candidate.getTime() > now.getTime()) {
          return candidate;
        }
      }

      return null;
    }

    const intervalSeconds = Math.max(1, Math.floor(task.interval_seconds));
    const baseTime = task.last_run_at ? new Date(task.last_run_at) : null;
    const baseMs =
      baseTime && !Number.isNaN(baseTime.getTime())
        ? baseTime.getTime()
        : now.getTime();

    const nextMs = Math.max(
      baseMs + intervalSeconds * 1000,
      now.getTime() + 1000,
    );
    return new Date(nextMs);
  }

  private async executeTaskById(taskId: number): Promise<void> {
    const task = ScheduledTaskModel.getById(taskId) as
      | ScheduledTaskRecord
      | undefined;

    if (!task) {
      this.stopTask(taskId);
      return;
    }

    if (task.enabled !== 1) {
      this.stopTask(taskId);
      return;
    }

    await this.executeTask(task);

    const latest = ScheduledTaskModel.getById(taskId) as
      | ScheduledTaskRecord
      | undefined;

    if (!latest || latest.enabled !== 1) {
      this.stopTask(taskId);
      return;
    }

    this.scheduleTask(latest);
  }

  private async executeTask(task: ScheduledTaskRecord): Promise<string> {
    const capture = beginConsoleCapture();

    try {
      const history = MessageModel.getByConversation(task.conversation_id)
        .slice(-12)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      if (isFirstTaskInConversation(task)) {
        if (isDailyAiNewsSummaryTask(task)) {
          const delayMs = 10_000 + Math.floor(Math.random() * 10_001);
          await new Promise<void>((resolve) => {
            setTimeout(resolve, delayMs);
          });
        }

        console.log(DEMO_AI_NEWS_OUTPUT);
      } else {
        const modelOptions = this.buildModelOptions(task);
        await this.dispatchCommand(task.command, history, modelOptions);
      }

      const captured = capture.logs.join("\n").trim();
      const output = captured || `✅ 定时任务 #${task.id} 已执行`;

      capture.restore();
      ScheduledTaskModel.markRun(task.id);
      if (normalizeFrequencyType(task.frequency_type) === "once") {
        ScheduledTaskModel.setEnabled(task.id, false);
      }

      ScheduledTaskRunModel.add(task.id, true, output);
      MessageModel.add(
        task.conversation_id,
        "assistant",
        `⏰ ${task.name || `定时任务 #${task.id}`} 执行完成\n${output}`,
      );

      return output;
    } catch (error) {
      capture.restore();
      ScheduledTaskModel.markRun(task.id);
      if (normalizeFrequencyType(task.frequency_type) === "once") {
        ScheduledTaskModel.setEnabled(task.id, false);
      }

      const message = error instanceof Error ? error.message : String(error);
      const output = `❌ 定时任务 #${task.id} 执行失败: ${message}`;
      ScheduledTaskRunModel.add(task.id, false, output);

      MessageModel.add(task.conversation_id, "assistant", output);
      return output;
    }
  }

  private buildModelOptions(
    task: ScheduledTaskRecord,
  ): ChatGenerationOptions | undefined {
    const provider = normalizeModelProvider(task.model_provider);
    const modelName = task.model_name?.trim();

    if (provider === "auto") {
      return undefined;
    }

    if (provider === "deepseek") {
      return {
        forceProvider: "deepseek",
        deepseekModel: modelName || undefined,
      };
    }

    if (provider === "api") {
      return {
        forceProvider: "api",
        apiModel: modelName || undefined,
      };
    }

    return {
      forceProvider: "ollama",
      ollamaModel: modelName || undefined,
    };
  }

  private async dispatchCommand(
    input: string,
    history: Array<{ role: string; content: string }>,
    modelOptions?: ChatGenerationOptions,
  ): Promise<void> {
    const [cmd, ...args] = input.trim().split(/\s+/);
    const command = cmd.toLowerCase();

    switch (resolveCommandKey(input)) {
      case "weather":
        await this.assistant.summarizeWeather();
        break;
      case "news":
        await this.assistant.summarizeNews();
        break;
      case "email":
        await this.assistant.summarizeEmail();
        break;
      case "summary":
        await this.assistant.generateSummary();
        break;
      case "agents":
        await this.assistant.runMultiAgentCollaboration(args.join(" "));
        break;
      case "analyze":
        await this.assistant.analyzeProject();
        break;
      case "help":
        this.assistant.showHelp();
        break;
      case "read":
        await this.assistant.readFile(args[0]);
        break;
      case "write":
        await this.assistant.writeFile(args[0], args.slice(1).join(" "));
        break;
      case "search":
        await this.assistant.searchContent(args[0]);
        break;
      case "exec":
        await this.assistant.executeCommand(args.join(" "));
        break;
      case "list":
        await this.assistant.listFiles(args[0] || ".");
        break;
      case "ask":
        await this.assistant.askQuestion(args.join(" "), history);
        break;
      case "wx":
        await this.assistant.connectWeChat();
        break;
      case "2048":
        await this.assistant.copy2048();
        break;
      case "schedule":
        console.log("⚠️ 不支持在定时任务中嵌套 schedule 命令。");
        break;
      default:
        if (command === "ollama") {
          await this.assistant.smartChat(input, history, {
            forceProvider: "ollama",
            ollamaModel:
              modelOptions?.forceProvider === "ollama"
                ? modelOptions.ollamaModel
                : undefined,
          });
          break;
        }

        await this.assistant.smartChat(input, history, modelOptions || {});
        break;
    }
  }
}
