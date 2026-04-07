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
        <div class="ml-auto flex items-center gap-2">
          <button @click="openSchedulePanel"
            class="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
            定时任务
          </button>
          <button @click="openPanel"
            class="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
            Skill 管理
          </button>
        </div>
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
        <div class="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 shadow-sm">
          <div class="flex gap-3 items-end">
            <div class="flex-1 min-w-0">
              <div v-if="chatSelectedSkill"
                class="inline-flex items-center gap-2 mb-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">
                <span>🧩 {{ chatSelectedSkill.name }}</span>
                <button @click="clearChatSelectedSkill" class="text-indigo-500 hover:text-indigo-700">✕</button>
              </div>
              <input v-model="inputText" @keydown.enter="sendMessage" type="text" :placeholder="inputPlaceholder"
                class="w-full py-1.5 px-1 bg-transparent focus:outline-none" :disabled="loading" />
            </div>

            <button @click="sendMessage" :disabled="loading || !inputText.trim()"
              class="h-10 px-5 bg-slate-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              发送
            </button>
          </div>

          <div ref="toolbarMenuRef" class="mt-3 flex items-center justify-between text-sm relative">
            <div class="flex items-center gap-1.5">
              <div class="relative">
                <button @click="toggleCraftMenu"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-100">
                  <span>📁</span>
                  <span>Craft · {{ selectedCraftLabel }}</span>
                  <span>▾</span>
                </button>

                <div v-if="craftMenuOpen"
                  class="absolute left-0 bottom-[calc(100%+8px)] w-40 rounded-xl border border-slate-200 bg-white shadow-xl p-1 z-30">
                  <button @click="chooseCraftMode('plan')"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
                    Plan
                  </button>
                  <button @click="chooseCraftMode('ask')"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
                    Ask
                  </button>
                  <button @click="chooseCraftMode('agent')"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
                    Agent
                  </button>
                </div>
              </div>

              <div class="relative">
                <button @click="toggleModelMenu"
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
                    <button @click="chooseAutoModel"
                      class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
                      Auto（自动选择模型）
                    </button>

                    <div class="px-2.5 py-1 text-xs text-slate-500">常用模型</div>
                    <button v-for="model in commonModels" :key="`preset-${model.provider}-${model.modelName}`"
                      @click="chooseModelOption(model)"
                      class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
                      {{ model.label }}
                    </button>

                    <div v-if="customModels.length > 0">
                      <div class="px-2.5 py-1 text-xs text-slate-500">自定义模型</div>
                      <button v-for="model in customModels" :key="`custom-${model.provider}-${model.modelName}`"
                        @click="chooseModelOption(model)"
                        class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
                        {{ model.label }}
                      </button>
                    </div>
                  </div>

                  <div class="border-t border-slate-100 p-2.5 space-y-2">
                    <div class="text-xs text-slate-500">添加其他模型</div>
                    <div class="flex gap-2">
                      <select v-model="customModelProvider"
                        class="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="api">API</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="ollama">Ollama</option>
                      </select>
                      <input v-model="customModelName" type="text" placeholder="模型名，如 gpt-5-mini"
                        class="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button @click="addCustomModel"
                      class="w-full rounded-lg bg-slate-900 text-white py-1.5 text-sm hover:bg-black disabled:opacity-50"
                      :disabled="!customModelName.trim()">
                      添加并使用
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="relative">
              <button @click="toggleSkillMenu"
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
                    <input v-model="skillSearchKeyword" type="text" placeholder="搜索技能"
                      class="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div class="overflow-y-auto p-1.5 space-y-1 flex-1">
                  <button @click="chooseChatSkill('')"
                    class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center gap-2">
                    <span
                      class="w-5 h-5 rounded-full bg-slate-100 text-slate-600 inline-flex items-center justify-center text-xs">-</span>
                    <span>不使用 Skill</span>
                  </button>

                  <button v-for="skill in filteredChatSkills" :key="`picker-${skill.id}`"
                    @click="chooseChatSkill(skill.id)"
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
        </div>
      </footer>
    </main>
    <div v-if="skillPanelVisible" class="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div class="w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        <aside class="w-72 border-r bg-slate-50 flex flex-col">
          <div class="px-4 py-3 border-b bg-white">
            <h2 class="font-semibold text-slate-800">Skills</h2>
            <p class="text-xs text-slate-500 mt-1">默认 Skill 已内置，可新建自定义 Skill</p>
          </div>

          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            <button v-for="skill in skills" :key="skill.id" @click="selectSkill(skill.id)" :class="[
              'w-full text-left px-3 py-2 rounded-lg transition-colors border',
              skill.id === selectedSkillId
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-transparent hover:bg-slate-100'
            ]">
              <div class="text-sm font-medium truncate">{{ skill.name }}</div>
              <div class="text-xs text-slate-500 truncate mt-1">{{ skill.description }}</div>
              <span v-if="skill.is_default"
                class="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">默认</span>
            </button>
            <div v-if="!skillLoading && skills.length === 0" class="px-3 py-4 text-xs text-slate-500">
              暂无 Skill，请在右侧创建。
            </div>
          </div>

          <div class="p-3 border-t bg-white">
            <button @click="refreshSkills" :disabled="skillLoading"
              class="w-full py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50">
              {{ skillLoading ? '刷新中...' : '刷新列表' }}
            </button>
          </div>
        </aside>

        <section class="flex-1 flex flex-col">
          <div class="px-6 py-4 border-b flex items-center">
            <h3 class="font-semibold text-slate-800">Skill 工作台</h3>
            <button @click="closePanel"
              class="ml-auto px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-100">
              关闭
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div v-if="skillError" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {{ skillError }}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="rounded-xl border border-slate-200 p-4 bg-white">
                <h4 class="font-medium text-slate-800">新建 Skill</h4>
                <div class="mt-4 space-y-3">
                  <select v-model="createForm.mode"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="prompt">Prompt Skill（模型执行）</option>
                    <option value="module">Module Skill（脚本执行）</option>
                  </select>
                  <input v-model="createForm.name" type="text" placeholder="Skill 名称"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input v-model="createForm.description" type="text" placeholder="Skill 描述"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <textarea v-model="createForm.prompt" rows="6"
                    :placeholder="createForm.mode === 'prompt' ? 'System Prompt' : '模块说明（可选）'"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                  <input v-if="createForm.mode === 'module'" v-model="createForm.moduleEntry" type="text"
                    placeholder="模块入口，例如：skills/my-skill.skill.js 或 .py"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <textarea v-if="createForm.mode === 'module'" v-model="createForm.autoTriggersText" rows="3"
                    placeholder="自动触发词（每行一个），例如：备份仓库"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                  <button @click="handleCreateSkill" :disabled="skillSaving"
                    class="w-full py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                    {{ skillSaving ? '创建中...' : '创建 Skill' }}
                  </button>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 p-4 bg-white">
                <h4 class="font-medium text-slate-800">编辑选中 Skill</h4>
                <div v-if="!selectedSkill" class="mt-4 text-sm text-slate-500">请先从左侧选择一个 Skill。</div>
                <div v-else class="mt-4 space-y-3">
                  <select v-model="editForm.mode"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="prompt">Prompt Skill（模型执行）</option>
                    <option value="module">Module Skill（脚本执行）</option>
                  </select>
                  <input v-model="editForm.name" type="text"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input v-model="editForm.description" type="text"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <textarea v-model="editForm.prompt" rows="6"
                    :placeholder="editForm.mode === 'prompt' ? 'System Prompt' : '模块说明（可选）'"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                  <input v-if="editForm.mode === 'module'" v-model="editForm.moduleEntry" type="text"
                    placeholder="模块入口，例如：skills/my-skill.skill.js 或 .py"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <textarea v-if="editForm.mode === 'module'" v-model="editForm.autoTriggersText" rows="3"
                    placeholder="自动触发词（每行一个）"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>

                  <div class="flex gap-2">
                    <button @click="handleUpdateSkill" :disabled="skillSaving"
                      class="flex-1 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">
                      {{ skillSaving ? '保存中...' : '保存修改' }}
                    </button>
                    <button @click="handleDeleteSkill" :disabled="skillSaving || selectedSkill.is_default"
                      class="flex-1 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                      删除 Skill
                    </button>
                  </div>
                  <p v-if="selectedSkill.is_default" class="text-xs text-slate-500">
                    默认 Skill 可编辑，但不允许删除。
                  </p>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 p-4 bg-white">
              <h4 class="font-medium text-slate-800">运行 Skill 任务</h4>
              <div v-if="!selectedSkill" class="mt-4 text-sm text-slate-500">请先选择 Skill 后再运行。</div>
              <div v-else class="mt-4 space-y-3">
                <textarea v-model="taskInput" rows="4" placeholder="输入要交给 Skill 的任务..."
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                <button @click="handleRunSkill" :disabled="skillRunning || !taskInput.trim()"
                  class="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                  {{ skillRunning ? '运行中...' : '运行并生成结果' }}
                </button>
                <div v-if="runOutput"
                  class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
                  {{ runOutput }}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-if="schedulePanelVisible" class="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div class="w-full max-w-5xl h-[88vh] rounded-3xl bg-[#ececef] shadow-2xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-300 flex items-center gap-2">
          <h3 class="font-semibold text-slate-800">自动化任务</h3>
          <button @click="refreshScheduleTasks" :disabled="scheduleLoading"
            class="ml-auto px-3 py-1.5 text-sm rounded-full border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50">
            {{ scheduleLoading ? '刷新中...' : '刷新列表' }}
          </button>
          <button @click="closeSchedulePanel"
            class="px-3 py-1.5 text-sm rounded-full border border-slate-300 bg-white hover:bg-slate-100">
            关闭
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div v-if="scheduleError" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {{ scheduleError }}
          </div>

          <section class="rounded-2xl bg-[#d4d4d8] p-5">
            <h4 class="text-2xl font-semibold text-slate-800">添加自动化任务</h4>

            <div class="mt-4 space-y-3">
              <div>
                <label class="text-sm text-slate-700">名称</label>
                <input v-model="scheduleForm.name" type="text" placeholder="例如：每日 AI 新闻总结"
                  class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>

              <div>
                <label class="text-sm text-slate-700">工作空间（可选）</label>
                <input v-model="scheduleForm.workspace" type="text" placeholder="例如：产品组日报"
                  class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>

              <div>
                <label class="text-sm text-slate-700">提示词</label>
                <textarea v-model="scheduleForm.prompt" rows="4" placeholder="例如：请总结今天 AI 行业 5 条重点新闻，并给出简短点评。"
                  class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="text-sm text-slate-700">模型提供方</label>
                  <select v-model="scheduleForm.modelProvider"
                    class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
                    <option value="auto">Auto</option>
                    <option value="api">API</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="text-sm text-slate-700">模型名（Auto 可留空）</label>
                  <input v-model="scheduleForm.modelName" type="text" placeholder="例如：gpt-5-mini"
                    :disabled="scheduleForm.modelProvider === 'auto'"
                    class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-60" />
                </div>
              </div>

              <div class="text-xs text-slate-600">当前选择：{{ scheduleModelDisplay }}</div>

              <div>
                <label class="text-sm text-slate-700">执行频率</label>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button @click="scheduleForm.frequencyType = 'daily'" type="button" :class="[
                    'px-4 py-1.5 rounded-full text-sm border transition-colors',
                    scheduleForm.frequencyType === 'daily'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white/70 border-white/70 text-slate-700 hover:bg-white',
                  ]">
                    每天
                  </button>
                  <button @click="scheduleForm.frequencyType = 'interval'" type="button" :class="[
                    'px-4 py-1.5 rounded-full text-sm border transition-colors',
                    scheduleForm.frequencyType === 'interval'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white/70 border-white/70 text-slate-700 hover:bg-white',
                  ]">
                    按间隔
                  </button>
                  <button @click="scheduleForm.frequencyType = 'once'" type="button" :class="[
                    'px-4 py-1.5 rounded-full text-sm border transition-colors',
                    scheduleForm.frequencyType === 'once'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white/70 border-white/70 text-slate-700 hover:bg-white',
                  ]">
                    单次
                  </button>
                </div>
              </div>

              <div v-if="scheduleForm.frequencyType === 'daily'" class="space-y-2">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="text-sm text-slate-700">执行时间</label>
                    <input v-model="scheduleForm.timeOfDay" type="time"
                      class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                  <div>
                    <label class="text-sm text-slate-700">生效起始日期（可选）</label>
                    <input v-model="scheduleForm.startDate" type="date"
                      class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button v-for="weekday in scheduleWeekdayOptions" :key="weekday.value"
                    @click="toggleScheduleWeekday(weekday.value)" type="button" :class="[
                      'px-3 py-1 rounded-full text-sm border transition-colors',
                      scheduleForm.weekdays.includes(weekday.value)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white/70 text-slate-700 border-white/70 hover:bg-white',
                    ]">
                    {{ weekday.label }}
                  </button>
                </div>
              </div>

              <div v-else-if="scheduleForm.frequencyType === 'interval'" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="text-sm text-slate-700">执行间隔（分钟）</label>
                  <input v-model.number="scheduleForm.intervalMinutes" type="number" min="1"
                    class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
              </div>

              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="text-sm text-slate-700">执行时间</label>
                  <input v-model="scheduleForm.runAt" type="datetime-local"
                    class="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button @click="resetScheduleForm" type="button"
                  class="px-5 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700">
                  取消
                </button>
                <button @click="handleCreateSchedule" :disabled="scheduleSaving || !scheduleCanSubmit"
                  class="px-5 py-2 rounded-full bg-black text-white hover:bg-slate-900 disabled:opacity-50">
                  {{ scheduleSaving ? '添加中...' : '添加' }}
                </button>
              </div>
            </div>
          </section>

          <section class="rounded-2xl bg-white border border-slate-200 p-4">
            <div class="flex items-center">
              <h4 class="font-medium text-slate-800">任务列表</h4>
            </div>

            <div class="mt-3 space-y-2">
              <div v-if="!scheduleLoading && scheduleTasks.length === 0" class="text-sm text-slate-500 px-2 py-3">
                暂无自动化任务，先创建一个吧。
              </div>

              <div v-for="task in scheduleTasks" :key="task.id"
                class="rounded-xl border border-slate-200 px-3 py-3 bg-slate-50">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-800 truncate">#{{ task.id }} · {{ task.name }}</div>
                    <div class="text-xs text-slate-500 mt-1">{{ taskScheduleText(task) }}</div>
                    <div class="text-xs text-slate-500 mt-1">
                      模型: {{ task.modelProvider === 'auto' ? 'Auto' : `${task.modelProvider}${task.modelName ?
                        `:${task.modelName}` : ''}` }}
                      <span v-if="task.workspace"> · 工作空间: {{ task.workspace }}</span>
                    </div>
                    <div class="text-sm text-slate-700 mt-2 whitespace-pre-wrap break-all">{{ task.command }}</div>
                    <div class="text-xs text-slate-500 mt-1">
                      状态: {{ task.enabled ? '启用' : '停用' }} · 上次执行: {{ task.lastRunAt ? formatTime(task.lastRunAt) :
                        '未执行' }}
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0 flex-wrap">
                    <button @click="handleRunScheduleNow(task.id)" :disabled="scheduleSaving"
                      class="px-3 py-1.5 text-sm rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                      立即执行
                    </button>
                    <button @click="handleToggleSchedule(task.id, !task.enabled)" :disabled="scheduleSaving"
                      class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50">
                      {{ task.enabled ? '停用' : '启用' }}
                    </button>
                    <button @click="toggleScheduleRuns(task.id)" :disabled="scheduleSaving"
                      class="px-3 py-1.5 text-sm rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                      {{ expandedScheduleTaskId === task.id ? '收起历史' : '执行历史' }}
                    </button>
                    <button @click="handleDeleteSchedule(task.id)" :disabled="scheduleSaving"
                      class="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                      删除
                    </button>
                  </div>
                </div>

                <div v-if="expandedScheduleTaskId === task.id"
                  class="mt-3 rounded-lg bg-white border border-slate-200 p-3">
                  <div class="text-xs text-slate-500 mb-2">最近执行记录</div>

                  <div v-if="scheduleRunsLoading[task.id]" class="text-sm text-slate-500">加载中...</div>

                  <div v-else-if="!(scheduleRunsByTask[task.id]?.length)" class="text-sm text-slate-500">
                    暂无执行记录。
                  </div>

                  <div v-else class="space-y-2 max-h-56 overflow-y-auto">
                    <div v-for="run in scheduleRunsByTask[task.id]" :key="run.id"
                      class="rounded-md border border-slate-200 bg-slate-50 p-2">
                      <div class="text-xs text-slate-500">
                        {{ formatTime(run.executedAt) }} · {{ run.success ? '成功' : '失败' }}
                      </div>
                      <div class="mt-1 text-xs text-slate-700 whitespace-pre-wrap">{{ run.output }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  daxiaAPI,
  type CommandResponse,
  type ScheduledTask,
  type ScheduledTaskRun,
  type Skill,
} from './api/daxia'
import { commandKeywords, quickCommands } from './features/chat/constants'
import { useSkillManager } from './features/skills/composables/useSkillManager'
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

