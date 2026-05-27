# 0002: Fastify 作为后端框架

选择 Fastify 而非 Express 或 NestJS 作为 Node.js 后端框架。Fastify 原生支持 TypeScript，无需额外的类型适配层；其插件系统和生命周期钩子比 Express 更结构化；性能基准测试中吞吐量约为 Express 的 2-3 倍。对于这个个人练习工具的轻量后端（用户认证、练习配置 CRUD、进度同步），Fastify 的简洁 API 和低开销比 NestJS 的企业级抽象更合适。

**Considered Options**: Express（生态最丰富、社区最大）、NestJS（企业级框架、装饰器风格类似 Spring Boot）。

**Consequences**: 部分 Express 中间件需要 Fastify 适配插件（如 @fastify/cors）；团队成员如果只熟悉 Express 需要学习 Fastify 的插件系统。
