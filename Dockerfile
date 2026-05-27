# syntax=docker/dockerfile:1
# ChordFlow 统一镜像：构建前后端，由后端 serve 前端静态文件

FROM node:22-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 先复制工作区配置和 lockfile，利用缓存层
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# 安装依赖（包括 workspace 链接）
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
COPY packages/frontend/ ./packages/frontend/

# 构建前后端
RUN pnpm -r run build

# ===== 生产阶段 =====
FROM node:22-alpine AS production

WORKDIR /app

# 仅复制运行所需产物
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# 后端端口
EXPOSE 3001

# 启动后端（同时 serve 前端静态文件）
CMD ["node", "packages/backend/dist/index.js"]
