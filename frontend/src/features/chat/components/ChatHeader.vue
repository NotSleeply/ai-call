<template>
  <header class="h-14 border-b flex items-center px-6 bg-white">
    <h1 class="font-medium text-gray-800">{{ title }}</h1>
    <div class="ml-auto flex items-center gap-2">
      <button @click="onOpenSchedulePanel"
        class="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
        定时任务
      </button>
      <button @click="onOpenSkillPanel"
        class="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
        Skill 管理
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

const props = defineProps<{
  title: string
  onOpenSchedulePanel: () => void
  onOpenSkillPanel: () => void
}>()

const {
  title,
  onOpenSchedulePanel,
  onOpenSkillPanel,
} = toRefs(props)
</script>