type CraftMode = 'plan' | 'ask' | 'agent'
type ModelProvider = 'auto' | 'deepseek' | 'api' | 'ollama'
type ScheduleFrequencyType = 'daily' | 'interval' | 'once'

interface SelectableModel {
  label: string
  provider: Exclude<ModelProvider, 'auto'>
  modelName: string
}

const CUSTOM_MODELS_STORAGE_KEY = 'smallclaw.custom-model-options'

const selectedCraftMode = ref<CraftMode>('ask')
const selectedModelProvider = ref<ModelProvider>('auto')
const selectedModelName = ref('')
const commonModels: SelectableModel[] = [
  { label: 'DeepSeek Chat', provider: 'deepseek', modelName: 'deepseek-chat' },
  { label: 'DeepSeek Reasoner', provider: 'deepseek', modelName: 'deepseek-reasoner' },
  { label: 'Qwen3 (Ollama)', provider: 'ollama', modelName: 'qwen3:latest' },
  { label: 'Qwen2.5 7B (Ollama)', provider: 'ollama', modelName: 'qwen2.5:7b' },
  { label: 'Llama3.1 8B (Ollama)', provider: 'ollama', modelName: 'llama3.1:8b' },
  { label: 'Mistral 7B (Ollama)', provider: 'ollama', modelName: 'mistral:7b' },
  { label: 'Gemma2 9B (Ollama)', provider: 'ollama', modelName: 'gemma2:9b' },
  { label: 'Gemini 3.1 Pro (Preview)', provider: 'api', modelName: 'gemini-3.1-pro' },
  { label: 'GPT-5 mini', provider: 'api', modelName: 'gpt-5-mini' },
  { label: 'GPT-5.3-Codex', provider: 'api', modelName: 'gpt-5.3-codex' },
  { label: 'Raptor mini (Preview)', provider: 'api', modelName: 'raptor-mini' },
  { label: 'Claude Opus 4.6', provider: 'api', modelName: 'claude-opus-4.6' },
  { label: 'Claude Sonnet 4.6', provider: 'api', modelName: 'claude-sonnet-4.6' },
  { label: 'GPT-5.4', provider: 'api', modelName: 'gpt-5.4' },
  { label: 'Claude Haiku 4.5', provider: 'api', modelName: 'claude-haiku-4.5' },
  { label: 'Gemini 2.5 Pro', provider: 'api', modelName: 'gemini-2.5-pro' },
  { label: 'Gemini 3 Flash (Preview)', provider: 'api', modelName: 'gemini-3-flash' },
  { label: 'GPT-4.1', provider: 'api', modelName: 'gpt-4.1' },
  { label: 'GPT-4o', provider: 'api', modelName: 'gpt-4o' },
  { label: 'GPT-5.1', provider: 'api', modelName: 'gpt-5.1' },
  { label: 'GPT-5.2', provider: 'api', modelName: 'gpt-5.2' },
  { label: 'GPT-5.2-Codex', provider: 'api', modelName: 'gpt-5.2-codex' },
  { label: 'GPT-5.4 mini', provider: 'api', modelName: 'gpt-5.4-mini' },
  { label: 'Grok Code Fast 1', provider: 'api', modelName: 'grok-code-fast-1' },
  { label: 'Doubao-Seed-2.0-Code', provider: 'api', modelName: 'doubao-seed-2.0-code' },
  { label: 'Doubao-Seed-Code', provider: 'api', modelName: 'doubao-seed-code' },
  { label: 'MiniMax-M2.7', provider: 'api', modelName: 'minimax-m2.7' },
  { label: 'MiniMax-M2.5', provider: 'api', modelName: 'minimax-m2.5' },
  { label: 'GLM-5V-Turbo', provider: 'api', modelName: 'glm-5v-turbo' },
  { label: 'GLM-5', provider: 'api', modelName: 'glm-5' },
  { label: 'Kimi-K2.5', provider: 'api', modelName: 'kimi-k2.5' },
  { label: 'Qwen3.5-Plus', provider: 'api', modelName: 'qwen3.5-plus' },
]
const customModelProvider = ref<Exclude<ModelProvider, 'auto'>>('api')
const customModelName = ref('')
const customModels = ref<SelectableModel[]>([])

