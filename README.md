# SmallClaw — 大虾（AI 编程助手）功能演示

SmallClaw 是一个演示性质的示例工程，用于展示“大虾”AI 编程助手的核心能力：命令行交互、Web 可视化、Skill 管理、文件操作与多 Agent 协作。

**目标**：快速上手、复现演示场景，并作为二次开发的起点。

---

## 主要特性

- 双模式：`CLI`（REPL）与 `Web`（可视化）共用后端与 SQLite 存储
- 文件操作：`read` / `write` / `list` / `search`
- 系统命令：`exec`
- 智能能力：`analyze`（项目分析）、`ask`（智能问答）
- Skill 管理：可注册 JS/Python 模块 Skill（运行、编辑、管理）
- 示例集成：微信扫码演示（`wx`）、天气/新闻/邮件汇总、对话摘要（`summary`）

---

## 快速开始

先决条件：Node.js（推荐 16+ 或 18+）、`pnpm`。

1. 安装依赖：

```bash
pnpm install
pnpm run build
# 如果只想运行 Web 模式，请在 frontend 目录安装前端依赖：
cd frontend && pnpm install && cd ..
```

1. 配置（在项目根目录创建 `.env` 或复制 `.env.example`）：

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

1. 运行：

```bash
# CLI 模式（REPL）
pnpm start

# Web 模式（开发）
pnpm run web
# 或在 frontend 中使用 pnpm run dev
```

页面默认地址： <http://localhost:3000>

---

## 常用命令（示例）

- `help` — 显示帮助
- `read <文件>` — 读取文件内容，例如 `read package.json`
- `write <文件> <内容>` — 写入文件，例如 `write demo.txt 你好`
- `list [目录]` — 列出目录，例如 `list src`
- `search <关键词>` — 搜索代码，例如 `search function`
- `exec <命令>` — 执行系统命令，例如 `exec dir`
- `analyze` — 分析项目结构
- `ask <问题>` — 智能提问，例如 `ask 什么是 TypeScript？`
- `wx` — 微信扫码演示
- `summary` — 生成并保存对话摘要为 Markdown
- `agents [任务]` — 多 Agent 协同演示
- `ollama <问题>` — 使用本地 Ollama 模型回答
- `exit` — 退出

---

## Skill 示例

- `skills/repo-auto-backup.skill.js` — 备份仓库到目标目录（示例 JS Skill）
- `skills/batch-add-file-prefix.skill.py` — 批量给文件加前缀（示例 Python Skill）

Skill 可以以模块形式被触发并执行复杂任务，Web 端提供 Skill 管理面板用于查看与运行。

---

## 开发与贡献

- 建议分支名使用 `feat/`、`fix/`、`docs/` 等前缀。
- 提交前请先运行 `pnpm install` 并确保基本功能可启动。
- 修改README或使用说明时，同时更新 `README.md`。
- 提交 PR 时请描述变更与验证步骤。

想要我帮你创建 PR 或推送到远程吗？（回复“推送”即可）

---

## 常见问题

- 如果命令不可用：请确认已在项目根执行 `pnpm install`。
- Web 页面 404/无法访问：检查 `frontend` 是否已安装依赖并已构建/运行。
- 本地 Ollama 无响应：确认本地 Ollama 服务已启动并且 `OLLAMA_HOST` 配置正确。

---

## 项目结构（简要）

```
SmallClaw/
├─ src/          # 后端与 CLI 入口
├─ frontend/     # 前端应用（Vue 3 + Vite）
├─ skills/       # 可执行 Skill 示例（JS / Python）
├─ package.json
└─ README.md
```

---

## License

MIT
