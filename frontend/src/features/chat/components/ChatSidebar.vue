<template>
  <aside class="w-64 bg-gray-900 text-white flex flex-col">
    <div class="p-4 border-b border-gray-700">
      <div class="flex items-center space-x-2">
        <span class="text-2xl">🦐</span>
        <span class="font-bold text-lg">大虾助手</span>
      </div>
    </div>

    <div class="p-3">
      <button @click="onCreateNewChat"
        class="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
        <span>➕</span>
        <span>新建对话</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <div v-for="chat in chatList" :key="chat.id" @click="onSelectChat(chat.id)" :class="[
        'p-3 rounded-lg cursor-pointer transition-colors group',
        chat.id === currentChatId ? 'bg-gray-700' : 'hover:bg-gray-800'
      ]">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2 flex-1 min-w-0">
            <span>💬</span>
            <span class="text-sm truncate">{{ chat.title }}</span>
          </div>
          <button @click.stop="onDeleteChat(chat.id)"
            class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity">
            🗑️
          </button>
        </div>
        <div class="text-xs text-gray-400 mt-1">{{ formatTime(chat.updated_at) }}</div>
      </div>
    </div>

    <div class="p-4 border-t border-gray-700">
      <div class="flex items-center space-x-2">
        <div :class="['w-2 h-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></div>
        <span class="text-xs text-gray-400">{{ isConnected ? '已连接' : '未连接' }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import type { Conversation } from '../../../api/daxia'

const props = defineProps<{
  chatList: Conversation[]
  currentChatId: number
  isConnected: boolean
  formatTime: (value: string) => string
  onCreateNewChat: () => void
  onSelectChat: (id: number) => void
  onDeleteChat: (id: number) => void
}>()

const {
  chatList,
  currentChatId,
  isConnected,
  formatTime,
  onCreateNewChat,
  onSelectChat,
  onDeleteChat,
} = toRefs(props)
</script>