const scheduleWeekdayOptions: Array<{ value: number; label: string }> = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
]

const schedulePanelVisible = ref(false)
const scheduleLoading = ref(false)
const scheduleSaving = ref(false)
const scheduleError = ref('')
const scheduleTasks = ref<ScheduledTask[]>([])
const scheduleForm = ref({
  name: '',
  workspace: '',
  prompt: '',
  modelProvider: 'auto' as ModelProvider,
  modelName: '',
  frequencyType: 'daily' as ScheduleFrequencyType,
  intervalMinutes: 10,
  timeOfDay: '09:00',
  weekdays: [1, 2, 3, 4, 5, 6, 7] as number[],
  runAt: '',
  startDate: '',
})
const expandedScheduleTaskId = ref<number | null>(null)
const scheduleRunsByTask = ref<Record<number, ScheduledTaskRun[]>>({})
const scheduleRunsLoading = ref<Record<number, boolean>>({})

const chatSelectedSkillId = ref('')
const craftMenuOpen = ref(false)
const modelMenuOpen = ref(false)
const skillMenuOpen = ref(false)
const skillSearchKeyword = ref('')
const toolbarMenuRef = ref<HTMLElement | null>(null)
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

const selectedCraftLabel = computed(() => {
  if (selectedCraftMode.value === 'plan') return 'Plan'
  if (selectedCraftMode.value === 'agent') return 'Agent'
  return 'Ask'
})

