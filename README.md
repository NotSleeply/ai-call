# SmallClaw — 大虾（AI 编程助手）

SmallClaw 是一个基于命令行的 AI 编程助手，提供文件操作、代码分析、智能问答、多 Agent 协作等功能。

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

```env
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

| 命令 | 说明 | 示例 |
|------|------|------|
| `help` | 显示帮助信息 | `help` |
| `read <文件>` | 读取文件内容 | `read package.json` |
| `write <文件> <内容>` | 写入文件 | `write demo.txt 你好世界` |
| `list [目录]` | 列出目录内容 | `list src` |
| `search <关键词>` | 搜索代码关键词 | `search function` |
| `exec <命令>` | 执行系统命令 | `exec dir` |
| `analyze` | 分析当前项目结构 | `analyze` |
| `ask <问题>` | 智能提问 | `ask 什么是 TypeScript？` |
| `agents [任务]` | 多 Agent 协同 | `agents 设计REST API` |
| `ollama <问题>` | 使用本地 Ollama | `ollama 解释闭包` |
| `new` | 开始新对话 | `new` |
| `history` | 查看对话历史 | `history` |
| `exit` | 退出程序 | `exit` |

**提示**：输入任意其他内容将进入智能问答模式。

---

## Skill 系统

项目支持自定义 Skill 模块，位于 `skills/` 目录：

- `repo-auto-backup.skill.js` — 备份仓库到目标目录（示例 JS Skill）
- `batch-add-file-prefix.skill.py` — 批量给文件名加前缀（示例 Python Skill）

Skill 可以以模块形式被触发并执行复杂任务。

---

## 项目结构

```
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

## 开发指南

- 建议分支名使用 `feat/`、`fix/`、`docs/` 等前缀
- 提交前请运行 `pnpm install` 并确保基本功能可启动
- 修改代码后请运行 `pnpm run build` 重新编译

---

## 常见问题

**Q: 命令不可用？**
A: 请确认已在项目根目录执行 `pnpm install` 和 `pnpm run build`。

**Q: 本地 Ollama 无响应？**
A: 确认本地 Ollama 服务已启动并且 `.env` 中 `OLLAMA_HOST` 配置正确。

**Q: 如何添加新功能？**
A: 在 `src/assistant_modules/services/` 下创建新的服务类，并在 `assistant.ts` 中集成。

---

## License

MIT
