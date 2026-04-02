<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-4xl">🦐</span>
            <div>
              <h1 class="text-2xl font-bold text-gray-800">大虾功能演示</h1>
              <p class="text-sm text-gray-500">Vue3 + TypeScript + Tailwind</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <div :class="['w-3 h-3 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></div>
              <span class="text-sm text-gray-600">{{ isConnected ? '已连接' : '未连接' }}</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Command Buttons -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">快捷命令</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <button
            v-for="cmd in commands"
            :key="cmd.name"
            @click="executeCommand(cmd.name)"
            :disabled="loading"
            class="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="text-3xl mb-2">{{ cmd.icon }}</span>
            <span class="text-sm font-medium text-gray-700">{{ cmd.label }}</span>
          </button>
        </div>
      </div>

      <!-- Result Display -->
      <div v-if="result" class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800">{{ resultTitle }}</h3>
          <button
            @click="result = null"
            class="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
          <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ result }}</pre>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p class="text-gray-600">{{ loadingText }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { daxiaAPI } from './api/daxia'

const isConnected = ref(false)
const loading = ref(false)
const loadingText = ref('')
const result = ref<string | null>(null)
const resultTitle = ref('')

const commands = [
  { name: 'weather', label: '天气', icon: '🌤️' },
  { name: 'news', label: '新闻', icon: '📰' },
  { name: 'email', label: '邮件', icon: '📧' },
  { name: 'summary', label: '总结', icon: '📝' },
  { name: 'wx', label: '微信', icon: '💬' },
  { name: 'analyze', label: '分析', icon: '📊' },
  { name: 'help', label: '帮助', icon: '❓' },
]

const commandConfig: Record<string, { title: string; loading: string }> = {
  weather: { title: '天气信息', loading: '正在获取天气信息...' },
  news: { title: '新闻摘要', loading: '正在获取新闻...' },
  email: { title: '邮件摘要', loading: '正在获取邮件...' },
  summary: { title: '对话总结', loading: '正在生成总结...' },
  wx: { title: '微信连接', loading: '正在连接微信...' },
  analyze: { title: '项目分析', loading: '正在分析项目...' },
  help: { title: '帮助信息', loading: '正在获取帮助...' },
}

async function executeCommand(command: string) {
  loading.value = true
  const config = commandConfig[command] || { title: '执行结果', loading: '执行中...' }
  loadingText.value = config.loading
  resultTitle.value = config.title

  try {
    const response = await daxiaAPI.executeCommand(command)
    
    if (response.success) {
      result.value = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data, null, 2)
      isConnected.value = true
    } else {
      result.value = `❌ 错误: ${response.message}`
    }
  } catch (error: any) {
    result.value = `❌ 请求失败: ${error.message}`
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
</style>