const selectedModelDisplay = computed(() => {
  if (selectedModelProvider.value === 'auto') {
    return 'Auto'
  }

  const allOptions = [...commonModels, ...customModels.value]
  const matched = allOptions.find(
    (item) =>
      item.provider === selectedModelProvider.value &&
      item.modelName === selectedModelName.value,
  )

  return matched?.label || `${selectedModelProvider.value}:${selectedModelName.value}`
})

const scheduleModelDisplay = computed(() => {
  if (scheduleForm.value.modelProvider === 'auto') {
    return 'Auto'
  }

  const allOptions = [...commonModels, ...customModels.value]
  const matched = allOptions.find(
    (item) =>
      item.provider === scheduleForm.value.modelProvider &&
      item.modelName === scheduleForm.value.modelName,
  )

  return (
    matched?.label ||
    `${scheduleForm.value.modelProvider}:${scheduleForm.value.modelName || '默认模型'}`
  )
})

const scheduleCanSubmit = computed(() => {
  if (!scheduleForm.value.name.trim() || !scheduleForm.value.prompt.trim()) {
    return false
  }

  if (
    scheduleForm.value.modelProvider !== 'auto' &&
    !scheduleForm.value.modelName.trim()
  ) {
    return false
  }

  if (scheduleForm.value.frequencyType === 'interval') {
    return Number(scheduleForm.value.intervalMinutes) > 0
  }

  if (scheduleForm.value.frequencyType === 'daily') {
    return (
      /^(\d{1,2}):(\d{2})$/.test(scheduleForm.value.timeOfDay) &&
      scheduleForm.value.weekdays.length > 0
    )
  }

  return !!scheduleForm.value.runAt
})

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

