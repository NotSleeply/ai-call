<template>
  <footer class="border-t p-4 bg-white">
    <div class="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 shadow-sm">
      <div class="flex gap-3 items-end">
        <div class="flex-1 min-w-0">
          <div v-if="chatSelectedSkill"
            class="inline-flex items-center gap-2 mb-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">
            <span>🧩 {{ chatSelectedSkill.name }}</span>
            <button @click="onClearChatSelectedSkill" class="text-indigo-500 hover:text-indigo-700">✕</button>
          </div>
          <input :value="inputText" @input="onInputTextChange(($event.target as HTMLInputElement).value)"
            @keydown.enter="onSendMessage" type="text" :placeholder="inputPlaceholder"
            class="w-full py-1.5 px-1 bg-transparent focus:outline-none" :disabled="loading" />
        </div>

        <button @click="onSendMessage" :disabled="loading || !inputText.trim()"
          class="h-10 px-5 bg-slate-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          发送
        </button>
      </div>

      <div :ref="assignToolbarRef" class="mt-3">
        <ChatToolbarMenus :selected-craft-label="selectedCraftLabel" :craft-menu-open="craftMenuOpen"
          :model-menu-open="modelMenuOpen" :skill-menu-open="skillMenuOpen"
          :selected-model-display="selectedModelDisplay" :common-models="commonModels" :custom-models="customModels"
          :custom-model-provider="customModelProvider" :custom-model-name="customModelName"
          :skill-search-keyword="skillSearchKeyword" :filtered-chat-skills="filteredChatSkills"
          :on-toggle-craft-menu="onToggleCraftMenu" :on-choose-craft-mode="onChooseCraftMode"
          :on-toggle-model-menu="onToggleModelMenu" :on-choose-auto-model="onChooseAutoModel"
          :on-choose-model-option="onChooseModelOption" :on-custom-model-provider-change="onCustomModelProviderChange"
          :on-custom-model-name-change="onCustomModelNameChange" :on-add-custom-model="onAddCustomModel"
          :on-toggle-skill-menu="onToggleSkillMenu" :on-skill-search-keyword-change="onSkillSearchKeywordChange"
          :on-choose-chat-skill="onChooseChatSkill" />
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { toRefs, type ComponentPublicInstance } from 'vue'
import type { Skill } from '../../../api/daxia'
import ChatToolbarMenus from './ChatToolbarMenus.vue'
import type { SelectableModel } from '../composables/useModelSelection'
import type { CraftMode } from '../composables/useToolbarMenus'

const props = defineProps<{
  loading: boolean
  inputText: string
  inputPlaceholder: string
  chatSelectedSkill: Skill | null
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
  onToolbarRef: (el: Element | null) => void
  onClearChatSelectedSkill: () => void
  onInputTextChange: (value: string) => void
  onSendMessage: () => void
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

function assignToolbarRef(element: Element | ComponentPublicInstance | null): void {
  props.onToolbarRef(element instanceof Element ? element : null)
}

const {
  loading,
  inputText,
  inputPlaceholder,
  chatSelectedSkill,
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
  onClearChatSelectedSkill,
  onInputTextChange,
  onSendMessage,
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
