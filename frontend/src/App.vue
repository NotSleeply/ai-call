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
        <button
          @click="createNewChat"
          class="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <span>➕</span>
          <span>新建对话</span>
        </button>
      </div>

      <!-- 对话列表 -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <div
          v-for="chat in chatList"
          :key="chat.id"
          @click="selectChat(chat.id)"
          :class="[
            'p-3 rounded-lg cursor-pointer transition-colors',
            chat.id === currentChatId ? 'bg-gray-700' : 'hover:bg-gray-800'
          ]"
        >
          <div class="flex items-center space-x-2">
            <span>💬</span>
            <span class="text-sm truncate">{{ chat.title }}</span>
          </div>
          <div class="text-xs text-gray-400 mt-1">{{ chat.time }}</div>
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
            <button
              v-for="cmd in quickCommands"
              :key="cmd.name"
              @click="sendQuickCommand(cmd.name)"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm transition-colors"
            >
              {{ cmd.icon }} {{ cmd.label }}
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="(msg, index) in messages" :key="index" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div :class="['max-w-2xl rounded-lg p-4', msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800']">
            <div v-if="msg.role === 'assistant'" class="flex items-center space-x-2 mb-2">
              <span>🦐</span>
              <span class="font-medium">大虾</span>
            </div>
            <pre class="whitespace-pre-wrap text-sm font-sans">{{ msg.content }}</pre>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="flex justify-start">
          <div class="bg-gray-100 rounded-lg p-4">
            <div class="flex items-center space-x-2 text-gray-500">
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              </div>
              <span class="text-sm">{{ loadingText }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <footer class="border-t p-4 bg-white">
        <div class="flex space-x-4">
          <input
            v-model="inputText"
            @keydown.enter="sendMessage"
            type="text"
            placeholder="输入命令或消息..."
            class="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="loading"
          />
          <button
            @click="sendMessage"
            :disabled="loading || !inputText.trim()"
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { daxiaAPI } from './api/daxia'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Chat {
  id: number
  title: string
  time: string
  messages: Message[]
}

const isConnected = ref(false)
const loading = ref(false)
const loadingText = ref('')
const inputText = ref('')
const currentChatId = ref(1)
const messageListRef = ref<HTMLElement | null>(null)

const chatList = ref<Chat[]>([
  { id: 1, title: '新对话', time: '刚刚', messages: [] }
])

const currentChat = computed(() => chatList.value.find(c => c.id === currentChatId.value))
const messages = computed(() => currentChat.value?.messages || [])

const quickCommands = [
  { name: 'weather', label: '天气', icon: '🌤️' },
  { name: 'news', label: '新闻', icon: '📰' },
  { name: 'email', label: '邮件', icon: '📧' },
  { name: 'wx', label: '微信', icon: '💬' },
  { name: 'summary', label: '总结', icon: '📝' },
  { name: 'help', label: '帮助', icon: '❓' },
]

const commandConfig: Record<string, { loading: string }> = {
  weather: { loading: '正在获取天气信息...' },
  news: { loading: '正在获取新闻...' },
  email: { loading: '正在获取邮件...' },
  summary: { loading: '正在生成总结...' },
  wx: { loading: '正在连接微信...' },
  analyze: { loading: '正在分析项目...' },
  help: { loading: '获取帮助信息...' },
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function createNewChat() {
  const newId = Math.max(...chatList.value.map(c => c.id)) + 1
  chatList.value.unshift({
    id: newId,
    title: '新对话',
    time: '刚刚',
    messages: []
  })
  currentChatId.value = newId
}

function selectChat(id: number) {
  currentChatId.value = id
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  // 添加用户消息
  const chat = chatList.value.find(c => c.id === currentChatId.value)
  if (chat) {
    chat.messages.push({ role: 'user', content: text })
    // 更新对话标题
    if (chat.title === '新对话') {
      chat.title = text.slice(0, 15) + (text.length > 15 ? '...' : '')
    }
  }

  inputText.value = ''
  scrollToBottom()

  // 判断是否是命令
  const isCommand = ['weather', 'news', 'email', 'summary', 'wx', 'analyze', 'help', 'read', 'write', 'list', 'search', 'exec'].includes(text.split(' ')[0])
  
  if (isCommand) {
    await executeCommand(text)
  } else {
    // 普通对话
    await handleChat(text)
  }
}

async function sendQuickCommand(command: string) {
  inputText.value = command
  await sendMessage()
}

async function executeCommand(command: string) {
  loading.value = true
  const cmd = command.split(' ')[0]
  const config = commandConfig[cmd] || { loading: '执行中...' }
  loadingText.value = config.loading

  try {
    const response = await daxiaAPI.executeCommand(command)
    
    const chat = chatList.value.find(c => c.id === currentChatId.value)
    if (chat) {
      if (response.success) {
        const content = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data, null, 2)
        chat.messages.push({ role: 'assistant', content })
        isConnected.value = true
      } else {
        chat.messages.push({ role: 'assistant', content: `❌ 错误: ${response.message}` })
      }
    }
  } catch (error: any) {
    const chat = chatList.value.find(c => c.id === currentChatId.value)
    if (chat) {
      chat.messages.push({ role: 'assistant', content: `❌ 请求失败: ${error.message}` })
    }
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

async function handleChat(text: string) {
  loading.value = true
  loadingText.value = '思考中...'

  try {
    const response = await daxiaAPI.executeCommand(`ask ${text}`)
    
    const chat = chatList.value.find(c => c.id === currentChatId.value)
    if (chat) {
      if (response.success) {
        const content = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data, null, 2)
        chat.messages.push({ role: 'assistant', content })
      } else {
        chat.messages.push({ role: 'assistant', content: `❌ 错误: ${response.message}` })
      }
    }
  } catch (error: any) {
    const chat = chatList.value.find(c => c.id === currentChatId.value)
    if (chat) {
      chat.messages.push({ role: 'assistant', content: `❌ 请求失败: ${error.message}` })
    }
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
</style>
