<template>
  <div class="flex items-center justify-between text-sm relative">
    <div class="flex items-center gap-1.5">
      <div class="relative">
        <button @click="onToggleCraftMenu"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-100">
          <span>📁</span>
          <span>Craft · {{ selectedCraftLabel }}</span>
          <span>▾</span>
        </button>

        <div v-if="craftMenuOpen"
          class="absolute left-0 bottom-[calc(100%+8px)] w-40 rounded-xl border border-slate-200 bg-white shadow-xl p-1 z-30">
          <button @click="onChooseCraftMode('plan')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
            Plan
          </button>
          <button @click="onChooseCraftMode('ask')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
            Ask
          </button>
          <button @click="onChooseCraftMode('agent')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
            Agent
          </button>
        </div>
      </div>

      <div class="relative">
        <button @click="onToggleModelMenu"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-100">
          <span>⚙️</span>
          <span>{{ selectedModelDisplay }}</span>
          <span>▾</span>
        </button>

        <div v-if="modelMenuOpen"
          class="absolute left-0 bottom-[calc(100%+10px)] w-[360px] max-h-[420px] rounded-2xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.18)] z-30 flex flex-col overflow-hidden">
          <div class="px-3 py-2 border-b border-slate-100 text-xs text-slate-500">
            当前模型: <span class="text-slate-700">{{ selectedModelDisplay }}</span>
          </div>

          <div class="p-2 overflow-y-auto space-y-2 flex-1">
            <button @click="onChooseAutoModel"
              class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
              Auto（自动选择模型）
            </button>

            <div class="px-2.5 py-1 text-xs text-slate-500">常用模型</div>
            <button v-for="model in commonModels" :key="`preset-${model.provider}-${model.modelName}`"
              @click="onChooseModelOption(model)"
              class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
              {{ model.label }}
            </button>

            <div v-if="customModels.length > 0">
              <div class="px-2.5 py-1 text-xs text-slate-500">自定义模型</div>
              <button v-for="model in customModels" :key="`custom-${model.provider}-${model.modelName}`"
                @click="onChooseModelOption(model)"
                class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
                {{ model.label }}
              </button>
            </div>
          </div>

          <div class="border-t border-slate-100 p-2.5 space-y-2">
            <div class="text-xs text-slate-500">添加其他模型</div>
            <div class="flex gap-2">
              <select :value="customModelProvider"
                @change="onCustomModelProviderChange(($event.target as HTMLSelectElement).value as SelectableModel['provider'])"
                class="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="api">API</option>
                <option value="deepseek">DeepSeek</option>
                <option value="ollama">Ollama</option>
              </select>
              <input :value="customModelName"
                @input="onCustomModelNameChange(($event.target as HTMLInputElement).value)" type="text"
                placeholder="模型名，如 gpt-5-mini"
                class="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button @click="onAddCustomModel"
              class="w-full rounded-lg bg-slate-900 text-white py-1.5 text-sm hover:bg-black disabled:opacity-50"
              :disabled="!customModelName.trim()">
              添加并使用
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="relative">
      <button @click="onToggleSkillMenu"
        class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-100">
        <span>🧩</span>
        <span>Skills</span>
        <span>▾</span>
      </button>

      <div v-if="skillMenuOpen"
        class="absolute right-0 bottom-[calc(100%+10px)] w-[320px] max-h-[360px] rounded-2xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.18)] z-30 flex flex-col overflow-hidden">
        <div class="px-3 py-2 border-b border-slate-100">
          <div class="relative">
            <span class="absolute left-2 top-1.5 text-slate-400">🔍</span>
            <input :value="skillSearchKeyword"
              @input="onSkillSearchKeywordChange(($event.target as HTMLInputElement).value)" type="text"
              placeholder="搜索技能"
              class="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div class="overflow-y-auto p-1.5 space-y-1 flex-1">
          <button @click="onChooseChatSkill('')"
            class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center gap-2">
            <span
              class="w-5 h-5 rounded-full bg-slate-100 text-slate-600 inline-flex items-center justify-center text-xs">-</span>
            <span>不使用 Skill</span>
          </button>

          <button v-for="skill in filteredChatSkills" :key="`picker-${skill.id}`" @click="onChooseChatSkill(skill.id)"
            class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 flex items-start gap-2">
            <span :class="[
              'w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] mt-0.5',
              skill.mode === 'module' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600',
            ]">
              {{ skill.mode === 'module' ? 'M' : 'P' }}
            </span>
            <span class="min-w-0 block">
              <span class="text-sm font-medium text-slate-800 truncate block">{{ skill.name }}</span>
              <span class="text-xs text-slate-500 truncate mt-0.5 block">{{ skill.description }}</span>
            </span>
          </button>

          <div v-if="filteredChatSkills.length === 0" class="px-2.5 py-3 text-xs text-slate-500">
            没找到匹配技能。
          </div>
        </div>

        <button class="border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
          📂 导入技能
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import type { Skill } from '../../../api/daxia'
import type { SelectableModel } from '../composables/useModelSelection'
import type { CraftMode } from '../composables/useToolbarMenus'

const props = defineProps<{
  selectedCraftLabel: string
  craftMenuOpen: boolean
  modelMenuOpen: boolean
  skillMenuOpen: boolean
  selectedModelDisplay: string
  commonModels: SelectableModel[]
  customModels: SelectableModel[]
  customModelProvider: SelectableModel['provider']
  customModelName: string
  skillSearchKeyword: string
  filteredChatSkills: Skill[]
  onToggleCraftMenu: () => void
  onChooseCraftMode: (mode: CraftMode) => void
  onToggleModelMenu: () => void
  onChooseAutoModel: () => void
  onChooseModelOption: (model: SelectableModel) => void
  onCustomModelProviderChange: (provider: SelectableModel['provider']) => void
  onCustomModelNameChange: (name: string) => void
  onAddCustomModel: () => void
  onToggleSkillMenu: () => void
  onSkillSearchKeywordChange: (keyword: string) => void
  onChooseChatSkill: (skillId: string) => void
}>()

const {
  selectedCraftLabel,
  craftMenuOpen,
  modelMenuOpen,
  skillMenuOpen,
  selectedModelDisplay,
  commonModels,
  customModels,
  customModelProvider,
  customModelName,
  skillSearchKeyword,
  filteredChatSkills,
  onToggleCraftMenu,
  onChooseCraftMode,
  onToggleModelMenu,
  onChooseAutoModel,
  onChooseModelOption,
  onCustomModelProviderChange,
  onCustomModelNameChange,
  onAddCustomModel,
  onToggleSkillMenu,
  onSkillSearchKeywordChange,
  onChooseChatSkill,
} = toRefs(props)
</script>
