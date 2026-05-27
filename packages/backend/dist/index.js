import Fastify from 'fastify';
import cors from '@fastify/cors';
const fastify = Fastify({
    logger: true
});
// 注册 CORS 插件
await fastify.register(cors, {
    origin: true
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
// 启动服务器
const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        fastify.log.info(`服务器运行在 http://localhost:3001`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map