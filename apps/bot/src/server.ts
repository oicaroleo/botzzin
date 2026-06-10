import Fastify from 'fastify';
import { config } from './config.js';
import { prisma } from './db.js';
import { publishBotMessage } from './redis.js';
import { setupPaymentWebhook } from './handlers/payment-webhook.js';
import { setupAuthRoutes } from './routes/auth.routes.js';
import { setupBotsRoutes } from './routes/bots.routes.js';
import { setupBotConfigRoutes } from './routes/bot-config.routes.js';
import { setupPlansRoutes } from './routes/plans.routes.js';
import { setupMetricsRoutes } from './routes/metrics.routes.js';
import { setupWebhooksRoutes } from './routes/webhooks.routes.js';
import { setupAdminRoutes } from './routes/admin.routes.js';
import { setupGatewayRoutes } from './routes/gateway.routes.js';
import { setupFlowRoutes } from './routes/flow.routes.js';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.DASHBOARD_URL ? [process.env.DASHBOARD_URL] : []),
];

export async function createServer() {
  const fastify = Fastify({ logger: { level: 'warn' } });

  // CORS — deve rodar em onRequest para interceptar preflight antes do auth
  fastify.addHook('onRequest', async (req, reply) => {
    const origin = req.headers.origin as string | undefined;
    const allowed = !origin || ALLOWED_ORIGINS.includes(origin) ? (origin || '*') : '';
    if (allowed) {
      reply.header('Access-Control-Allow-Origin', allowed);
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      reply.code(204).send();
    }
  });

  await setupAuthRoutes(fastify);
  await setupAdminRoutes(fastify);
  await setupBotsRoutes(fastify);
  await setupBotConfigRoutes(fastify);
  await setupPlansRoutes(fastify);
  await setupMetricsRoutes(fastify);
  await setupWebhooksRoutes(fastify);
  await setupPaymentWebhook(fastify);
  await setupGatewayRoutes(fastify);
  await setupFlowRoutes(fastify);

  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // Recebe updates do Telegram e enfileira no Redis para o worker
  fastify.post<{ Params: { botId: string } }>('/webhook/:botId', async (request, reply) => {
    const { botId } = request.params;

    const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { id: true } });
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });

    await publishBotMessage(botId, request.body);
    return reply.send({ ok: true });
  });

  return fastify;
}

export async function startServer() {
  const fastify = await createServer();

  try {
    await fastify.listen({ port: config.server.port, host: '0.0.0.0' });
    console.log(`[SERVER] Listening on port ${config.server.port}`);
    console.log(`[SERVER] Webhook base: ${config.webhook.baseUrl}`);
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}
