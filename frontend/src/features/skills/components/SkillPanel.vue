<template>
  <div v-if="visible" class="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
    <div class="w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex">
      <aside class="w-72 border-r bg-slate-50 flex flex-col">
        <div class="px-4 py-3 border-b bg-white">
          <h2 class="font-semibold text-slate-800">Skills</h2>
          <p class="text-xs text-slate-500 mt-1">默认 Skill 已内置，可新建自定义 Skill</p>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <button v-for="skill in skills" :key="skill.id" @click="onSelectSkill(skill.id)" :class="[
            'w-full text-left px-3 py-2 rounded-lg transition-colors border',
            skill.id === selectedSkillId
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-transparent hover:bg-slate-100'
          ]">
            <div class="text-sm font-medium truncate">{{ skill.name }}</div>
            <div class="text-xs text-slate-500 truncate mt-1">{{ skill.description }}</div>
            <span v-if="skill.is_default"
              class="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              默认
            </span>
          </button>
          <div v-if="!loading && skills.length === 0" class="px-3 py-4 text-xs text-slate-500">
            暂无 Skill，请在右侧创建。
          </div>
        </div>

        <div class="p-3 border-t bg-white">
          <button @click="onRefreshSkills" :disabled="loading"
            class="w-full py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50">
            {{ loading ? '刷新中...' : '刷新列表' }}
          </button>
        </div>
      </aside>

      <section class="flex-1 flex flex-col">
        <div class="px-6 py-4 border-b flex items-center">
          <h3 class="font-semibold text-slate-800">Skill 工作台</h3>
          <button @click="onClosePanel"
            class="ml-auto px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-100">
            关闭
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div v-if="error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {{ error }}
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="rounded-xl border border-slate-200 p-4 bg-white">
              <h4 class="font-medium text-slate-800">新建 Skill</h4>
              <div class="mt-4 space-y-3">
                <select v-model="createForm.mode"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="prompt">Prompt Skill（模型执行）</option>
                  <option value="module">Module Skill（脚本执行）</option>
                </select>
                <input v-model="createForm.name" type="text" placeholder="Skill 名称"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input v-model="createForm.description" type="text" placeholder="Skill 描述"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea v-model="createForm.prompt" rows="6"
                  :placeholder="createForm.mode === 'prompt' ? 'System Prompt' : '模块说明（可选）'"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                <input v-if="createForm.mode === 'module'" v-model="createForm.moduleEntry" type="text"
                  placeholder="模块入口，例如：skills/my-skill.skill.js 或 .py"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea v-if="createForm.mode === 'module'" v-model="createForm.autoTriggersText" rows="3"
                  placeholder="自动触发词（每行一个），例如：备份仓库"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                <button @click="onCreateSkill" :disabled="saving"
                  class="w-full py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                  {{ saving ? '创建中...' : '创建 Skill' }}
                </button>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 p-4 bg-white">
              <h4 class="font-medium text-slate-800">编辑选中 Skill</h4>
              <div v-if="!selectedSkill" class="mt-4 text-sm text-slate-500">请先从左侧选择一个 Skill。</div>
              <div v-else class="mt-4 space-y-3">
                <select v-model="editForm.mode"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="prompt">Prompt Skill（模型执行）</option>
                  <option value="module">Module Skill（脚本执行）</option>
                </select>
                <input v-model="editForm.name" type="text"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input v-model="editForm.description" type="text"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea v-model="editForm.prompt" rows="6"
                  :placeholder="editForm.mode === 'prompt' ? 'System Prompt' : '模块说明（可选）'"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                <input v-if="editForm.mode === 'module'" v-model="editForm.moduleEntry" type="text"
                  placeholder="模块入口，例如：skills/my-skill.skill.js 或 .py"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea v-if="editForm.mode === 'module'" v-model="editForm.autoTriggersText" rows="3"
                  placeholder="自动触发词（每行一个）"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>

                <div class="flex gap-2">
                  <button @click="onUpdateSkill" :disabled="saving"
                    class="flex-1 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">
                    {{ saving ? '保存中...' : '保存修改' }}
                  </button>
                  <button @click="onDeleteSkill" :disabled="saving || selectedSkill.is_default"
                    class="flex-1 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                    删除 Skill
                  </button>
                </div>
                <p v-if="selectedSkill.is_default" class="text-xs text-slate-500">
                  默认 Skill 可编辑，但不允许删除。
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 p-4 bg-white">
            <h4 class="font-medium text-slate-800">运行 Skill 任务</h4>
            <div v-if="!selectedSkill" class="mt-4 text-sm text-slate-500">请先选择 Skill 后再运行。</div>
            <div v-else class="mt-4 space-y-3">
              <textarea :value="taskInput" @input="onTaskInputChange(($event.target as HTMLTextAreaElement).value)"
                rows="4" placeholder="输入要交给 Skill 的任务..."
                class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
              <button @click="onRunSkill" :disabled="running || !taskInput.trim()"
                class="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                {{ running ? '运行中...' : '运行并生成结果' }}
              </button>
              <div v-if="runOutput"
                class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
                {{ runOutput }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import type { Skill } from '../../../api/daxia'

interface SkillForm {
  name: string
  description: string
  prompt: string
  mode: 'prompt' | 'module'
  moduleEntry: string
  autoTriggersText: string
}

const props = defineProps<{
  visible: boolean
  loading: boolean
  saving: boolean
  running: boolean
  error: string
  skills: Skill[]
  selectedSkillId: string
  selectedSkill: Skill | null
  createForm: SkillForm
  editForm: SkillForm
  taskInput: string
  runOutput: string
  onSelectSkill: (id: string) => void
  onRefreshSkills: () => void
  onClosePanel: () => void
  onCreateSkill: () => void
  onUpdateSkill: () => void
  onDeleteSkill: () => void
  onRunSkill: () => void
  onTaskInputChange: (value: string) => void
}>()

const {
  visible,
  loading,
  saving,
  running,
  error,
  skills,
  selectedSkillId,
  selectedSkill,
  createForm,
  editForm,
  taskInput,
  runOutput,
  onSelectSkill,
  onRefreshSkills,
  onClosePanel,
  onCreateSkill,
  onUpdateSkill,
  onDeleteSkill,
  onRunSkill,
  onTaskInputChange,
} = toRefs(props)
</script>
