<template>
  <div class="h-screen flex bg-gray-100">
    <ChatSidebar :chat-list="chatList" :current-chat-id="currentChatId" :is-connected="isConnected"
      :format-time="formatTime" :on-create-new-chat="createNewChat" :on-select-chat="selectChat"
      :on-delete-chat="deleteChat" />

    <!-- 右侧聊天主内容 -->
    <main class="flex-1 flex flex-col bg-white">
      <ChatHeader :title="currentChat?.title || '大虾助手'" :on-open-schedule-panel="openSchedulePanel"
        :on-open-skill-panel="openPanel" />

      <!-- 消息列表 -->
      <ChatMessageList :messages="messages" :loading="loading" :loading-text="loadingText" :loading-phase="loadingPhase"
        :quick-commands="quickCommands" :on-send-quick-command="sendQuickCommand" :render-markdown="renderMarkdown"
        :on-message-list-ref="setMessageListElement" />

      <!-- 输入区域 -->
      <ChatComposer :loading="loading" :input-text="inputText" :input-placeholder="inputPlaceholder"
        :chat-selected-skill="chatSelectedSkill" :selected-craft-label="selectedCraftLabel"
        :craft-menu-open="craftMenuOpen" :model-menu-open="modelMenuOpen" :skill-menu-open="skillMenuOpen"
        :selected-model-display="selectedModelDisplay" :common-models="commonModels" :custom-models="customModels"
        :custom-model-provider="customModelProvider" :custom-model-name="customModelName"
        :skill-search-keyword="skillSearchKeyword" :filtered-chat-skills="filteredChatSkills"
        :on-toolbar-ref="setToolbarMenuElement" :on-clear-chat-selected-skill="clearChatSelectedSkill"
        :on-input-text-change="setInputText" :on-send-message="sendMessage" :on-toggle-craft-menu="toggleCraftMenu"
        :on-choose-craft-mode="chooseCraftMode" :on-toggle-model-menu="toggleModelMenu"
        :on-choose-auto-model="chooseAutoModel" :on-choose-model-option="chooseModelOption"
        :on-custom-model-provider-change="setCustomModelProvider" :on-custom-model-name-change="setCustomModelName"
        :on-add-custom-model="addCustomModel" :on-toggle-skill-menu="toggleSkillMenu"
        :on-skill-search-keyword-change="setSkillSearchKeyword" :on-choose-chat-skill="chooseChatSkill" />
    </main>
    <SkillPanel :visible="skillPanelVisible" :loading="skillLoading" :saving="skillSaving" :running="skillRunning"
      :error="skillError" :skills="skills" :selected-skill-id="selectedSkillId" :selected-skill="selectedSkill"
      :create-form="createForm" :edit-form="editForm" :task-input="taskInput" :run-output="runOutput"
      :on-select-skill="selectSkill" :on-refresh-skills="refreshSkills" :on-close-panel="closePanel"
      :on-create-skill="handleCreateSkill" :on-update-skill="handleUpdateSkill" :on-delete-skill="handleDeleteSkill"
      :on-run-skill="handleRunSkill" :on-task-input-change="setTaskInput" />

    <SchedulePanel :visible="schedulePanelVisible" :loading="scheduleLoading" :saving="scheduleSaving"
      :error="scheduleError" :tasks="scheduleTasks" :form="scheduleForm" :weekday-options="scheduleWeekdayOptions"
      :model-display="scheduleModelDisplay" :can-submit="scheduleCanSubmit" :expanded-task-id="expandedScheduleTaskId"
      :runs-by-task="scheduleRunsByTask" :runs-loading="scheduleRunsLoading" :format-time="formatTime"
      :task-schedule-text="taskScheduleText" :on-close="closeSchedulePanel" :on-refresh="refreshScheduleTasks"
      :on-reset="resetScheduleForm" :on-create="handleCreateSchedule" :on-toggle-weekday="toggleScheduleWeekday"
      :on-run-now="openScheduleRunDialog" :on-toggle-enabled="handleToggleSchedule" :on-toggle-runs="toggleScheduleRuns"
      :on-delete="handleDeleteSchedule" />

    <ScheduleRunDialog :visible="scheduleRunDialogVisible" :task-id="scheduleRunDialogTaskId"
      :task-name="scheduleRunDialogTaskName" :loading="scheduleRunDialogLoading" :logs="scheduleRunDialogLogs"
      :format-time="formatTime" :on-close="closeScheduleRunDialog" :on-run-now="runScheduleNowFromDialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  daxiaAPI,
  type CommandResponse,
  type Skill,
} from './api/daxia'
import { commandKeywords, quickCommands } from './features/chat/constants'
import { useSkillManager } from './features/skills/composables/useSkillManager'
import { useScheduleManager } from './features/schedules/composables/useScheduleManager'
import { renderMarkdown } from './features/chat/markdown'
import { useCommandExecution } from './features/chat/composables/useCommandExecution'
import { useConversationState } from './features/chat/composables/useConversationState'
import { useModelSelection, type SelectableModel } from './features/chat/composables/useModelSelection'
import { useToolbarMenus } from './features/chat/composables/useToolbarMenus'
import { useLoadingState } from './features/chat/composables/useLoadingState'
import ChatMessageList from './features/chat/components/ChatMessageList.vue'
import ChatComposer from './features/chat/components/ChatComposer.vue'
import ChatSidebar from './features/chat/components/ChatSidebar.vue'
import ChatHeader from './features/chat/components/ChatHeader.vue'
import SkillPanel from './features/skills/components/SkillPanel.vue'
import {
  formatTime,
  isLaunchCancel,
  isLaunchConfirm,
  wait,
} from './features/chat/utils'
import SchedulePanel from './features/schedules/components/SchedulePanel.vue'
import ScheduleRunDialog from './features/schedules/components/ScheduleRunDialog.vue'

