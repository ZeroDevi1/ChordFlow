# ChordFlow

面向键盘（钢琴/电钢琴）初学者的练习辅助 PWA 工具。通过五度圈顺序练习、随机抽取和节拍器编排，帮助打破惯性依赖，熟悉调性连接与和弦转位。

## 功能特性

- **音阶练习** — 自然大调 / 自然小调，两个八度上下行，支持五度圈顺序和随机模式
- **和弦琶音** — 大三和弦 / 小三和弦，普通五度下行与就近连接两种模式
- **和弦转位** — 五度圈下行，每个和弦依次弹奏原位、第一转位、第二转位、高八度原位
- **节拍器** — 可调 BPM（40-208），支持基础拍 / 半拍细分 / 三连音 / 混合编排
- **五线谱渲染** — 基于 alphaTab 的大谱表显示，高音谱右手旋律 + 低音谱左手和弦

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Fastify + TypeScript |
| 共享 | pnpm workspace monorepo |
| 乐谱 | alphaTab / VexFlow |
| 部署 | Docker + GitHub Actions → GHCR |

## 快速开始

### 本地开发

```bash
# 安装依赖（需要 pnpm 8+）
pnpm install

# 启动前后端开发服务器
pnpm dev

# 单独启动
pnpm dev:frontend   # 前端 http://localhost:5173
pnpm dev:backend    # 后端 http://localhost:3001
```

### Docker 部署

```bash
# 使用在线镜像一键启动
docker-compose up -d

# 访问 http://localhost:3001
```

镜像由 GitHub Actions 自动构建并推送到 GitHub Container Registry（`ghcr.io`），推送 `v*` 标签时触发。

## 项目结构

```
ChordFlow/
├── packages/
│   ├── shared/          # 共享类型定义（音符、和弦、音阶）
│   ├── frontend/        # React 前端（Vite + alphaTab）
│   └── backend/         # Fastify 后端（静态文件服务）
├── docs/adr/            # 架构决策记录
├── .github/workflows/   # CI/CD（Docker 构建推送）
├── Dockerfile           # 多阶段构建
├── docker-compose.yml   # 服务编排
├── CONTEXT.md           # 领域上下文
└── spec.md              # MVP 产品需求
```

## 构建

```bash
# 构建全部包
pnpm build

# 代码格式化
pnpm format

# 类型检查与 Lint
pnpm lint
```

## 设备适配

主要针对 iPad Pro 11 英寸横屏设计，推荐在 Chrome 中使用以获得最佳 Web MIDI API 支持。
