# syntax=docker/dockerfile:1
# ChordFlow 统一镜像：多阶段构建，生产阶段仅保留生产依赖与构建产物

# ===== 构建阶段 =====
FROM node:22-alpine AS builder

# 安装仓库固定的 pnpm 版本
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# 先复制工作区配置和 lockfile，利用缓存层
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# 利用 pnpm fetch 预先下载所有依赖到虚拟存储，不依赖源码即可缓存
RUN pnpm fetch

# 安装依赖（包括 workspace 链接），使用已缓存的虚拟存储
RUN pnpm install --frozen-lockfile --offline

# 复制源码
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
COPY packages/frontend/ ./packages/frontend/

# 构建前后端（按 workspace 依赖顺序）
RUN pnpm -r run build

# ===== 生产阶段 =====
FROM node:22-alpine AS production

WORKDIR /app

# 安装 pnpm（用于安装生产依赖）
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# 复制工作区配置（pnpm 需要这些来正确解析 workspace 包）
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# 复制各包的构建产物
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist

# 预下载依赖到全局 store，使 --offline 可命中缓存
RUN pnpm fetch

# 仅安装生产依赖
# npm_config_minimum_release_age=0 跳过 supply-chain 发布时间校验
ENV npm_config_minimum_release_age=0
RUN pnpm install --frozen-lockfile --prod --offline

# 后端端口
EXPOSE 3001

# 健康检查（复用容器内的 Node.js，无需额外安装 wget/curl）
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "const{get}=require('http');get('http://localhost:3001/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# 启动后端（同时 serve 前端静态文件）
CMD ["node", "packages/backend/dist/index.js"]
