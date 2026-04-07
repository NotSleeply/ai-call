<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
    <div class="w-full max-w-2xl max-h-[78vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
      <div class="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
        <h4 class="font-semibold text-slate-800">任务执行对话框 · {{ taskName || '定时任务' }}</h4>
        <div class="ml-auto flex items-center gap-2">
          <button @click="onRunNow" :disabled="loading || taskId === null"
            class="px-3 py-1.5 text-sm rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            {{ loading ? '执行中...' : '再次执行' }}
          </button>
          <button @click="onClose" class="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-slate-100">
            关闭
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 space-y-2">
        <div v-if="logs.length === 0" class="text-sm text-slate-500">
          暂无执行日志。
        </div>

        <div v-for="log in logs" :key="log.id" :class="[
          'rounded-lg border px-3 py-2 whitespace-pre-wrap text-sm',
          log.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : log.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-700',
        ]">
          <div class="text-xs opacity-70 mb-1">{{ formatTime(log.createdAt) }}</div>
          <div>{{ log.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from "vue";

interface ScheduleRunLogItem {
  id: number;
  type: "info" | "success" | "error";
  content: string;
  createdAt: string;
}

const props = defineProps<{
  visible: boolean;
  taskId: number | null;
  taskName: string;
  loading: boolean;
  logs: ScheduleRunLogItem[];
  formatTime: (value: string) => string;
  onClose: () => void;
  onRunNow: () => void;
}>();

const { visible, taskId, taskName, loading, logs, formatTime, onClose, onRunNow } = toRefs(props);
</script>
