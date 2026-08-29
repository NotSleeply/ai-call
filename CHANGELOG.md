# Changelog

本项目的所有显著变更记录于此，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- `aic model` 配置当前模型与 OpenAI-compatible API 地址，始终只保留一组配置
- 首次运行或使用 `aic model --init` 时交互输入模型名称、API 地址和 API Key
- 终端回答默认使用纯文本格式，避免 Markdown 标记影响阅读

### Removed

- 移除旧版交互式 REPL（`aic -i`）及相关文件服务、多 Agent 模块，工具回归纯单次调用形态
- 移除 Git 专用子命令；生成提交信息、代码评审等操作请通过 `git diff | aic "..."` 使用通用管道能力

## [1.0.0] - 2026-08-28

### Added

- 单次调用模式：`aic <问题>` 流式输出，stdout/stderr 严格分离，管道友好
- stdin 管道输入：管道内容与提问合并作为上下文
- `-x/--exec` 命令生成与确认执行，Windows 自动生成 cmd 语法
- `-c/--continue` 上下文延续，SQLite 持久化对话
- Git 快捷子命令：`commit`（生成提交信息并确认提交）、`review`（代码评审）
- 多模型自动选路（通用 API → DeepSeek → Ollama），`-p`/`-m` 强制指定
- 等待阶段 spinner 提示（仅交互终端显示）
- 用户级配置 `~/.ai-call/.env`，任意目录可用
- GitHub Actions 发布流水线：推送 tag 自动发布 npm 包与 GitHub Release
- 保留旧版交互式 REPL（`aic -i`），延迟加载
