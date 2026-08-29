# Changelog

本项目的所有显著变更记录于此，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.0.13] - 2026-08-30

### Added

- 新增 `aic data --clear`，清除本地运行数据但保留模型、API Key 和代理配置

### Fixed

- 缓存模型是否支持关闭推理，避免后续请求重复尝试不兼容的 `reasoning_effort` 参数

## [1.0.12] - 2026-08-30

### Fixed

- 对不支持自定义温度的模型不再强制发送 `temperature` 参数
- 所有模型请求默认关闭推理，并在兼容接口不支持 `reasoning_effort` 时自动回退

## [1.0.11] - 2026-08-30

### Fixed

- API 请求改用与代理调度器相同的 undici 实现，避免不同 Node 运行时之间传递 dispatcher 导致兼容错误

## [1.0.10] - 2026-08-30

### Fixed

- API 请求显式使用代理调度器，兼容不会继承外部 undici 全局调度器的 Node 运行时

## [1.0.9] - 2026-08-30

### Added

- `aic model` 配置当前模型与 OpenAI-compatible API 地址，始终只保留一组配置
- 首次运行或使用 `aic model --init` 时交互输入模型名称、API 地址和 API Key
- 默认支持标准代理环境变量，并可通过 `aic proxy --init` 管理代理
- 终端回答默认使用纯文本格式，避免 Markdown 标记影响阅读

### Removed

- 移除旧版交互式 REPL（`aic -i`）及相关文件服务、多 Agent 模块，工具回归纯单次调用形态
- 移除 Git 专用子命令；生成提交信息、代码评审等操作请通过 `git diff | aic "..."` 使用通用管道能力

## [1.0.8] - 2026-08-30

### Added

- 模型配置保存后可选择立即测试连接，并提供默认跳过的 `(y/N)` 交互
- 模型连接失败时显示 DNS、连接拒绝、超时和 TLS 等具体原因

### Fixed

- 重新配置模型时清理旧的模型配置，同时保留同一文件中的代理配置

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