const isConnected = ref(false)
const inputText = ref('')
const pendingLaunchUrl = ref<string | null>(null)
const toolbarMenuRef = ref<HTMLElement | null>(null)

const {
  selectedCraftMode,
  selectedCraftLabel,
  craftMenuOpen,
  modelMenuOpen,
  skillMenuOpen,
  skillSearchKeyword,
  toggleCraftMenu,
  chooseCraftMode,
  toggleModelMenu,
  closeModelMenu,
  toggleSkillMenu,
  closeSkillMenu,
  handleClickOutsideMenus,
} = useToolbarMenus(toolbarMenuRef)

const {
  selectedModelProvider,
  selectedModelName,
  commonModels,
  customModelProvider,
  customModelName,
  customModels,
  selectedModelDisplay,
  chooseAutoModel: chooseAutoModelCore,
  chooseModelOption: chooseModelOptionCore,
  loadCustomModels,
  addCustomModel: addCustomModelCore,
} = useModelSelection()

const chatSelectedSkillId = ref('')
const skillManager = useSkillManager()
const {
  visible: skillPanelVisible,
  loading: skillLoading,
  saving: skillSaving,
  running: skillRunning,
  error: skillError,
  skills,
  selectedSkill,
  selectedSkillId,
  createForm,
  editForm,
  taskInput,
  runOutput,
  openPanel,
  closePanel,
  refreshSkills,
  selectSkill,
  createSkill,
  updateSelectedSkill,
  deleteSelectedSkill,
  runSelectedSkill,
} = skillManager

const chatSelectedSkill = computed<Skill | null>(() =>
  skills.value.find((skill) => skill.id === chatSelectedSkillId.value) || null,
)

const filteredChatSkills = computed(() => {
  const keyword = skillSearchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return skills.value
  }

  return skills.value.filter((skill) =>
    `${skill.name} ${skill.description}`.toLowerCase().includes(keyword),
  )
})

const inputPlaceholder = computed(() => {
  if (chatSelectedSkill.value) {
    return `已选择 ${chatSelectedSkill.value.name}，输入要执行的任务...`
  }
  if (selectedCraftMode.value === 'plan') {
    return 'Plan 模式：输入需求，我会先规划再回答...'
  }
  if (selectedCraftMode.value === 'agent') {
    return 'Agent 模式：输入任务，将以多 Agent 协同执行...'
  }
  return '输入命令或消息...'
})

const {
  loading,
  loadingText,
  loadingPhase,
  startLoadingState,
  stopLoadingState,
} = useLoadingState()

const {
  chatList,
  messages,
  currentChatId,
  currentChat,
  messageListRef,
  scrollToBottom,
  loadChatList,
  loadMessages,
  createNewChat,
  selectChat,
  deleteChat,
  appendLocalMessage,
} = useConversationState()

const { executeCommand, handleChat } = useCommandExecution(
  currentChatId,
  { startLoadingState, stopLoadingState },
  { scrollToBottom },
)

const {
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
} = useScheduleManager(
  currentChatId,
  selectedModelProvider,
  selectedModelName,
  commonModels,
  customModels,
)

watch(currentChatId, () => {
  void loadMessages()
})

