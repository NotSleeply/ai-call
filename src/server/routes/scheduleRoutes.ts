import { Router } from "express";
import { TaskSchedulerService } from "../scheduler/taskSchedulerService.js";

interface ScheduleCreateBody {
  conversationId?: number;
  name?: string;
  workspace?: string;
  prompt?: string;
  intervalSeconds?: number;
  intervalMinutes?: number;
  frequencyType?: "daily" | "interval" | "once";
  timeOfDay?: string;
  weekdays?: number[];
  runAt?: string;
  startDate?: string;
  modelProvider?: "auto" | "deepseek" | "api" | "ollama";
  modelName?: string;
  pushToWechat?: boolean;
  command?: string;
}

interface ScheduleUpdateBody {
  enabled?: boolean;
}

export function createScheduleRoutes(scheduler: TaskSchedulerService): Router {
  const router = Router();

  router.get("/schedules", (req, res) => {
    const conversationId = Number.parseInt(
      String(req.query.conversationId || "1"),
      10,
    );

    const tasks = scheduler.listTasks(
      Number.isFinite(conversationId) ? conversationId : 1,
    );

    res.json({
      success: true,
      message: "获取定时任务成功",
      data: tasks,
    });
  });

  router.get("/schedules/:id/runs", (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const limit = Number.parseInt(String(req.query.limit || "20"), 10);

    if (!Number.isFinite(id)) {
      res.json({
        success: false,
        message: "任务 ID 无效",
      });
      return;
    }

    const runs = scheduler.listTaskRuns(
      id,
      Number.isFinite(limit) ? limit : 20,
    );

    res.json({
      success: true,
      message: "获取执行历史成功",
      data: runs,
    });
  });

  router.post("/schedules", (req, res) => {
    const {
      conversationId,
      name,
      workspace,
      prompt,
      intervalSeconds,
      intervalMinutes,
      frequencyType,
      timeOfDay,
      weekdays,
      runAt,
      startDate,
      modelProvider,
      modelName,
      pushToWechat,
      command,
    } = req.body as ScheduleCreateBody;

    const normalizedCommand = String(prompt || command || "").trim();

    if (!normalizedCommand) {
      res.json({
        success: false,
        message: "提示词不能为空",
      });
      return;
    }

    const normalizedProvider =
      modelProvider === "deepseek" ||
      modelProvider === "api" ||
      modelProvider === "ollama"
        ? modelProvider
        : "auto";

    const normalizedFrequencyType =
      frequencyType === "daily" ||
      frequencyType === "once" ||
      frequencyType === "interval"
        ? frequencyType
        : "daily";

    let normalizedIntervalSeconds = 600;
    let normalizedRunAt: string | null = null;
    let normalizedTimeOfDay: string | null = null;
    const normalizedWeekdays = Array.isArray(weekdays)
      ? weekdays
          .map((day) => Number.parseInt(String(day), 10))
          .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
      : [];

    if (normalizedFrequencyType === "interval") {
      const fromMinutes = Number(intervalMinutes);
      const rawSeconds = Number.isFinite(fromMinutes)
        ? Math.floor(fromMinutes * 60)
        : Number(intervalSeconds);

      if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) {
        res.json({
          success: false,
          message: "按间隔执行时，间隔分钟必须大于 0",
        });
        return;
      }

      normalizedIntervalSeconds = Math.max(1, Math.floor(rawSeconds));
    } else if (normalizedFrequencyType === "daily") {
      const rawTime = String(timeOfDay || "09:00").trim();
      if (!/^(\d{1,2}):(\d{2})$/.test(rawTime)) {
        res.json({
          success: false,
          message: "每天执行的时间格式应为 HH:mm",
        });
        return;
      }

      normalizedIntervalSeconds = 24 * 60 * 60;
      normalizedTimeOfDay = rawTime;
    } else {
      const dateText = String(runAt || "").trim();
      if (!dateText) {
        res.json({
          success: false,
          message: "单次执行需要指定执行时间",
        });
        return;
      }

      const parsed = new Date(dateText);
      if (Number.isNaN(parsed.getTime())) {
        res.json({
          success: false,
          message: "单次执行时间无效",
        });
        return;
      }

      if (parsed.getTime() <= Date.now()) {
        res.json({
          success: false,
          message: "单次执行时间必须晚于当前时间",
        });
        return;
      }

      normalizedIntervalSeconds = 1;
      normalizedRunAt = parsed.toISOString();
    }

    const task = scheduler.addTask({
      conversationId: Number.isFinite(Number(conversationId))
        ? Number(conversationId)
        : 1,
      name: String(name || normalizedCommand.slice(0, 24) || "定时任务").trim(),
      workspace: workspace ? String(workspace) : null,
      command: normalizedCommand,
      modelProvider: normalizedProvider,
      modelName: modelName ? String(modelName) : null,
      frequencyType: normalizedFrequencyType,
      intervalSeconds: normalizedIntervalSeconds,
      timeOfDay: normalizedTimeOfDay,
      weekdays: normalizedWeekdays,
      runAt: normalizedRunAt,
      startDate: startDate ? String(startDate) : null,
      pushToWechat: pushToWechat === true,
      enabled: true,
    });

    res.json({
      success: true,
      message: "创建定时任务成功",
      data: task,
    });
  });

  router.patch("/schedules/:id", (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const { enabled } = req.body as ScheduleUpdateBody;

    if (!Number.isFinite(id)) {
      res.json({
        success: false,
        message: "任务 ID 无效",
      });
      return;
    }

    if (typeof enabled !== "boolean") {
      res.json({
        success: false,
        message: "enabled 必须是布尔值",
      });
      return;
    }

    const task = scheduler.setTaskEnabled(id, enabled);

    if (!task) {
      res.json({
        success: false,
        message: "未找到定时任务",
      });
      return;
    }

    res.json({
      success: true,
      message: "更新定时任务状态成功",
      data: task,
    });
  });

  router.post("/schedules/:id/run", async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isFinite(id)) {
      res.json({
        success: false,
        message: "任务 ID 无效",
      });
      return;
    }

    const output = await scheduler.runTaskNow(id);

    res.json({
      success: true,
      message: "立即执行完成",
      data: { output },
    });
  });

  router.delete("/schedules/:id", (req, res) => {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isFinite(id)) {
      res.json({
        success: false,
        message: "任务 ID 无效",
      });
      return;
    }

    const deleted = scheduler.deleteTask(id);

    if (!deleted) {
      res.json({
        success: false,
        message: "未找到定时任务",
      });
      return;
    }

    res.json({
      success: true,
      message: "删除定时任务成功",
    });
  });

  return router;
}