watch(currentChatId, () => {
  void loadMessages()
  if (schedulePanelVisible.value) {
    void refreshScheduleTasks()
  }
})

function resetScheduleForm(): void {
  scheduleForm.value = {
    name: '',
    workspace: '',
    prompt: '',
    modelProvider: selectedModelProvider.value,
    modelName:
      selectedModelProvider.value === 'auto'
        ? ''
        : selectedModelName.value,
    frequencyType: 'daily',
    intervalMinutes: 10,
    timeOfDay: '09:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    runAt: '',
    startDate: '',
  }
}

function toggleScheduleWeekday(day: number): void {
  if (scheduleForm.value.frequencyType !== 'daily') {
    return
  }

  if (scheduleForm.value.weekdays.includes(day)) {
    scheduleForm.value.weekdays = scheduleForm.value.weekdays.filter((item) => item !== day)
  } else {
    scheduleForm.value.weekdays = [...scheduleForm.value.weekdays, day].sort((a, b) => a - b)
  }
}

function taskScheduleText(task: ScheduledTask): string {
  if (task.frequencyType === 'interval') {
    const minutes = Math.max(1, Math.round(task.intervalSeconds / 60))
    return `按间隔 · 每 ${minutes} 分钟`
  }

  if (task.frequencyType === 'once') {
    return `单次 · ${task.runAt ? formatTime(task.runAt) : '未设置时间'}`
  }

  const weekdays = task.weekdays
    .map((day) => scheduleWeekdayOptions.find((item) => item.value === day)?.label)
    .filter((value): value is string => !!value)
    .join(' ')

  return `每天 · ${task.timeOfDay || '09:00'}${weekdays ? ` · ${weekdays}` : ''}`
}