async function sendMessage(): Promise<void> {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  // 二段式确认启动：先生成，再由用户输入“启动”后另开新页
  if (pendingLaunchUrl.value && isLaunchConfirm(text)) {
    inputText.value = ''
    appendLocalMessage('user', text)

    const launchUrl = pendingLaunchUrl.value
    pendingLaunchUrl.value = null

    startLoadingState('正在分析启动请求...')
    const startTime = Date.now()
    const minAnalyzeDuration = 1800 + Math.random() * 1200

    try {
      const elapsed = Date.now() - startTime
      if (elapsed < minAnalyzeDuration) {
        await wait(minAnalyzeDuration - elapsed)
      }
    } finally {
      stopLoadingState()
      scrollToBottom()
    }

    appendLocalMessage('assistant', '🚀 已启动成功，正在为你打开 2048...')

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const newTab = window.open(launchUrl, '_blank')
        if (newTab) {
          newTab.focus()
        }
        resolve()
      }, 3000)
    })
    return
  }

  if (pendingLaunchUrl.value && isLaunchCancel(text)) {
    inputText.value = ''
    appendLocalMessage('user', text)
    appendLocalMessage('assistant', '👌 已取消启动 2048。')
    pendingLaunchUrl.value = null
    return
  }

  let outgoingText = text
  const firstToken = text.split(' ')[0]
  const isRawCommand = commandKeywords.has(firstToken)

  if (!isRawCommand) {
    if (selectedCraftMode.value === 'plan') {
      outgoingText = `请先给出可执行计划（Plan），再回答以下任务：${text}`
    } else if (selectedCraftMode.value === 'agent') {
      outgoingText = `agents ${text}`
    }
  }

  inputText.value = ''
  const isCommand = commandKeywords.has(outgoingText.split(' ')[0])
  const commandOptions = {
    modelProvider: selectedModelProvider.value,
    modelName:
      selectedModelProvider.value === 'auto'
        ? undefined
        : selectedModelName.value || undefined,
    skillId: chatSelectedSkill.value?.id,
  }

  let response: CommandResponse | null = null

  if (isCommand) {
    response = await executeCommand(outgoingText, commandOptions)
  } else {
    response = await handleChat(outgoingText, commandOptions)
  }

  if (response?.success) {
    isConnected.value = true
  }

  await loadMessages()
  await loadChatList()

  if (response?.success && response.openUrl) {
    pendingLaunchUrl.value = response.openUrl
  }
}

async function sendQuickCommand(command: string): Promise<void> {
  inputText.value = command
  await sendMessage()
}

function clearChatSelectedSkill(): void {
  chatSelectedSkillId.value = ''
}

function chooseAutoModel(): void {
  chooseAutoModelCore()
  closeModelMenu()
}

function chooseModelOption(model: SelectableModel): void {
  chooseModelOptionCore(model)
  closeModelMenu()
}

function addCustomModel(): void {
  const added = addCustomModelCore()
  if (added) {
    closeModelMenu()
  }
}

function setCustomModelProvider(provider: SelectableModel['provider']): void {
  customModelProvider.value = provider
}

function setCustomModelName(value: string): void {
  customModelName.value = value
}

function setSkillSearchKeyword(value: string): void {
  skillSearchKeyword.value = value
}

function chooseChatSkill(skillId: string): void {
  chatSelectedSkillId.value = skillId
  closeSkillMenu()
}

function setInputText(value: string): void {
  inputText.value = value
}

function setToolbarMenuElement(element: Element | null): void {
  toolbarMenuRef.value = element instanceof HTMLElement ? element : null
}

function setMessageListElement(element: Element | null): void {
  messageListRef.value = element instanceof HTMLElement ? element : null
}

function setTaskInput(value: string): void {
  taskInput.value = value
}

async function handleCreateSkill(): Promise<void> {
  if (!createForm.value.name.trim()) return
  if (createForm.value.mode === 'prompt' && !createForm.value.prompt.trim()) return
  if (createForm.value.mode === 'module' && !createForm.value.moduleEntry.trim()) return
  await createSkill()
}

async function handleUpdateSkill(): Promise<void> {
  if (!selectedSkill.value) return
  if (!editForm.value.name.trim()) return
  if (editForm.value.mode === 'prompt' && !editForm.value.prompt.trim()) return
  if (editForm.value.mode === 'module' && !editForm.value.moduleEntry.trim()) return
  await updateSelectedSkill()
}

async function handleDeleteSkill(): Promise<void> {
  if (!selectedSkill.value) return
  if (selectedSkill.value.is_default) return
  if (!window.confirm('确认删除该 Skill 吗？')) return
  await deleteSelectedSkill()
}

async function handleRunSkill(): Promise<void> {
  if (!selectedSkill.value) return
  if (!taskInput.value.trim()) return
  await runSelectedSkill()
}

onMounted(async () => {
  window.addEventListener('click', handleClickOutsideMenus)
  loadCustomModels()
  isConnected.value = await daxiaAPI.healthCheck()
  await refreshSkills()
  await loadChatList()
  await loadMessages()

  if (messageListRef.value) {
    scrollToBottom()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutsideMenus)
})
</script>
