# AI Call — 终端 AI 助手（aic）

## 定位与核心需求

1. **单次命令调用（One-shot First）**
   - 不进入任何交互界面，直接通过命令参数触发。
   - 例如：`aic "tar 解压到指定目录的参数是什么"` 或 `aic -f index.ts "帮我把这个函数转成 async"`。
   - 结果直接流式打在当前终端，不产生多余的边框和欢迎语。

2. **原生支持 Unix 管道（Pipe-friendly）**
   - 支持从标准输入（stdin）读取内容。
   - 例如：`git diff | aic "生成一行符合规范的 commit message"`，或者 `cat error.log | aic "提取出最核心的报错原因"`。
   - 输出纯净文本，方便进一步重定向到文件或下一个命令。

3. **Shell 命令生成与安全确认执行**
   - 终端里最高频的痛点是记不住复杂命令（如 find、ffmpeg、docker、git 等）。
   - 提供执行标志（如 `aic -x "找出占用 8080 端口的进程并杀掉"`），AI 生成精准命令，按下回车直接运行，按取消即放弃。

4. **无缝上下文延续（可选 Context）**
   - 默认无状态，保证极速响应。
   - 需要追问时，加 `-c`（continue）自动附带上一条命令的上下文，不需要开一个专门的会话窗口。


**特性**：

- ⚡ 单次调用为主，`aic <问题>` 即问即走，流式输出
- 🔗 管道友好：stdin 内容与提问合并，回答纯净可继续管道
- 🛠️ `-x` 命令生成 + 确认执行，支持交互确认与 `-y` 跳过
- 💬 `-c` 上下文延续，自动带上一次对话（SQLite 持久化）
- 🐙 Git 快捷子命令：`aic commit`（生成提交信息并提交）、`aic review`（代码评审）
- 🧠 多模型自动选路：通用 API → DeepSeek → Ollama，可用 `-p`/`-m` 强制指定
- 🖥️ 旧版交互式 REPL 保留（`aic -i`），按需加载

---

## 安装

**先决条件**：Node.js 20+、pnpm。

```bash
pnpm install
pnpm run build

# 链接为全局命令（aic）
npm link
```

---

## 配置

模型配置按以下顺序读取（前面的优先）：

1. 当前目录的 `.env`
2. 用户级 `~/.ai-call/.env`（任意目录可用 `aic`）

可复制 `.env.example` 起步：

```bash
# 通用 API（优先级最高，兼容 OpenRouter/OpenAI 等 OpenAI 格式服务）
MODEL_API_KEY=你的Key
MODEL_API_MODEL=gpt-5-mini
MODEL_API_BASE_URL=https://openrouter.ai/api/v1

# DeepSeek
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 本地 Ollama
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:latest
```

自动模式下模型选路顺序：`MODEL_API_*` → `DEEPSEEK_*` → 本地 `OLLAMA_*`。未配置任何外部 Key 时可仅用本地 Ollama。

---

## 使用方式

### 单次问答

```bash
aic "tar 解压 tar.gz 的命令是什么"
```

回答流式输出到 stdout，问完即退，无欢迎语、无边框。

### 管道输入

```bash
git diff | aic "生成一行符合规范的 commit message"
cat error.log | aic "总结最核心的报错原因"
echo "hello" | aic          # 直接处理管道内容
```

管道内容会作为上下文与提问合并；回答只进 stdout，可直接重定向或继续管道。

### 命令生成与确认执行（-x）

```bash
aic -x "找出占用 8080 端口的进程并杀掉"
```

AI 生成命令后展示并询问 `执行? [y/N]`，输入 y 执行，其他取消。Windows 下自动生成 cmd 语法（`dir`/`tasklist`），Linux/macOS 生成 bash。

### 上下文延续（-c）

```bash
aic "用一句话解释这个报错"
aic -c "换一种说法"
```

`-c` 自动带上一次对话的上下文（最近 12 条），无需打开会话窗口。

### Git 快捷子命令

```bash
aic commit              # 读取改动生成约定式提交信息，确认后提交
aic commit -y           # 跳过确认直接提交
aic commit "强调性能优化"  # 附加生成要求
aic review              # 评审未提交的改动
aic review src/app      # 只评审指定路径
```

`commit` 有暂存改动时只提交暂存内容，否则自动暂存已跟踪文件（不含未跟踪文件）。

### 交互式 REPL（旧模式）

```bash
aic -i
```

### 完整参数

| 参数 | 说明 |
| --- | --- |
| `-p, --provider <名>` | 模型提供方：`auto` \| `deepseek` \| `api` \| `ollama`（默认 auto） |
| `-m, --model <名>` | 指定模型名，覆盖 `.env` 配置 |
| `-x, --exec` | 生成命令并确认后执行 |
| `-c, --continue` | 带上一次对话的上下文 |
| `-y, --yes` | 跳过确认直接执行（commit 子命令） |
| `--no-stream` | 禁用流式输出，一次返回完整回答 |
| `-i, --interactive` | 进入交互式 REPL |
| `-h, --help` / `-v, --version` | 帮助 / 版本 |

### 输出约定与退出码

- 回答输出到 **stdout**，错误与状态提示输出到 **stderr**，管道不被污染
- 退出码：`0` 成功或用户取消，`1` 出错，`2` 无法读取确认输入

---

## 项目结构

```
ai-call/
├── src/
│   ├── index.ts                    # 入口：参数路由
│   └── app/
│       ├── args.ts                 # 参数解析与帮助文本
│       ├── one-shot.ts             # 单次问答（stdin 合并、历史加载、持久化）
│       ├── exec.ts                 # -x 命令生成与确认执行
│       ├── git-commands.ts         # commit / review 子命令
│       ├── tty.ts                  # 终端确认输入（管道占用时读 CONIN$//dev/tty）
│       ├── assistant.ts            # 助手门面
│       └── cli.ts                  # 旧版 REPL（aic -i）
├── src/core/
│   ├── ai/openClawClient.ts        # 模型客户端（多 provider、流式 SSE/NDJSON）
│   ├── database/index.ts           # SQLite 数据库
│   └── services/                   # 文件服务、多 Agent 协同
├── data/                           # 数据文件（SQLite 数据库等）
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 常见问题

**Q: 命令不可用？**
A: 确认已执行 `pnpm install`、`pnpm run build`、`npm link`。

**Q: 提示 API 401 / 找不到 Key？**
A: 检查 `.env` 或 `~/.ai-call/.env` 是否配置了 `MODEL_API_KEY` 等；也可用 `-p` 强制指定已配置的提供方。

**Q: 本地 Ollama 无响应？**
A: 确认 Ollama 服务已启动且 `OLLAMA_HOST` 配置正确，可先 `ollama pull qwen3`。

**Q: `aic` 在非项目目录用不了模型？**
A: 把密钥配置放到用户级 `~/.ai-call/.env` 即可在任意目录使用。

**Q: 数据库报原生绑定错误？**
A: Node 版本变更后需 `pnpm rebuild better-sqlite3`；持久化失败不影响问答主流程。

---