function openSchedulePanel(): void {
  schedulePanelVisible.value = true
  scheduleError.value = ''
  resetScheduleForm()
  void refreshScheduleTasks()
}

function closeSchedulePanel(): void {
  schedulePanelVisible.value = false
}

async function refreshScheduleTasks(): Promise<void> {
  scheduleLoading.value = true
  scheduleError.value = ''

  try {
    scheduleTasks.value = await daxiaAPI.listSchedules(currentChatId.value)

    if (
      expandedScheduleTaskId.value !== null &&
      !scheduleTasks.value.some((task) => task.id === expandedScheduleTaskId.value)
    ) {
      expandedScheduleTaskId.value = null
    }

    if (expandedScheduleTaskId.value !== null) {
      await loadScheduleRuns(expandedScheduleTaskId.value)
    }
  } catch (error) {
    scheduleError.value =
      error instanceof Error ? error.message : '获取定时任务失败'
  } finally {
    scheduleLoading.value = false
  }
}

async function handleCreateSchedule(): Promise<void> {
  if (!scheduleCanSubmit.value) {
    scheduleError.value = '请先填写完整的任务信息'
    return
  }

  scheduleSaving.value = true
  scheduleError.value = ''

  try {
    const payload: {
      conversationId: number
      name: string
      workspace?: string
      prompt: string
      modelProvider: ModelProvider
      modelName?: string
      frequencyType: ScheduleFrequencyType
      intervalMinutes?: number
      timeOfDay?: string
      weekdays?: number[]
      runAt?: string
      startDate?: string
    } = {
      conversationId: currentChatId.value,
      name: scheduleForm.value.name.trim(),
      workspace: scheduleForm.value.workspace.trim() || undefined,
      prompt: scheduleForm.value.prompt.trim(),
      modelProvider: scheduleForm.value.modelProvider,
      modelName:
        scheduleForm.value.modelProvider === 'auto'
          ? undefined
          : scheduleForm.value.modelName.trim() || undefined,
      frequencyType: scheduleForm.value.frequencyType,
      startDate: scheduleForm.value.startDate || undefined,
    }

    if (scheduleForm.value.frequencyType === 'interval') {
      payload.intervalMinutes = Math.max(1, Math.floor(Number(scheduleForm.value.intervalMinutes || 1)))
    } else if (scheduleForm.value.frequencyType === 'daily') {
      payload.timeOfDay = scheduleForm.value.timeOfDay
      payload.weekdays = scheduleForm.value.weekdays
    } else {
      payload.runAt = scheduleForm.value.runAt
    }

    const response = await daxiaAPI.createSchedule(payload)

    if (!response.success) {
      scheduleError.value = response.message || '创建定时任务失败'
      return
    }

    resetScheduleForm()
    await refreshScheduleTasks()
  } catch (error) {
    scheduleError.value =
      error instanceof Error ? error.message : '创建定时任务失败'
  } finally {
    scheduleSaving.value = false
  }
}

