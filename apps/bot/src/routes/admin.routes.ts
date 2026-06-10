import { FastifyInstance } from 'fastify';

// Rotas de admin — apenas para operações de manutenção (não expostas publicamente)
export async function setupAdminRoutes(fastify: FastifyInstance) {
  fastify.get('/admin/health', async () => ({
    ok: true,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV,
  }));
}
