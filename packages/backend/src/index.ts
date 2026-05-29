import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 证书路径：优先使用环境变量，否则使用默认路径
const certPath = process.env.TLS_CERT_PATH || join(__dirname, '../../certs/cert.pem');
const keyPath = process.env.TLS_KEY_PATH || join(__dirname, '../../certs/key.pem');

// 检测证书是否存在，存在则启用 HTTPS
const hasCerts = existsSync(certPath) && existsSync(keyPath);

const fastify = Fastify({
  logger: true,
  ...(hasCerts && {
    https: {
      cert: readFileSync(certPath),
      key: readFileSync(keyPath),
    }
  })
});

// 注册 CORS 插件
await fastify.register(cors, {
  origin: true
});

// 注册静态文件服务（用于托管前端构建产物）
await fastify.register(fastifyStatic, {
  root: join(__dirname, '../../frontend/dist'),
  prefix: '/'
});

// 健康检查路由
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// 练习配置路由
fastify.get('/api/presets', async () => {
  // TODO: 从数据库获取练习配置
  return { presets: [] };
});

// 练习记录路由
fastify.get('/api/records', async () => {
  // TODO: 从数据库获取练习记录
  return { records: [] };
});

// 兜底路由：SPA 刷新时返回 index.html
fastify.setNotFoundHandler(async (_request, reply) => {
  await reply.sendFile('index.html');
});

// 启动服务器
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    const proto = hasCerts ? 'https' : 'http';
    fastify.log.info(`服务器运行在 ${proto}://localhost:3001`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