async function handleToggleSchedule(taskId: number, enabled: boolean): Promise<void> {
  scheduleSaving.value = true
  scheduleError.value = ''

  try {
    const response = await daxiaAPI.updateScheduleEnabled(taskId, enabled)
    if (!response.success) {
      scheduleError.value = response.message || '更新任务状态失败'
      return
    }
    await refreshScheduleTasks()
  } catch (error) {
    scheduleError.value =
      error instanceof Error ? error.message : '更新任务状态失败'
  } finally {
    scheduleSaving.value = false
  }
}

async function handleRunScheduleNow(taskId: number): Promise<void> {
  scheduleSaving.value = true
  scheduleError.value = ''

  try {
    const response = await daxiaAPI.runScheduleNow(taskId)
    if (!response.success) {
      scheduleError.value = response.message || '立即执行失败'
      return
    }

    await loadMessages()
    await loadChatList()
    await refreshScheduleTasks()
    await loadScheduleRuns(taskId)
  } catch (error) {
    scheduleError.value =
      error instanceof Error ? error.message : '立即执行失败'
  } finally {
    scheduleSaving.value = false
  }
}

async function handleDeleteSchedule(taskId: number): Promise<void> {
  if (!window.confirm('确认删除该定时任务吗？')) return

  scheduleSaving.value = true
  scheduleError.value = ''

  try {
    const response = await daxiaAPI.deleteSchedule(taskId)
    if (!response.success) {
      scheduleError.value = response.message || '删除定时任务失败'
      return
    }

    if (expandedScheduleTaskId.value === taskId) {
      expandedScheduleTaskId.value = null
    }

    delete scheduleRunsByTask.value[taskId]
    delete scheduleRunsLoading.value[taskId]

    await refreshScheduleTasks()
  } catch (error) {
    scheduleError.value =
      error instanceof Error ? error.message : '删除定时任务失败'
  } finally {
    scheduleSaving.value = false
  }
}

