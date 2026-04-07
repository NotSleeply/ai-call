<template>
  <div v-if="visible" class="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
    <div class="w-full max-w-5xl h-[88vh] rounded-3xl bg-[#ececef] shadow-2xl overflow-hidden flex flex-col">
      <div class="px-6 py-4 border-b border-slate-300 flex items-center gap-2">
        <h3 class="font-semibold text-slate-800">自动化任务</h3>
        <button @click="onRefresh" :disabled="loading"
          class="ml-auto px-3 py-1.5 text-sm rounded-full border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </button>
        <button @click="onClose"
          class="px-3 py-1.5 text-sm rounded-full border border-slate-300 bg-white hover:bg-slate-100">
          关闭
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div v-if="error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {{ error }}
        </div>

        <section class="rounded-2xl bg-[#d4d4d8] p-5">
          <h4 class="text-2xl font-semibold text-slate-800">添加自动化任务</h4>

          <div class="mt-4 space-y-3">
            <div>
              <label class="text-sm text-slate-700">名称</label>
              <input v-model="form.name" type="text" placeholder="例如：每日 AI 新闻总结"
                class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>

            <div>
              <label class="text-sm text-slate-700">工作空间（可选）</label>
              <input v-model="form.workspace" type="text" placeholder="例如：产品组日报"
                class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>

            <div>
              <label class="text-sm text-slate-700">提示词</label>
              <textarea v-model="form.prompt" rows="4" placeholder="例如：请总结今天 AI 行业 5 条重点新闻，并给出简短点评。"
                class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="text-sm text-slate-700">模型提供方</label>
                <select v-model="form.modelProvider"
                  class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="auto">Auto</option>
                  <option value="api">API</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="text-sm text-slate-700">模型名（Auto 可留空）</label>
                <input v-model="form.modelName" type="text" placeholder="例如：gpt-5-mini"
                  :disabled="form.modelProvider === 'auto'"
                  class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-60" />
              </div>
            </div>

            <div class="text-xs text-slate-600">当前选择：{{ modelDisplay }}</div>

            <div>
              <label class="text-sm text-slate-700">执行频率</label>
              <div class="mt-2 flex flex-wrap gap-2">
                <button @click="form.frequencyType = 'daily'" type="button" :class="[
                  'px-4 py-1.5 rounded-full text-sm border transition-colors',
                  form.frequencyType === 'daily'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white/70 border-white/70 text-slate-700 hover:bg-white',
                ]">
                  每天
                </button>
                <button @click="form.frequencyType = 'interval'" type="button" :class="[
                  'px-4 py-1.5 rounded-full text-sm border transition-colors',
                  form.frequencyType === 'interval'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white/70 border-white/70 text-slate-700 hover:bg-white',
                ]">
                  按间隔
                </button>
                <button @click="form.frequencyType = 'once'" type="button" :class="[
                  'px-4 py-1.5 rounded-full text-sm border transition-colors',
                  form.frequencyType === 'once'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white/70 border-white/70 text-slate-700 hover:bg-white',
                ]">
                  单次
                </button>
              </div>
            </div>

            <div v-if="form.frequencyType === 'daily'" class="space-y-2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="text-sm text-slate-700">执行时间</label>
                  <input v-model="form.timeOfDay" type="time"
                    class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
                <div>
                  <label class="text-sm text-slate-700">生效起始日期（可选）</label>
                  <input v-model="form.startDate" type="date"
                    class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button v-for="weekday in weekdayOptions" :key="weekday.value" @click="onToggleWeekday(weekday.value)"
                  type="button" :class="[
                    'px-3 py-1 rounded-full text-sm border transition-colors',
                    form.weekdays.includes(weekday.value)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white/70 text-slate-700 border-white/70 hover:bg-white',
                  ]">
                  {{ weekday.label }}
                </button>
              </div>
            </div>

            <div v-else-if="form.frequencyType === 'interval'" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-slate-700">执行间隔（分钟）</label>
                <input v-model.number="form.intervalMinutes" type="number" min="1"
                  class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-slate-700">执行时间</label>
                <input v-model="form.runAt" type="datetime-local"
                  class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button @click="onReset" type="button"
                class="px-5 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700">
                取消
              </button>
              <button @click="onCreate" :disabled="saving || !canSubmit"
                class="px-5 py-2 rounded-full bg-black text-white hover:bg-slate-900 disabled:opacity-50">
                {{ saving ? '添加中...' : '添加' }}
              </button>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-4">
          <div class="flex items-center">
            <h4 class="font-medium text-slate-800">任务列表</h4>
          </div>

          <div class="mt-3 space-y-2">
            <div v-if="!loading && tasks.length === 0" class="text-sm text-slate-500 px-2 py-3">
              暂无自动化任务，先创建一个吧。
            </div>

            <div v-for="task in tasks" :key="task.id" class="rounded-xl border border-slate-200 px-3 py-3 bg-slate-50">
              <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-slate-800 truncate">#{{ task.id }} · {{ task.name }}</div>
                  <div class="text-xs text-slate-500 mt-1">{{ taskScheduleText(task) }}</div>
                  <div class="text-xs text-slate-500 mt-1">
                    模型: {{ task.modelProvider === 'auto' ? 'Auto' : `${task.modelProvider}${task.modelName ?
                      `:${task.modelName}` : ''}` }}
                    <span v-if="task.workspace"> · 工作空间: {{ task.workspace }}</span>
                  </div>
                  <div class="text-sm text-slate-700 mt-2 whitespace-pre-wrap break-all">{{ task.command }}</div>
                  <div class="text-xs text-slate-500 mt-1">
                    状态: {{ task.enabled ? '启用' : '停用' }} · 上次执行: {{ task.lastRunAt ? formatTime(task.lastRunAt) : '未执行'
                    }}
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 flex-wrap">
                  <button @click="onRunNow(task)" :disabled="saving"
                    class="px-3 py-1.5 text-sm rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    立即执行
                  </button>
                  <button @click="onToggleEnabled(task.id, !task.enabled)" :disabled="saving"
                    class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50">
                    {{ task.enabled ? '停用' : '启用' }}
                  </button>
                  <button @click="onToggleRuns(task.id)" :disabled="saving"
                    class="px-3 py-1.5 text-sm rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                    {{ expandedTaskId === task.id ? '收起历史' : '执行历史' }}
                  </button>
                  <button @click="onDelete(task.id)" :disabled="saving"
                    class="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                    删除
                  </button>
                </div>
              </div>

              <div v-if="expandedTaskId === task.id" class="mt-3 rounded-lg bg-white border border-slate-200 p-3">
                <div class="text-xs text-slate-500 mb-2">最近执行记录</div>

                <div v-if="runsLoading[task.id]" class="text-sm text-slate-500">加载中...</div>

                <div v-else-if="!(runsByTask[task.id]?.length)" class="text-sm text-slate-500">
                  暂无执行记录。
                </div>

                <div v-else class="space-y-2 max-h-56 overflow-y-auto">
                  <div v-for="run in runsByTask[task.id]" :key="run.id"
                    class="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <div class="text-xs text-slate-500">
                      {{ formatTime(run.executedAt) }} · {{ run.success ? '成功' : '失败' }}
                    </div>
                    <div class="mt-1 text-xs text-slate-700 whitespace-pre-wrap">{{ run.output }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from "vue";
import type { ScheduledTask, ScheduledTaskRun } from "../../../api/daxia";
import type { ModelProvider, ScheduleFrequencyType } from "../../../api/daxia";

interface ScheduleFormView {
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

const props = defineProps<{
  visible: boolean;
  loading: boolean;
  saving: boolean;
  error: string;
  tasks: ScheduledTask[];
  form: ScheduleFormView;
  weekdayOptions: Array<{ value: number; label: string }>;
  modelDisplay: string;
  canSubmit: boolean;
  expandedTaskId: number | null;
  runsByTask: Record<number, ScheduledTaskRun[]>;
  runsLoading: Record<number, boolean>;
  formatTime: (value: string) => string;
  taskScheduleText: (task: ScheduledTask) => string;
  onClose: () => void;
  onRefresh: () => void;
  onReset: () => void;
  onCreate: () => void;
  onToggleWeekday: (day: number) => void;
  onRunNow: (task: ScheduledTask) => void;
  onToggleEnabled: (taskId: number, enabled: boolean) => void;
  onToggleRuns: (taskId: number) => void;
  onDelete: (taskId: number) => void;
}>();

const {
  visible,
  loading,
  saving,
  error,
  tasks,
  form,
  weekdayOptions,
  modelDisplay,
  canSubmit,
  expandedTaskId,
  runsByTask,
  runsLoading,
  formatTime,
  taskScheduleText,
  onClose,
  onRefresh,
  onReset,
  onCreate,
  onToggleWeekday,
  onRunNow,
  onToggleEnabled,
  onToggleRuns,
  onDelete,
} = toRefs(props);
</script>
