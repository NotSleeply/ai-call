# 大虾功能演示Demo 🦐

这是一个演示大虾（AI编程助手）核心功能的Demo项目。

## 功能特性

本Demo演示了大虾的核心能力：

### 📁 文件操作

- **read** - 读取文件内容
- **write** - 写入文件内容
- **list** - 列出目录内容
- **search** - 搜索代码内容

### ⚡ 命令执行

- **exec** - 执行系统命令

### 🧠 智能分析

- **analyze** - 分析项目结构
- **ask** - 智能问答

### 💬 自然语言交互

- 支持自然语言对话
- 智能理解用户意图

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 编译项目

```bash
pnpm run build
```

### 运行Demo

```bash
pnpm start
```

## 可用命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `help` | 显示帮助信息 | `help` |
| `read <文件>` | 读取文件内容 | `read package.json` |
| `write <文件> <内容>` | 写入文件 | `write test.txt Hello` |
| `search <关键词>` | 搜索代码 | `search function` |
| `exec <命令>` | 执行命令 | `exec ls -la` |
| `analyze` | 分析项目 | `analyze` |
| `list [目录]` | 列出目录 | `list src` |
| `ask <问题>` | 智能问答 | `ask 什么是TypeScript?` |
| `wx` | 连接微信 | `wx` |
| `exit` | 退出程序 | `exit` |

## 演示场景

### 场景1：文件操作

```
> read package.json
> write demo.txt 这是一个演示文件
> list .
```

### 场景2：代码搜索

```
> search class
> search import
> search function
```

### 场景3：项目分析

```
> analyze
```

### 场景4：智能问答

```
> ask 什么是TypeScript?
> ask 大虾能做什么?
> 你好
```

### 场景5：命令执行

```
> exec dir
> exec echo Hello World
```

### 场景6：微信连接
```
> wx
```

## 项目结构

```
SmallClaw/
├── src/
│   ├── index.ts       # 主入口，REPL交互
│   └── assistant.ts   # 大虾助手核心功能
├── dist/              # 编译输出目录
├── package.json
├── tsconfig.json
└── README.md
```

## 技术栈

- **Node.js** - 运行环境
- **TypeScript** - 开发语言
- **pnpm** - 包管理器
- **fs** - 文件系统操作
- **child_process** - 命令执行

## 注意事项

⚠️ 本Demo仅用于演示目的，实际的大虾助手功能更加强大：

1. **AI能力** - 真实大虾使用大语言模型，能理解复杂需求
2. **代码生成** - 可以自动生成、修改、重构代码
3. **错误处理** - 更智能的错误诊断和修复建议
4. **多工具协作** - 整合多种开发工具和工作流
5. **上下文理解** - 理解项目整体结构和业务逻辑

## 扩展建议

你可以基于这个Demo继续扩展：

1. 添加更多文件操作（复制、移动、删除）
2. 集成真实的AI API
3. 添加代码格式化功能
4. 支持Git操作
5. 添加项目模板生成

## License

MIT
