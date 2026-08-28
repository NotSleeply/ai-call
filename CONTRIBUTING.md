# 贡献指南

感谢你对 AI Call 的兴趣。这份文档说明如何参与开发。

## 环境准备

- Node.js 20+（开发使用 22+）
- pnpm 11

```bash
pnpm install
pnpm build      # 编译 TypeScript
node dist/index.js --help   # 本地验证
```

## 开发约定

- 源码在 `src/`，构建产物 `dist/`（已 gitignore，不要提交）
- 所有用户可见的提示文本必须保持「stdout 只有回答、stderr 只有状态与错误」的约定
- 新增命令名/提示文本统一引用 `src/app/args.ts` 中的 `CLI_NAME` 常量
- 提交信息使用约定式提交（`feat:` / `fix:` / `docs:` / `ci:` / `chore:` 等）

## 提交 PR 流程

1. Fork 本仓库并创建功能分支
2. 完成修改后运行 `pnpm build` 确保编译通过
3. 补充或更新 README 中的相关文档
4. 提交 PR，填写模板中的各项内容

## 新功能建议

终端工具的功能应遵循「小而快」的原则：单次调用、管道友好、无 TUI 负担。提交新命令前，先考虑它能否与现有命令组合实现，或先开 issue 讨论。

## 测试

项目目前没有自动化测试套件。手动验证时建议覆盖：

- 非 TTY 管道模式：`echo test | node dist/index.js "..."`，stderr 必须为空
- `-x`、`commit`、`review` 在无控制台环境下的取消路径（退出码 2）
