# 第五章 安装及使用（SmallClaw）

## 5.1 安装环境要求

| 项目     | 要求                                                    |
| -------- | ------------------------------------------------------- |
| 操作系统 | macOS / Linux / Windows（建议具备 Node 开发环境）       |
| Node.js  | 建议 20 及以上                                          |
| 包管理器 | pnpm                                                    |
| 数据库   | SQLite（项目内置，首次运行自动创建）                    |
| 网络     | 如需云端模型，需可访问对应模型 API；本地模式可用 Ollama |

## 5.2 默认安装流程

### 5.2.1 获取项目

1. 进入项目目录（已克隆可直接进入）。

### 5.2.2 安装依赖与构建

1. 安装后端依赖：pnpm install
2. 编译后端：pnpm run build
3. 安装前端依赖：cd frontend && pnpm install && cd ..

### 5.2.3 可选模型配置

在项目根目录创建或编辑 .env，按需填写：

- MODEL_API_KEY / MODEL_API_BASE_URL / MODEL_API_MODEL
- DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL
- OLLAMA_HOST / OLLAMA_MODEL

说明：

- 默认支持 Auto 选模，优先通用 API，失败回退到 DeepSeek，再回退到 Ollama。
- 未配置云端 Key 时，可通过本地 Ollama 完成基本对话。

## 5.3 启动与运行

### 5.3.1 默认运行

- CLI 模式：pnpm start
- Web 模式：pnpm run web（前端 3000，后端 3001）

### 5.3.2 开发验证

- 后端单独启动：pnpm run server
- 健康检查：http://localhost:3001/api/health

## 5.4 典型使用流程

### 流程 A：默认安装到首次可用

```mermaid
flowchart LR
  A[克隆项目] --> B[pnpm install]
  B --> C[pnpm run build]
  C --> D[frontend/pnpm install]
  D --> E[pnpm run web]
  E --> F[浏览器打开 3000]
  F --> G[发送第一条指令]
```

### 流程 B：Skill 管理与执行

1. 打开 Web 顶部 Skill 面板。
2. 查看默认 Skill（代码审查/需求拆解/故障排查）。
3. 新建或选择模块 Skill（JS/Python）。
4. 在聊天中执行任务并观察返回结果。

### 流程 C：定时任务配置

1. 打开定时任务面板。
2. 填写频率（daily / interval / once）和命令。
3. 创建后查看任务列表与执行日志。
4. 按需启停、立即执行或删除任务。

## 5.5 常见问题（简要）

- 构建报错 tsc: command not found：先执行 pnpm install 再重新构建。
- Web 无响应：检查后端 3001 端口是否启动。
- 模型无回复：检查 .env 中 API 配置或切换到 Ollama 本地模型。

## 5.6 本章小结

SmallClaw 安装流程以 pnpm 为核心，默认步骤清晰，支持 CLI 与 Web 双入口。通过 Skill 面板和定时任务面板，用户可在首次部署后快速完成“对话、执行、编排”三类典型操作。
