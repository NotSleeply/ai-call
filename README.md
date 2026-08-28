# SmallClaw — 大虾（AI 编程助手）

## 定位与核心需求

1. **单次命令调用（One-shot First）**
   - 不进入任何交互界面，直接通过命令参数触发。
   - 例如：`sc "tar 解压到指定目录的参数是什么"` 或 `sc -f index.ts "帮我把这个函数转成 async"`。
   - 结果直接流式打在当前终端，不产生多余的边框和欢迎语。

2. **原生支持 Unix 管道（Pipe-friendly）**
   - 支持从标准输入（stdin）读取内容。
   - 例如：`git diff | sc "生成一行符合规范的 commit message"`，或者 `cat error.log | sc "提取出最核心的报错原因"`。
   - 输出纯净文本，方便进一步重定向到文件或下一个命令。

3. **Shell 命令生成与安全确认执行**
   - 终端里最高频的痛点是记不住复杂命令（如 find、ffmpeg、docker、git 等）。
   - 提供执行标志（如 `sc -x "找出占用 8080 端口的进程并杀掉"`），AI 生成精准命令，按下回车直接运行，按取消即放弃。

4. **无缝上下文延续（可选 Context）**
   - 默认无状态，保证极速响应。
   - 需要追问时，加 `-c`（continue）自动附带上一条命令的上下文，不需要开一个专门的会话窗口。


**特性**：

- 🖥️ 纯 CLI 交互模式（REPL）
- 📁 文件操作：读取、写入、搜索、列出目录
- 💻 系统命令执行
- 🧠 智能能力：项目分析、智能问答
- 🤝 多 Agent 协同工作
- 🎯 Skill 管理：可注册自定义 Skill 模块
- 💬 对话记录：SQLite 持久化存储
- 🤖 支持 Ollama 本地模型

---

## 快速开始

**先决条件**：Node.js（推荐 18+）、`pnpm`。

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置

在项目根目录创建 `.env` 文件（或复制 `.env.example`）：

```bash
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
MODEL_API_KEY=你的统一模型APIKey
MODEL_API_BASE_URL=https://openrouter.ai/api/v1
MODEL_API_MODEL=gpt-5-mini
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:latest
```

说明：系统会按优先级选择模型来源（`MODEL_API_*` → `DEEPSEEK_*` → 本地 `OLLAMA_*`）。未配置任何外部 Key 时可配合本地 Ollama 使用。

### 3. 构建

```bash
pnpm run build
```

### 4. 运行

```bash
pnpm start
```

---

## 常用命令

| 命令                  | 说明             | 示例                      |
| --------------------- | ---------------- | ------------------------- |
| `help`                | 显示帮助信息     | `help`                    |
| `read <文件>`         | 读取文件内容     | `read package.json`       |
| `write <文件> <内容>` | 写入文件         | `write demo.txt 你好世界` |
| `list [目录]`         | 列出目录内容     | `list src`                |
| `search <关键词>`     | 搜索代码关键词   | `search function`         |
| `exec <命令>`         | 执行系统命令     | `exec dir`                |
| `analyze`             | 分析当前项目结构 | `analyze`                 |
| `ask <问题>`          | 智能提问         | `ask 什么是 TypeScript？` |
| `agents [任务]`       | 多 Agent 协同    | `agents 设计REST API`     |
| `ollama <问题>`       | 使用本地 Ollama  | `ollama 解释闭包`         |
| `new`                 | 开始新对话       | `new`                     |
| `history`             | 查看对话历史     | `history`                 |
| `exit`                | 退出程序         | `exit`                    |

**提示**：输入任意其他内容将进入智能问答模式。

---

## Skill 系统

项目支持自定义 Skill 模块，位于 `skills/` 目录：

- `repo-auto-backup.skill.js` — 备份仓库到目标目录（示例 JS Skill）
- `batch-add-file-prefix.skill.py` — 批量给文件名加前缀（示例 Python Skill）

Skill 可以以模块形式被触发并执行复杂任务。

---

## 项目结构

```bash
SmallClaw/
├── src/                          # 源代码
│   ├── index.ts                  # CLI 入口（REPL 交互）
│   ├── assistant.ts              # 核心助手类
│   ├── database.ts               # SQLite 数据库
│   └── assistant_modules/        # 功能模块
│       ├── core/                 # 核心客户端（OpenClaw）
│       ├── services/             # 业务服务
│       └── utils/                # 工具函数
├── skills/                       # 自定义 Skill 模块
├── data/                         # 数据文件（SQLite 数据库等）
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
└── .env.example                  # 环境变量示例
```

---

## 常见问题

**Q: 命令不可用？**
A: 请确认已在项目根目录执行 `pnpm install` 和 `pnpm run build`。

**Q: 本地 Ollama 无响应？**
A: 确认本地 Ollama 服务已启动并且 `.env` 中 `OLLAMA_HOST` 配置正确。

**Q: 如何添加新功能？**
A: 在 `src/assistant_modules/services/` 下创建新的服务类，并在 `assistant.ts` 中集成。

---
