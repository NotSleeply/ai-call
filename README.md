# AI Call — 终端 AI 助手（aic）

[![npm version](https://img.shields.io/npm/v/%40notsleeply%2Fai-call-cli)](https://www.npmjs.com/package/@notsleeply/ai-call-cli)
[![license](https://img.shields.io/npm/l/%40notsleeply%2Fai-call-cli)](LICENSE)
[![node](https://img.shields.io/node/v/%40notsleeply%2Fai-call-cli)](https://nodejs.org)

## 定位与核心需求

1. **单次命令调用（One-shot First）**
   - 不进入任何交互界面，直接通过命令参数触发。
   - 例如：`aic "tar 解压到指定目录的参数是什么"` 或 `aic "检查 index.ts 中的入口函数"`。
   - 结果直接输出到当前终端，不产生多余的边框和欢迎语。

2. **原生支持 Unix 管道（Pipe-friendly）**
   - 支持从标准输入（stdin）读取内容。
   - 例如：`git diff | aic "生成一行符合规范的 commit message"`，或者 `cat error.log | aic "提取出最核心的报错原因"`。
   - 输出纯净文本，方便进一步重定向到文件或下一个命令。

3. **轻量只读项目问答**
   - 可以在当前项目内查找文件、读取文本、按正则搜索，但不会执行命令或修改文件。
   - 每次只调用一个工具，最多调用 3 次；需要操作时只给出建议，由用户自行执行。

4. **无缝上下文延续（可选 Context）**
   - 默认无状态，保证极速响应。
   - 需要追问时，加 `-c`（continue）自动附带上一条命令的上下文，不需要开一个专门的会话窗口。


**特性**：

- ⚡ 单次调用为主，`aic <问题>` 即问即走，按需调用本地只读工具
- 🔗 管道友好：stdin 内容与提问合并，回答纯净可继续管道
- 🔒 只读访问本地项目，命令和文件修改由用户自行执行
- 💬 `-c` 上下文延续，自动带上一次对话（SQLite 持久化）
- 🧩 标准输入组合：git diff、日志等文本都可以通过管道交给 `aic` 分析
- 🧠 单一 OpenAI-compatible API 配置，DeepSeek、OpenAI、OpenRouter 等统一接入
- ⚙️ `aic model` 配置当前模型与 API 地址，始终只保留一组配置

---

## 安装

**先决条件**：Node.js 20+。

```bash
# 方式一：npm 全局安装（发布版）
npm install -g @notsleeply/ai-call-cli

# 方式二：源码安装
pnpm install
pnpm run build
npm link
```

---

## 配置

**首次使用或切换模型**：

```bash
aic model deepseek-chat --base-url https://api.deepseek.com/v1
```

命令会在交互终端中提示输入 API Key，输入内容不会回显，并保存到用户级 `~/.ai-call/.env`。已有 Key 时直接回车即可保留；不要把 Key 写进命令行参数。`aic model` 可查看当前模型、API 地址和脱敏后的 Key。

只支持 OpenAI-compatible Chat Completions API。模型名称不能用来自动推断 API 地址，因此切换服务时必须明确提供 `--base-url`。DeepSeek、OpenAI、OpenRouter、Moonshot 等服务只需填写各自的 API 地址和模型名，不再单独选择提供方。配置按以下顺序读取（前面的优先）：

1. 当前目录的 `.env`
2. 用户级 `~/.ai-call/.env`（任意目录可用 `aic`）

在管道或 CI 等非交互环境中，API Key 请通过环境变量 `AIC_API_KEY` 或配置文件提供。

可复制 `.env.example` 起步：

```bash
# OpenAI-compatible API（OpenAI、DeepSeek、OpenRouter 等）
AIC_API_KEY=你的Key
AIC_BASE_URL=https://api.openai.com/v1
AIC_MODEL=gpt-5-mini
```

---

## 使用方式

### 单次问答

```bash
aic "tar 解压 tar.gz 的命令是什么"
```

回答输出到 stdout，问完即退，无欢迎语、无边框。

### 管道输入

```bash
git diff | aic "生成一行符合规范的 commit message"
cat error.log | aic "总结最核心的报错原因"
echo "hello" | aic          # 直接处理管道内容
```

管道内容会作为上下文与提问合并；回答只进 stdout，可直接重定向或继续管道。

### 本地项目查询

```bash
aic "检查项目测试是否通过，并指出失败原因"
```

AI Call 只能查找文件、读取文本和按正则搜索，不会执行命令，也不会修改项目文件。如果用户要求修复或执行操作，AI Call 只会返回建议命令、补丁或操作步骤，由用户自行确认和执行。

### 上下文延续（-c）

```bash
aic "用一句话解释这个报错"
aic -c "换一种说法"
```

`-c` 自动带上一次对话的上下文（最近 12 条），无需打开会话窗口。

### Git diff 管道示例

```bash
git diff | aic "生成一行符合规范的 commit message"
git diff --cached | aic "生成一行符合规范的 commit message，并强调性能优化"
git diff HEAD | aic "检查这次改动是否有明显问题"
```

这里的 `git diff | aic` 只是标准输入能力的一个演示，不是 `aic` 专有的 Git 功能。由用户决定把哪一份 diff 传给 `aic`，`aic` 只负责分析输入并输出回答。

### 完整参数

| 参数 | 说明 |
| --- | --- |
| `-c, --continue` | 带上一次对话的上下文 |
| `--base-url <地址>` | 设置模型配置中的 OpenAI-compatible API 地址（model 子命令） |
| `--no-stream` | 使用完整响应输出（本地查询循环默认使用完整响应） |
| `-h, --help` / `-v, --version` | 帮助 / 版本 |

### 输出约定与退出码

- 回答输出到 **stdout**，错误与状态提示输出到 **stderr**，管道不被污染
- 退出码：`0` 成功，`1` 出错

---

## 项目结构

```
ai-call/
├── src/
│   ├── index.ts                    # 入口：参数路由
│   └── app/
│       ├── args.ts                 # 参数解析与帮助文本
│       ├── one-shot.ts             # 单次问答（stdin 合并、历史加载、持久化）
│       ├── model.ts                # aic model 模型配置
│       ├── tty.ts                  # API Key 输入与转圈提示
│       └── assistant.ts            # 助手门面
├── src/core/
│   ├── ai/openClawClient.ts        # OpenAI-compatible 客户端与 tool_calls
│   ├── agent/
│       ├── runtime.ts              # 只读查询循环与工具调用
│       └── tools.ts                # 文件查找、读取、正则搜索工具
│   └── database/index.ts           # SQLite 数据库
├── .github/workflows/release.yml   # 打 tag 自动发 npm 包与 GitHub Release
├── data/                           # 数据文件（SQLite 数据库等）
├── package.json
├── tsconfig.json
└── .env.example
```

---

## QA常见问题

**Q: 为什么做这个项目？**

A: 两个痛点。一是很多 AI 编程助手把 TUI/REPL 做得很「重」：启动慢、输出带边框横幅，人在终端里工作流被打断，为了一句「tar 解压参数是什么」也得开一个会话。二是 Claude Code 这类 Agent 已经很强，但它定位是接管整个项目，而终端里大量问题是小、快、即问即走型的。我们想要一个符合 Unix 哲学的工具：一次调用、支持管道、用完即退，像 `grep`、`jq` 一样融进日常命令流。

**Q: 已经有 Claude Code / Copilot 了，为什么还要 AI Call？**

A: 定位不同，不是替代关系。Claude Code 是项目级 Agent，负责多文件改造、测试、调试这种长任务；AI Call 是终端级「外脑」，解决高频小问题：记不住命令、快速解释报错、通过管道生成 commit message、代码评审。AI Call 只保留轻量、只读的本地查询工具，并限制工具调用次数和项目路径。两者配合使用：复杂任务交给项目级 Agent，日常小任务交给 AI Call。

**Q: AI Call 的优势是什么？**

A:

- **轻**：无 TUI、无横幅，`aic "..."` 一行即答，等待期有转圈提示
- **纯**：回答只进 stdout，管道可直接接续（`git diff | aic "写 commit message"`），脚本友好
- **安全**：只读访问项目文件；有工具次数、敏感文件和项目路径边界
- **自由**：模型不锁定厂商，所有 OpenAI-compatible 服务共用一套配置
- **低依赖**：只装 Node，配置一个 `.env` 就能跑

**Q: 和 `claude -p`、`gh copilot` 这类命令有什么不同？**

A: 目标场景类似但侧重不同。AI Call 的差异化在三点：stdout/stderr 严格分离保证管道纯净；只读查询本地项目；可以把 Git diff、日志等已有命令的输出直接交给模型分析。另外不绑定任何单一模型厂商。

**Q: 命令不可用？**
A: 确认已执行 `pnpm install`、`pnpm run build`、`npm link`。

**Q: 提示 API 401 / 找不到 Key？**
A: 检查 `.env` 或 `~/.ai-call/.env` 是否配置了 `AIC_API_KEY`、`AIC_BASE_URL` 和 `AIC_MODEL`，也可以运行 `aic model` 查看脱敏后的当前配置。

**Q: `aic` 在非项目目录用不了模型？**
A: 把密钥配置放到用户级 `~/.ai-call/.env` 即可在任意目录使用。

**Q: 数据库报原生绑定错误？**
A: Node 版本变更后需 `pnpm rebuild better-sqlite3`；持久化失败不影响问答主流程。

---

## 参与与许可证

- 贡献：见 [CONTRIBUTING.md](CONTRIBUTING.md)
- 行为准则：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 安全漏洞报告：[SECURITY.md](SECURITY.md)
- 变更记录：[CHANGELOG.md](CHANGELOG.md)
- 许可证：[MIT](LICENSE)

---
