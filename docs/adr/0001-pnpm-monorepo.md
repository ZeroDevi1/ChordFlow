# 0001: pnpm workspace monorepo 结构

使用 pnpm workspace 将前端、后端、共享类型组织在同一个仓库中。选择 monorepo 而非独立仓库，是因为键盘练习工具的前后端共享大量音乐理论类型定义（音符、和弦、拍号、练习配置等），单仓库可以保证类型一致性，避免重复定义。选择 pnpm 而非 npm/yarn 的 workspaces，是因为 pnpm 的磁盘效率更高、依赖隔离更严格。

**Considered Options**: 独立仓库（frontend + backend 分开）、Turborepo monorepo（带统一构建管道）。

**Consequences**: 共享类型变更时前后端同时生效；但需要 pnpm 作为包管理器，CI 环境需要预装 pnpm。
