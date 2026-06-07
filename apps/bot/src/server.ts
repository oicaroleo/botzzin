import Fastify from 'fastify';
import { bot } from './bot.js.js';
import { config } from './config.js.js';
import { setupPaymentWebhook } from './handlers/payment-webhook.js.js';
import { setupAuthMiddleware } from './middleware/auth.js.js';
import { setupAuthRoutes } from './routes/auth.routes.js.js';
import { setupBotsRoutes } from './routes/bots.routes.js.js';
import { setupBotConfigRoutes } from './routes/bot-config.routes.js.js';
import { setupPlansRoutes } from './routes/plans.routes.js.js';
import { setupMetricsRoutes } from './routes/metrics.routes.js.js';

export async function createServer() {
  const fastify = Fastify({
    logger: true,
  });

  // Setup autenticação
  await setupAuthMiddleware(fastify);

  // Registrar rotas de autenticação
  await setupAuthRoutes(fastify);

  // Registrar rotas de bots
  await setupBotsRoutes(fastify);

  // Registrar rotas de configuração de bots
  await setupBotConfigRoutes(fastify);

  // Registrar rotas de planos
  await setupPlansRoutes(fastify);

  // Registrar rotas de métricas
  await setupMetricsRoutes(fastify);

  // Registrar webhooks
  await setupPaymentWebhook(fastify);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // Webhook do Telegram
  fastify.post('/webhook', async (request, reply) => {
    if (request.method === 'POST') {
      try {
        await bot.handleUpdate(request.body as any);
      } catch (err) {
        console.error('[WEBHOOK ERROR]', err);
      }
    }
    reply.send({ ok: true });
  });

  // Endpoint para registrar webhook no Telegram (admin)
  fastify.post('/admin/setup-webhook', async (request, reply) => {
    try {
      const webhookUrl = `${config.telegram.webhookUrl}/webhook`;

      // Chamar setWebhook via API
      const response = await fetch(
        `https://api.telegram.org/bot${config.telegram.botToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return reply.code(400).send({ error: data });
      }

      reply.send({
        success: true,
        webhookUrl,
        message: 'Webhook registrado com sucesso!',
      });
    } catch (err) {
      console.error('[SETUP WEBHOOK ERROR]', err);
      reply.code(500).send({ error: String(err) });
    }
  });

  // Validação de saúde do servidor
  fastify.get('/info', async () => {
    const me = await bot.api.getMe();
    return {
      botUsername: me.username,
      botId: me.id,
      environment: config.server.env,
      port: config.server.port,
    };
  });

  return fastify;
}

export async function startServer() {
  const fastify = await createServer();

  try {
    await fastify.listen({ port: config.server.port, host: '0.0.0.0' });
    console.log(`[SERVER] Servidor rodando em http://0.0.0.0:${config.server.port}`);
    console.log(`[SERVER] Webhook URL: ${config.telegram.webhookUrl}/webhook`);
    console.log(`[SETUP] Para ativar o webhook, acesse: POST http://localhost:${config.server.port}/admin/setup-webhook`);
  } catch (err) {
    console.error('[START ERROR]', err);
    process.exit(1);
  }
}
