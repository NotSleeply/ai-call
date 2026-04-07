<template>
  <div :ref="assignMessageListRef" class="flex-1 overflow-y-auto p-6 space-y-4">
    <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
      <span class="text-6xl mb-4">🦐</span>
      <p class="text-lg">你好！我是大虾助手</p>
      <p class="text-sm mt-2">输入命令或直接对话，我可以帮你完成各种任务</p>
      <div class="mt-6 grid grid-cols-2 gap-3">
        <button v-for="cmd in quickCommands" :key="cmd.name" @click="onSendQuickCommand(cmd.name)"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm transition-colors">
          {{ cmd.icon }} {{ cmd.label }}
        </button>
      </div>
    </div>

    <div v-for="msg in messages" :key="msg.id" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
      <div :class="[
        'max-w-2xl rounded-lg p-4',
        msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800',
      ]">
        <div v-if="msg.role === 'assistant'" class="flex items-center space-x-2 mb-2">
          <span>🦐</span>
          <span class="font-medium">大虾</span>
        </div>
        <img v-if="msg.qr_code" :src="msg.qr_code" alt="微信二维码" class="mb-4 rounded-lg" />
        <div v-if="msg.role === 'assistant'" class="assistant-markdown text-sm" v-html="renderMarkdown(msg.content)">
        </div>
        <pre v-else class="whitespace-pre-wrap text-sm font-sans">{{ msg.content }}</pre>
      </div>
    </div>

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
</template>

<script setup lang="ts">
import { toRefs, type ComponentPublicInstance } from 'vue'

interface ChatMessageView {
  id: number
  role: string
  content: string
  qr_code?: string | null
}

interface QuickCommandView {
  name: string
  icon: string
  label: string
}

const props = defineProps<{
  messages: ChatMessageView[]
  loading: boolean
  loadingText: string
  loadingPhase: string
  quickCommands: readonly QuickCommandView[]
  onSendQuickCommand: (command: string) => void
  renderMarkdown: (content: string) => string
  onMessageListRef: (el: Element | null) => void
}>()

function assignMessageListRef(element: Element | ComponentPublicInstance | null): void {
  props.onMessageListRef(element instanceof Element ? element : null)
}

const {
  messages,
  loading,
  loadingText,
  loadingPhase,
  quickCommands,
  onSendQuickCommand,
  renderMarkdown,
} = toRefs(props)
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
