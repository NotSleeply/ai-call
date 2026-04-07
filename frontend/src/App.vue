<template>
  <div class="h-screen flex bg-gray-100">
    <!-- 左侧对话列表 -->
    <aside class="w-64 bg-gray-900 text-white flex flex-col">
      <!-- Logo -->
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center space-x-2">
          <span class="text-2xl">🦐</span>
          <span class="font-bold text-lg">大虾助手</span>
        </div>
      </div>

      <!-- 新建对话按钮 -->
      <div class="p-3">
        <button @click="createNewChat"
          class="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
          <span>➕</span>
          <span>新建对话</span>
        </button>
      </div>

      <!-- 对话列表 -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <div v-for="chat in chatList" :key="chat.id" @click="selectChat(chat.id)" :class="[
          'p-3 rounded-lg cursor-pointer transition-colors group',
          chat.id === currentChatId ? 'bg-gray-700' : 'hover:bg-gray-800'
        ]">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 flex-1 min-w-0">
              <span>💬</span>
              <span class="text-sm truncate">{{ chat.title }}</span>
            </div>
            <button @click.stop="deleteChat(chat.id)"
              class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity">
              🗑️
            </button>
          </div>
          <div class="text-xs text-gray-400 mt-1">{{ formatTime(chat.updated_at) }}</div>
        </div>
      </div>

      <!-- 底部状态 -->
      <div class="p-4 border-t border-gray-700">
        <div class="flex items-center space-x-2">
          <div :class="['w-2 h-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></div>
          <span class="text-xs text-gray-400">{{ isConnected ? '已连接' : '未连接' }}</span>
        </div>
      </div>
    </aside>

    <!-- 右侧聊天主内容 -->
    <main class="flex-1 flex flex-col bg-white">
      <!-- 顶部标题栏 -->
      <header class="h-14 border-b flex items-center px-6 bg-white">
        <h1 class="font-medium text-gray-800">{{ currentChat?.title || '大虾助手' }}</h1>
      </header>

      <!-- 消息列表 -->
      <div ref="messageListRef" class="flex-1 overflow-y-auto p-6 space-y-4">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
          <span class="text-6xl mb-4">🦐</span>
          <p class="text-lg">你好！我是大虾助手</p>
          <p class="text-sm mt-2">输入命令或直接对话，我可以帮你完成各种任务</p>
          <div class="mt-6 grid grid-cols-2 gap-3">
            <button v-for="cmd in quickCommands" :key="cmd.name" @click="sendQuickCommand(cmd.name)"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm transition-colors">
              {{ cmd.icon }} {{ cmd.label }}
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="msg in messages" :key="msg.id"
          :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div
            :class="['max-w-2xl rounded-lg p-4', msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800']">
            <div v-if="msg.role === 'assistant'" class="flex items-center space-x-2 mb-2">
              <span>🦐</span>
              <span class="font-medium">大虾</span>
            </div>
            <!-- 二维码图片 -->
            <img v-if="msg.qr_code" :src="msg.qr_code" alt="微信二维码" class="mb-4 rounded-lg" />
            <div v-if="msg.role === 'assistant'" class="assistant-markdown text-sm"
              v-html="renderMarkdown(msg.content)"></div>
            <pre v-else class="whitespace-pre-wrap text-sm font-sans">{{ msg.content }}</pre>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="flex justify-start">
          <div class="loading-bubble rounded-lg p-4 shadow-sm border border-slate-200">
            <div class="flex items-start space-x-3 text-gray-600">
              <div class="loading-ring mt-0.5"></div>
              <div class="min-w-[240px]">
                <div class="text-sm font-medium text-slate-700">{{ loadingText }}</div>
                <div class="text-xs text-slate-500 mt-1">{{ loadingPhase }}</div>
                <div class="loading-dots mt-2" aria-hidden="true">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <footer class="border-t p-4 bg-white">
        <div class="flex space-x-4">
          <input v-model="inputText" @keydown.enter="sendMessage" type="text" placeholder="输入命令或消息..."
            class="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="loading" />
          <button @click="sendMessage" :disabled="loading || !inputText.trim()"
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            发送
          </button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { daxiaAPI, type CommandResponse } from './api/daxia'
import { commandKeywords, quickCommands } from './features/chat/constants'
import { renderMarkdown } from './features/chat/markdown'
import { useCommandExecution } from './features/chat/composables/useCommandExecution'
import { useConversationState } from './features/chat/composables/useConversationState'
import { useLoadingState } from './features/chat/composables/useLoadingState'
import {
  formatTime,
  isLaunchCancel,
  isLaunchConfirm,
  wait,
} from './features/chat/utils'

const isConnected = ref(false)
const inputText = ref('')
const pendingLaunchUrl = ref<string | null>(null)

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

  inputText.value = ''
  const firstToken = text.split(' ')[0]
  const isCommand = commandKeywords.has(firstToken)

  let response: CommandResponse | null = null

  if (isCommand) {
    response = await executeCommand(text)
  } else {
    response = await handleChat(text)
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

onMounted(async () => {
  isConnected.value = await daxiaAPI.healthCheck()
  await loadChatList()
  await loadMessages()

  if (messageListRef.value) {
    scrollToBottom()
  }
})
</script>

<style scoped>
.loading-bubble {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}

.loading-bubble::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.5) 45%, transparent 70%);
  transform: translateX(-120%);
  animation: bubble-sheen 2.2s ease-in-out infinite;
}

.loading-ring {
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  animation: ring-spin 0.9s linear infinite;
}

.loading-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #2563eb;
  animation: dot-bounce 1.1s infinite ease-in-out;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes ring-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dot-bounce {

  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

@keyframes bubble-sheen {
  100% {
    transform: translateX(120%);
  }
}

.assistant-markdown :deep(p) {
  margin: 0.45rem 0;
  line-height: 1.6;
}

.assistant-markdown :deep(ul),
.assistant-markdown :deep(ol) {
  margin: 0.4rem 0 0.4rem 1.2rem;
}

.assistant-markdown :deep(li) {
  margin: 0.2rem 0;
}

.assistant-markdown :deep(code) {
  background: rgba(30, 41, 59, 0.08);
  border-radius: 6px;
  padding: 0.1rem 0.35rem;
  font-family: 'Consolas', 'SFMono-Regular', ui-monospace, monospace;
}

.assistant-markdown :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  overflow-x: auto;
  margin: 0.6rem 0;
}

.assistant-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
}

.assistant-markdown :deep(blockquote) {
  margin: 0.6rem 0;
  border-left: 3px solid #94a3b8;
  padding-left: 0.75rem;
  color: #475569;
}

.assistant-markdown :deep(a) {
  color: #1d4ed8;
  text-decoration: underline;
}
</style>
