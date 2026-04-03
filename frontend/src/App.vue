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
            'p-3 rounded-lg cursor-pointer transition-colors group',
            chat.id === currentChatId ? 'bg-gray-700' : 'hover:bg-gray-800'
          ]"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 flex-1 min-w-0">
              <span>💬</span>
              <span class="text-sm truncate">{{ chat.title }}</span>
            </div>
            <button
              @click.stop="deleteChat(chat.id)"
              class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity"
            >
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
        <div v-for="msg in messages" :key="msg.id" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div :class="['max-w-2xl rounded-lg p-4', msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800']">
            <div v-if="msg.role === 'assistant'" class="flex items-center space-x-2 mb-2">
              <span>🦐</span>
              <span class="font-medium">大虾</span>
            </div>
            <!-- 二维码图片 -->
            <img v-if="msg.qr_code" :src="msg.qr_code" alt="微信二维码" class="mb-4 rounded-lg" />
            <pre class="whitespace-pre-wrap text-sm font-sans">{{ msg.content }}</pre>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="flex justify-start">
          <div class="bg-gray-100 rounded-lg p-4">
            <div class="flex items-center space-x-3 text-gray-500">
              <div class="text-xl font-mono">{{ loadingSpinner }}</div>
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
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { daxiaAPI, type Conversation, type Message } from './api/daxia'

const isConnected = ref(false)
const loading = ref(false)
const loadingText = ref('')
const loadingSpinner = ref('⠋')
const inputText = ref('')
const currentChatId = ref(1)
const messageListRef = ref<HTMLElement | null>(null)

// 旋转动画符号
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
let spinnerInterval: number | null = null

// 开始旋转动画
function startSpinner() {
  let i = 0
  spinnerInterval = window.setInterval(() => {
    loadingSpinner.value = spinnerFrames[i % spinnerFrames.length]
    i++
  }, 100)
}

// 停止旋转动画
function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval)
    spinnerInterval = null
  }
}

const chatList = ref<Conversation[]>([])
const messages = ref<Message[]>([])

const currentChat = computed(() => chatList.value.find(c => c.id === currentChatId.value))

const quickCommands = [
  { name: 'weather', label: '天气', icon: '🌤️' },
  { name: 'news', label: '新闻', icon: '📰' },
  { name: 'email', label: '邮件', icon: '📧' },
  { name: 'wx', label: '微信', icon: '💬' },
  { name: 'summary', label: '总结', icon: '📝' },
  { name: '2048', label: '2048', icon: '🎮' },
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
  '2048': { loading: '正在生成2048游戏...' },
}

// 格式化时间
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 加载对话列表
async function loadChatList() {
  try {
    chatList.value = await daxiaAPI.getConversations()
    if (chatList.value.length > 0 && !chatList.value.find(c => c.id === currentChatId.value)) {
      currentChatId.value = chatList.value[0].id
    }
  } catch (error) {
    console.error('加载对话列表失败:', error)
  }
}

// 加载对话消息
async function loadMessages() {
  if (!currentChatId.value) return
  
  try {
    const conv = await daxiaAPI.getConversation(currentChatId.value)
    messages.value = conv.messages || []
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败:', error)
    messages.value = []
  }
}

// 监听对话切换
watch(currentChatId, () => {
  loadMessages()
})

async function createNewChat() {
  try {
    const conv = await daxiaAPI.createConversation()
    chatList.value.unshift(conv)
    currentChatId.value = conv.id
    messages.value = []
  } catch (error) {
    console.error('创建对话失败:', error)
  }
}

function selectChat(id: number) {
  currentChatId.value = id
}

async function deleteChat(id: number) {
  if (!confirm('确定要删除这个对话吗？')) return
  
  try {
    await daxiaAPI.deleteConversation(id)
    chatList.value = chatList.value.filter(c => c.id !== id)
    
    if (currentChatId.value === id) {
      if (chatList.value.length > 0) {
        currentChatId.value = chatList.value[0].id
      } else {
        await createNewChat()
      }
    }
  } catch (error) {
    console.error('删除对话失败:', error)
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  inputText.value = ''
  
  // 判断是否是命令
  const isCommand = ['weather', 'news', 'email', 'summary', 'wx', 'analyze', 'help', 'read', 'write', 'list', 'search', 'exec', '2048'].includes(text.split(' ')[0])
  
  if (isCommand) {
    await executeCommand(text)
  } else {
    // 普通对话
    await handleChat(text)
  }
  
  // 刷新消息列表
  await loadMessages()
  await loadChatList()
}

async function sendQuickCommand(command: string) {
  inputText.value = command
  await sendMessage()
}

async function executeCommand(command: string) {
  loading.value = true
  startSpinner()
  const cmd = command.split(' ')[0]
  const config = commandConfig[cmd] || { loading: '执行中...' }
  loadingText.value = config.loading

  const startTime = Date.now()
  const minDuration = 1000 + Math.random() * 3000 // 1-4秒随机等待

  try {
    await daxiaAPI.executeCommand(command, currentChatId.value)
    isConnected.value = true
  } catch (error: any) {
    console.error('执行命令失败:', error)
  } finally {
    // 确保至少显示最小等待时间
    const elapsed = Date.now() - startTime
    if (elapsed < minDuration) {
      await new Promise(resolve => setTimeout(resolve, minDuration - elapsed))
    }
    stopSpinner()
    loading.value = false
    scrollToBottom()
  }
}

async function handleChat(text: string) {
  loading.value = true
  startSpinner()
  loadingText.value = '思考中...'

  const startTime = Date.now()
  const minDuration = 1000 + Math.random() * 3000 // 1-4秒随机等待

  try {
    await daxiaAPI.executeCommand(text, currentChatId.value)
  } catch (error: any) {
    console.error('对话失败:', error)
  } finally {
    // 确保至少显示最小等待时间
    const elapsed = Date.now() - startTime
    if (elapsed < minDuration) {
      await new Promise(resolve => setTimeout(resolve, minDuration - elapsed))
    }
    stopSpinner()
    loading.value = false
    scrollToBottom()
  }
}

// 启动时检测连接状态并加载数据
onMounted(async () => {
  isConnected.value = await daxiaAPI.healthCheck()
  await loadChatList()
  await loadMessages()
})
</script>

<style scoped>
</style>
