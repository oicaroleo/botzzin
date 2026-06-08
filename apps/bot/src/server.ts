import Fastify from 'fastify';
import { bot } from './bot.js';
import { config } from './config.js';
import { setupPaymentWebhook } from './handlers/payment-webhook.js';
import { setupAuthMiddleware } from './middleware/auth.js';
import { setupAuthRoutes } from './routes/auth.routes.js';
import { setupBotsRoutes } from './routes/bots.routes.js';
import { setupBotConfigRoutes } from './routes/bot-config.routes.js';
import { setupPlansRoutes } from './routes/plans.routes.js';
import { setupMetricsRoutes } from './routes/metrics.routes.js';

export async function createServer() {
  const fastify = Fastify({
    logger: true,
  });

  // CORS manual - adicionar headers
  fastify.addHook('preHandler', async (request, reply) => {
    const origin = request.headers.origin;
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'https://botzzin-production.up.railway.app'];

    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (request.method === 'OPTIONS') {
      return reply.send();
    }
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

  // Webhook do Telegram - recebe updates
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

  // Webhook setup handler (extracted for reuse)
  const setupWebhookHandler = async (request: any, reply: any) => {
    try {
      const { botId, token } = request.query;

      if (!token) {
        return reply.code(400).send({ error: 'Token do bot é obrigatório (parâmetro ?token=...)' });
      }

      const webhookUrl = `${config.telegram.webhookUrl}/webhook`;

      console.log('[SETUP WEBHOOK] Setting webhook for bot:', botId);
      console.log('[SETUP WEBHOOK] Webhook URL:', webhookUrl);
      console.log('[SETUP WEBHOOK] Token:', token.substring(0, 20) + '...');

      // Chamar setWebhook via API com token do bot
      const response = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        }
      );

      const data = await response.json();

      console.log('[SETUP WEBHOOK] Telegram API response:', data);

      if (!response.ok || !data.ok) {
        return reply.code(400).send({ error: 'Erro ao configurar webhook com Telegram', details: data });
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
  };

  // Rota principal: /api/webhooks/setup (funciona corretamente com proxy)
  fastify.post<{ Querystring: { botId?: string; token?: string } }>('/api/webhooks/setup', setupWebhookHandler);

  // Rota alternativa: /admin/setup-webhook (para compatibilidade)
  fastify.post<{ Querystring: { botId?: string; token?: string } }>('/admin/setup-webhook', setupWebhookHandler);

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
