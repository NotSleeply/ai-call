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
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { daxiaAPI, type Conversation, type Message, type CommandResponse } from './api/daxia'

const isConnected = ref(false)
const loading = ref(false)
const loadingText = ref('')
const loadingPhase = ref('')
const inputText = ref('')
const currentChatId = ref(1)
const messageListRef = ref<HTMLElement | null>(null)
const pendingLaunchUrl = ref<string | null>(null)

const loadingPhases = [
  '正在与助手同步上下文...',
  '正在组织回复内容...',
  '正在润色输出格式...',
]
let loadingPhaseTimer: number | null = null

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function startLoadingState(baseText: string) {
  loading.value = true
  loadingText.value = baseText
  loadingPhase.value = loadingPhases[0]

  let phaseIndex = 0
  loadingPhaseTimer = window.setInterval(() => {
    phaseIndex = (phaseIndex + 1) % loadingPhases.length
    loadingPhase.value = loadingPhases[phaseIndex]
  }, 1200)
}

function stopLoadingState() {
  if (loadingPhaseTimer) {
    clearInterval(loadingPhaseTimer)
    loadingPhaseTimer = null
  }
  loading.value = false
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

marked.setOptions({
  gfm: true,
  breaks: true,
})

function renderMarkdown(content: string): string {
  const parsed = marked.parse(content)
  const html = typeof parsed === 'string' ? parsed : ''
  return DOMPurify.sanitize(html)
}

function isLaunchConfirm(text: string): boolean {
  return /^(启动|开始|打开|start|open|go)$/i.test(text.trim())
}

function isLaunchCancel(text: string): boolean {
  return /^(取消|不用|不启动|不要|算了|cancel|no)$/i.test(text.trim())
}

function appendLocalMessage(role: 'user' | 'assistant', content: string) {
  messages.value.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    conversation_id: currentChatId.value,
    role,
    content,
    created_at: new Date().toISOString(),
  })
  scrollToBottom()
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

  // 二段式确认启动：先生成，再由用户输入“启动”后另开新页
  if (pendingLaunchUrl.value && isLaunchConfirm(text)) {
    inputText.value = ''
    appendLocalMessage('user', text)

    const launchUrl = pendingLaunchUrl.value
    pendingLaunchUrl.value = null

    // 先正常显示“分析/思考”加载框
    startLoadingState('正在分析启动请求...')
    const startTime = Date.now()
    const minAnalyzeDuration = 1800 + Math.random() * 1200 // 1.8-3s

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

    // 使用 setTimeout：3 秒后再执行打开
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
  let response: CommandResponse | null = null

  // 判断是否是命令
  const isCommand = ['weather', 'news', 'email', 'summary', 'wx', 'analyze', 'help', 'read', 'write', 'list', 'search', 'exec', '2048'].includes(text.split(' ')[0])

  if (isCommand) {
    response = await executeCommand(text)
  } else {
    // 普通对话
    response = await handleChat(text)
  }

  // 刷新消息列表
  await loadMessages()
  await loadChatList()

  // 严格顺序：生成完成 -> 刷新消息 -> 最后等待用户确认启动
  if (response?.success && response.openUrl) {
    pendingLaunchUrl.value = response.openUrl
  }
}

async function sendQuickCommand(command: string) {
  inputText.value = command
  await sendMessage()
}

async function executeCommand(command: string): Promise<CommandResponse | null> {
  const cmd = command.split(' ')[0]
  const config = commandConfig[cmd] || { loading: '执行中...' }
  startLoadingState(config.loading)

  const startTime = Date.now()
  const minDuration = 2600 + Math.random() * 3200 // 2.6-5.8秒随机等待
  let response: CommandResponse | null = null

  try {
    response = await daxiaAPI.executeCommand(command, currentChatId.value)
    isConnected.value = true
  } catch (error: any) {
    console.error('执行命令失败:', error)
  } finally {
    // 确保至少显示最小等待时间
    const elapsed = Date.now() - startTime
    if (elapsed < minDuration) {
      await wait(minDuration - elapsed)
    }
    stopLoadingState()
    scrollToBottom()
  }

  return response
}

async function handleChat(text: string): Promise<CommandResponse | null> {
  startLoadingState('思考中...')

  const startTime = Date.now()
  const minDuration = 2200 + Math.random() * 2800 // 2.2-5秒随机等待
  let response: CommandResponse | null = null

  try {
    response = await daxiaAPI.executeCommand(text, currentChatId.value)
  } catch (error: any) {
    console.error('对话失败:', error)
  } finally {
    // 确保至少显示最小等待时间
    const elapsed = Date.now() - startTime
    if (elapsed < minDuration) {
      await wait(minDuration - elapsed)
    }
    stopLoadingState()
    scrollToBottom()
  }

  return response
}

// 启动时检测连接状态并加载数据
onMounted(async () => {
  isConnected.value = await daxiaAPI.healthCheck()
  await loadChatList()
  await loadMessages()
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
