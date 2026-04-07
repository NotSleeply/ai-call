import { computed, ref, watch, type Ref } from "vue";
import {
  daxiaAPI,
  type CommandResponse,
  type CreateSchedulePayload,
  type ModelProvider,
  type ScheduledTask,
  type ScheduledTaskRun,
  type ScheduleFrequencyType,
} from "../../../api/daxia";

export interface SelectableModel {
  label: string;
  provider: Exclude<ModelProvider, "auto">;
  modelName: string;
}

interface ScheduleFormState {
  name: string;
  workspace: string;
  prompt: string;
  modelProvider: ModelProvider;
  modelName: string;
  frequencyType: ScheduleFrequencyType;
  intervalMinutes: number;
  timeOfDay: string;
  weekdays: number[];
  runAt: string;
  startDate: string;
}

type ScheduleRunLogType = "info" | "success" | "error";
const RUN_NOW_DELAY_MS = 15_000;

interface ScheduleRunLogItem {
  id: number;
  type: ScheduleRunLogType;
  content: string;
  createdAt: string;
}

export function useScheduleManager(
  currentChatId: Ref<number>,
  defaultModelProvider: Ref<ModelProvider>,
  defaultModelName: Ref<string>,
  commonModels: SelectableModel[],
  customModels: Ref<SelectableModel[]>,
) {
  const scheduleWeekdayOptions: Array<{ value: number; label: string }> = [
    { value: 1, label: "周一" },
    { value: 2, label: "周二" },
    { value: 3, label: "周三" },
    { value: 4, label: "周四" },
    { value: 5, label: "周五" },
    { value: 6, label: "周六" },
    { value: 7, label: "周日" },
  ];

  function createDefaultScheduleForm(): ScheduleFormState {
    return {
      name: "",
      workspace: "",
      prompt: "",
      modelProvider: defaultModelProvider.value,
      modelName:
        defaultModelProvider.value === "auto" ? "" : defaultModelName.value,
      frequencyType: "daily",
      intervalMinutes: 10,
      timeOfDay: "09:00",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      runAt: "",
      startDate: "",
    };
  }

  const schedulePanelVisible = ref(false);
  const scheduleLoading = ref(false);
  const scheduleSaving = ref(false);
  const scheduleError = ref("");
  const scheduleTasks = ref<ScheduledTask[]>([]);
  const scheduleForm = ref<ScheduleFormState>(createDefaultScheduleForm());
  const expandedScheduleTaskId = ref<number | null>(null);
  const scheduleRunsByTask = ref<Record<number, ScheduledTaskRun[]>>({});
  const scheduleRunsLoading = ref<Record<number, boolean>>({});

  const scheduleRunDialogVisible = ref(false);
  const scheduleRunDialogTaskId = ref<number | null>(null);
  const scheduleRunDialogTaskName = ref("");
  const scheduleRunDialogLoading = ref(false);
  const scheduleRunDialogLogs = ref<ScheduleRunLogItem[]>([]);

  const scheduleModelDisplay = computed(() => {
    if (scheduleForm.value.modelProvider === "auto") {
      return "Auto";
    }

    const allOptions = [...commonModels, ...customModels.value];
    const matched = allOptions.find(
      (item) =>
        item.provider === scheduleForm.value.modelProvider &&
        item.modelName === scheduleForm.value.modelName,
    );

    return (
      matched?.label ||
      `${scheduleForm.value.modelProvider}:${scheduleForm.value.modelName || "默认模型"}`
    );
  });

  const scheduleCanSubmit = computed(() => {
    if (!scheduleForm.value.name.trim() || !scheduleForm.value.prompt.trim()) {
      return false;
    }

    if (
      scheduleForm.value.modelProvider !== "auto" &&
      !scheduleForm.value.modelName.trim()
    ) {
      return false;
    }

    if (scheduleForm.value.frequencyType === "interval") {
      return Number(scheduleForm.value.intervalMinutes) > 0;
    }

    if (scheduleForm.value.frequencyType === "daily") {
      return (
        /^(\d{1,2}):(\d{2})$/.test(scheduleForm.value.timeOfDay) &&
        scheduleForm.value.weekdays.length > 0
      );
    }

    return !!scheduleForm.value.runAt;
  });

  watch(currentChatId, () => {
    if (schedulePanelVisible.value) {
      void refreshScheduleTasks();
    }
  });

  function resetScheduleForm(): void {
    scheduleForm.value = createDefaultScheduleForm();
  }

  function toggleScheduleWeekday(day: number): void {
    if (scheduleForm.value.frequencyType !== "daily") {
      return;
    }

    if (scheduleForm.value.weekdays.includes(day)) {
      scheduleForm.value.weekdays = scheduleForm.value.weekdays.filter(
        (item) => item !== day,
      );
    } else {
      scheduleForm.value.weekdays = [...scheduleForm.value.weekdays, day].sort(
        (a, b) => a - b,
      );
    }
  }

  function taskScheduleText(task: ScheduledTask): string {
    if (task.frequencyType === "interval") {
      const minutes = Math.max(1, Math.round(task.intervalSeconds / 60));
      return `按间隔 · 每 ${minutes} 分钟`;
    }

    if (task.frequencyType === "once") {
      return `单次 · ${task.runAt || "未设置时间"}`;
    }

    const weekdays = task.weekdays
      .map(
        (day) =>
          scheduleWeekdayOptions.find((item) => item.value === day)?.label,
      )
      .filter((value): value is string => !!value)
      .join(" ");

    return `每天 · ${task.timeOfDay || "09:00"}${weekdays ? ` · ${weekdays}` : ""}`;
  }

  function openSchedulePanel(): void {
    schedulePanelVisible.value = true;
    scheduleError.value = "";
    resetScheduleForm();
    void refreshScheduleTasks();
  }

  function closeSchedulePanel(): void {
    schedulePanelVisible.value = false;
  }

  async function refreshScheduleTasks(): Promise<void> {
    scheduleLoading.value = true;
    scheduleError.value = "";

    try {
      scheduleTasks.value = await daxiaAPI.listSchedules(currentChatId.value);

      if (
        expandedScheduleTaskId.value !== null &&
        !scheduleTasks.value.some(
          (task) => task.id === expandedScheduleTaskId.value,
        )
      ) {
        expandedScheduleTaskId.value = null;
      }

      if (expandedScheduleTaskId.value !== null) {
        await loadScheduleRuns(expandedScheduleTaskId.value);
      }
    } catch (error) {
      scheduleError.value =
        error instanceof Error ? error.message : "获取定时任务失败";
    } finally {
      scheduleLoading.value = false;
    }
  }

  async function handleCreateSchedule(): Promise<void> {
    if (!scheduleCanSubmit.value) {
      scheduleError.value = "请先填写完整的任务信息";
      return;
    }

    scheduleSaving.value = true;
    scheduleError.value = "";

    try {
      const payload: CreateSchedulePayload = {
        conversationId: currentChatId.value,
        name: scheduleForm.value.name.trim(),
        workspace: scheduleForm.value.workspace.trim() || undefined,
        prompt: scheduleForm.value.prompt.trim(),
        modelProvider: scheduleForm.value.modelProvider,
        modelName:
          scheduleForm.value.modelProvider === "auto"
            ? undefined
            : scheduleForm.value.modelName.trim() || undefined,
        frequencyType: scheduleForm.value.frequencyType,
        startDate: scheduleForm.value.startDate || undefined,
      };

      if (scheduleForm.value.frequencyType === "interval") {
        payload.intervalMinutes = Math.max(
          1,
          Math.floor(Number(scheduleForm.value.intervalMinutes || 1)),
        );
      } else if (scheduleForm.value.frequencyType === "daily") {
        payload.timeOfDay = scheduleForm.value.timeOfDay;
        payload.weekdays = scheduleForm.value.weekdays;
      } else {
        payload.runAt = scheduleForm.value.runAt;
      }

      const response = await daxiaAPI.createSchedule(payload);

      if (!response.success) {
        scheduleError.value = response.message || "创建定时任务失败";
        return;
      }

      resetScheduleForm();
      await refreshScheduleTasks();
    } catch (error) {
      scheduleError.value =
        error instanceof Error ? error.message : "创建定时任务失败";
    } finally {
      scheduleSaving.value = false;
    }
  }

  async function handleToggleSchedule(
    taskId: number,
    enabled: boolean,
  ): Promise<void> {
    scheduleSaving.value = true;
    scheduleError.value = "";

    try {
      const response = await daxiaAPI.updateScheduleEnabled(taskId, enabled);
      if (!response.success) {
        scheduleError.value = response.message || "更新任务状态失败";
        return;
      }
      await refreshScheduleTasks();
    } catch (error) {
      scheduleError.value =
        error instanceof Error ? error.message : "更新任务状态失败";
    } finally {
      scheduleSaving.value = false;
    }
  }

  function appendScheduleRunDialogLog(
    type: ScheduleRunLogType,
    content: string,
  ): void {
    scheduleRunDialogLogs.value.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      type,
      content,
      createdAt: new Date().toISOString(),
    });
  }

  function closeScheduleRunDialog(): void {
    scheduleRunDialogVisible.value = false;
  }

  function openScheduleRunDialog(task: ScheduledTask): void {
    scheduleRunDialogTaskId.value = task.id;
    scheduleRunDialogTaskName.value = task.name;
    scheduleRunDialogLogs.value = [];
    scheduleRunDialogVisible.value = true;
    void runScheduleNowFromDialog();
  }

  function parseScheduleRunOutput(response: CommandResponse): string {
    if (typeof response.data === "object" && response.data !== null) {
      const output = (response.data as { output?: unknown }).output;
      if (typeof output === "string" && output.trim()) {
        return output;
      }
    }

    return response.message || "执行完成";
  }

  async function runScheduleNowFromDialog(): Promise<void> {
    const taskId = scheduleRunDialogTaskId.value;
    if (taskId === null) return;

    scheduleRunDialogLoading.value = true;
    appendScheduleRunDialogLog(
      "info",
      "已收到立即执行请求，正在准备执行任务...",
    );

    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, RUN_NOW_DELAY_MS);
      });

      appendScheduleRunDialogLog("info", "开始执行任务...");

      const response = await daxiaAPI.runScheduleNow(taskId);
      if (!response.success) {
        const message = response.message || "立即执行失败";
        appendScheduleRunDialogLog("error", message);
        scheduleError.value = message;
        return;
      }

      const output = parseScheduleRunOutput(response);
      appendScheduleRunDialogLog("success", output);

      await refreshScheduleTasks();
      await loadScheduleRuns(taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "立即执行失败";
      appendScheduleRunDialogLog("error", message);
      scheduleError.value = message;
    } finally {
      scheduleRunDialogLoading.value = false;
    }
  }

  async function handleDeleteSchedule(taskId: number): Promise<void> {
    if (!window.confirm("确认删除该定时任务吗？")) return;

    scheduleSaving.value = true;
    scheduleError.value = "";

    try {
      const response = await daxiaAPI.deleteSchedule(taskId);
      if (!response.success) {
        scheduleError.value = response.message || "删除定时任务失败";
        return;
      }

      if (expandedScheduleTaskId.value === taskId) {
        expandedScheduleTaskId.value = null;
      }

      delete scheduleRunsByTask.value[taskId];
      delete scheduleRunsLoading.value[taskId];

      await refreshScheduleTasks();
    } catch (error) {
      scheduleError.value =
        error instanceof Error ? error.message : "删除定时任务失败";
    } finally {
      scheduleSaving.value = false;
    }
  }

  async function loadScheduleRuns(taskId: number): Promise<void> {
    scheduleRunsLoading.value[taskId] = true;

    try {
      const runs = await daxiaAPI.listScheduleRuns(taskId, 20);
      scheduleRunsByTask.value[taskId] = runs;
    } catch (error) {
      scheduleError.value =
        error instanceof Error ? error.message : "获取执行历史失败";
    } finally {
      scheduleRunsLoading.value[taskId] = false;
    }
  }

  function toggleScheduleRuns(taskId: number): void {
    if (expandedScheduleTaskId.value === taskId) {
      expandedScheduleTaskId.value = null;
      return;
    }

    expandedScheduleTaskId.value = taskId;

    if (!scheduleRunsByTask.value[taskId]) {
      void loadScheduleRuns(taskId);
    }
  }

  return {
    scheduleWeekdayOptions,
    schedulePanelVisible,
    scheduleLoading,
    scheduleSaving,
    scheduleError,
    scheduleTasks,
    scheduleForm,
    expandedScheduleTaskId,
    scheduleRunsByTask,
    scheduleRunsLoading,
    scheduleRunDialogVisible,
    scheduleRunDialogTaskId,
    scheduleRunDialogTaskName,
    scheduleRunDialogLoading,
    scheduleRunDialogLogs,
    scheduleModelDisplay,
    scheduleCanSubmit,
    resetScheduleForm,
    toggleScheduleWeekday,
    taskScheduleText,
    openSchedulePanel,
    closeSchedulePanel,
    refreshScheduleTasks,
    handleCreateSchedule,
    handleToggleSchedule,
    openScheduleRunDialog,
    runScheduleNowFromDialog,
    closeScheduleRunDialog,
    handleDeleteSchedule,
    toggleScheduleRuns,
  };
}
