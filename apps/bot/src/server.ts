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
import { setupWebhooksRoutes } from './routes/webhooks.routes.js';
import { getBotInstance } from './bot-factory.js';

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

  // Registrar rotas de webhooks (setup)
  await setupWebhooksRoutes(fastify);

  // Registrar webhooks de pagamento
  await setupPaymentWebhook(fastify);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // Teste webhook
  fastify.get<{ Params: { botId: string } }>('/webhook-test/:botId', async (request, reply) => {
    const { botId } = request.params;

    try {
      const botConfig = await prisma.bot.findUnique({
        where: { id: botId },
        select: { id: true, telegramBotId: true, telegramUsername: true, telegramBotToken: true },
      });

      if (!botConfig) {
        return reply.code(404).send({ error: 'Bot not found', botId });
      }

      return {
        status: 'ok',
        botId: botConfig.id,
        telegramBotId: botConfig.telegramBotId,
        telegramUsername: botConfig.telegramUsername,
        token: botConfig.telegramBotToken.substring(0, 20) + '...',
        webhookUrl: `${config.telegram.webhookUrl}/webhook/${botId}`,
      };
    } catch (err) {
      return reply.code(500).send({ error: String(err) });
    }
  });

  // Webhook específico por bot (multi-tenant)
  // Cada bot usa: POST /webhook/{botId}
  fastify.post<{ Params: { botId: string } }>('/webhook/:botId', async (request, reply) => {
    const { botId } = request.params;
    const update = request.body as any;

    try {
      console.log('[WEBHOOK] ========================================');
      console.log('[WEBHOOK] Received update for bot:', botId);
      console.log('[WEBHOOK] Update type:', update.message ? 'message' : update.callback_query ? 'callback' : 'unknown');

      // Buscar configuração do bot
      const botConfig = await prisma.bot.findUnique({
        where: { id: botId },
        include: {
          plans: {
            include: { plan: true },
            orderBy: { plan: { priority: 'asc' } },
          },
        },
      });

      if (!botConfig) {
        console.error('[WEBHOOK] Bot not found:', botId);
        return reply.code(404).send({ error: 'Bot not found' });
      }

      console.log('[WEBHOOK] Bot found:', botConfig.telegramBotId, botConfig.telegramUsername);

      // Processar manualmente sem usar factory (evita problemas de closures)
      const telegramUserId = String(update.message?.from?.id || update.callback_query?.from?.id);

      if (update.message?.text === '/start') {
        console.log('[WEBHOOK] Processing /start command for bot:', botId);

        const firstName = update.message.from?.first_name || 'Amigo';

        // Registrar lead
        const lead = await leadService.registerOrUpdateLead(botId, telegramUserId, {
          username: update.message.from?.username,
          firstName: update.message.from?.first_name,
        });

        // Montar mensagem de boas-vindas
        const welcomeMessage = botConfig.welcomeMessage ||
          `👋 Bem-vindo, ${firstName}!\n\n` +
          'Aqui você pode:\n' +
          '✅ Gerar PIX para pagamento\n' +
          '✅ Acessar conteúdo exclusivo\n' +
          '✅ Receber suporte 24/7\n\n' +
          'Escolha um plano abaixo para começar!';

        // Preparar teclado
        const plans = (botConfig.plans || []).map((bp: any) => ({
          id: bp.plan.id,
          name: bp.plan.name,
          emoji: bp.plan.emoji,
          price: bp.plan.price,
        }));

        if (plans.length > 0) {
          console.log('[WEBHOOK] Sending welcome with plans for bot:', botId);
          // TODO: Enviar via Telegram API em vez de usar bot instance
          await fetch(`https://api.telegram.org/bot${botConfig.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: update.message.chat.id,
              text: welcomeMessage,
            }),
          });
        }

        console.log('[WEBHOOK] /start processed for bot:', botId);
      }

    } catch (err) {
      console.error('[WEBHOOK ERROR]', err);
    }
    reply.send({ ok: true });
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
