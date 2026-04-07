# HEARTBEAT.md

# ClawBoard 项目自动迭代任务
# 每天凌晨 4:00 开始执行，到 5:00 或完成一个版本后停止

## 任务规则
- 每天 4:00 自动开始
- 创建新 Issue（基于竞品分析或功能规划）
- 创建分支 → 开发 → PR → 合并 → 更新 README
- 5:00 自动停止，未完成的版本顺延到第二天

## 执行流程
1. 检查现有 Issue 完成状态
2. 研究竞品（CopyQ, Maccy, Ditto 等）新功能
3. 创建新 Issue
4. 创建分支开发
5. 提交 PR 并合并
6. 更新 README 版本日志
7. 关闭已完成的 Issue

## 当前项目
- 仓库: NotSleeply/ClawBoard
- 最新版本: v0.22.0