async function loadScheduleRuns(taskId: number): Promise<void> {
  scheduleRunsLoading.value[taskId] = true

  try {
    const runs = await daxiaAPI.listScheduleRuns(taskId, 20)
    scheduleRunsByTask.value[taskId] = runs
  } catch (error) {
    scheduleError.value =
      error instanceof Error ? error.message : '获取执行历史失败'
  } finally {
    scheduleRunsLoading.value[taskId] = false
  }
}

function toggleScheduleRuns(taskId: number): void {
  if (expandedScheduleTaskId.value === taskId) {
    expandedScheduleTaskId.value = null
    return
  }

  expandedScheduleTaskId.value = taskId

  if (!scheduleRunsByTask.value[taskId]) {
    void loadScheduleRuns(taskId)
  }
}

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

function toggleCraftMenu(): void {
  craftMenuOpen.value = !craftMenuOpen.value
  if (craftMenuOpen.value) {
    modelMenuOpen.value = false
    skillMenuOpen.value = false
  }
}

function chooseCraftMode(mode: CraftMode): void {
  selectedCraftMode.value = mode
  craftMenuOpen.value = false
}

function toggleModelMenu(): void {
  modelMenuOpen.value = !modelMenuOpen.value
  if (modelMenuOpen.value) {
    craftMenuOpen.value = false
    skillMenuOpen.value = false
  }
}

function toggleSkillMenu(): void {
  skillMenuOpen.value = !skillMenuOpen.value
  if (skillMenuOpen.value) {
    craftMenuOpen.value = false
    modelMenuOpen.value = false
    skillSearchKeyword.value = ''
  }
}

function chooseAutoModel(): void {
  selectedModelProvider.value = 'auto'
  selectedModelName.value = ''
  modelMenuOpen.value = false
}

function chooseModelOption(model: SelectableModel): void {
  selectedModelProvider.value = model.provider
  selectedModelName.value = model.modelName
  modelMenuOpen.value = false
}

function saveCustomModels(): void {
  localStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(customModels.value))
}

function loadCustomModels(): void {
  try {
    const raw = localStorage.getItem(CUSTOM_MODELS_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return

    const mapped = parsed
      .map((item): SelectableModel => ({
        label: String(item.label || item.modelName || '').trim(),
        provider:
          item.provider === 'deepseek'
            ? 'deepseek'
            : item.provider === 'ollama'
              ? 'ollama'
              : 'api',
        modelName: String(item.modelName || '').trim(),
      }))
      .filter((item) => item.label && item.modelName)

    customModels.value = mapped
  } catch {
    customModels.value = []
  }
}

function addCustomModel(): void {
  const name = customModelName.value.trim()
  if (!name) return

  const provider = customModelProvider.value
  const alreadyExists = [...commonModels, ...customModels.value].some(
    (item) => item.provider === provider && item.modelName === name,
  )

  if (!alreadyExists) {
    customModels.value.unshift({
      label:
        provider === 'deepseek'
          ? `DeepSeek · ${name}`
          : provider === 'ollama'
            ? `Ollama · ${name}`
            : `API · ${name}`,
      provider,
      modelName: name,
    })
    saveCustomModels()
  }

  selectedModelProvider.value = provider
  selectedModelName.value = name
  customModelName.value = ''
  modelMenuOpen.value = false
}

function chooseChatSkill(skillId: string): void {
  chatSelectedSkillId.value = skillId
  skillMenuOpen.value = false
  skillSearchKeyword.value = ''
}

function handleClickOutsideMenus(event: MouseEvent): void {
  const target = event.target as Node
  if (!toolbarMenuRef.value?.contains(target)) {
    craftMenuOpen.value = false
    modelMenuOpen.value = false
    skillMenuOpen.value = false
  }
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
