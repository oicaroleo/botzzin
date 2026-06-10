import { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { botManagementService } from '../services/bot-management.service.js';

export async function setupWebhooksRoutes(fastify: FastifyInstance) {
  // POST /api/bots/:botId/webhook/register
  fastify.post<{ Params: { botId: string } }>(
    '/api/bots/:botId/webhook/register',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { botId } = request.params;

      const bot = await prisma.bot.findFirst({
        where: { id: botId, userId },
        select: { telegramBotToken: true },
      });
      if (!bot) return reply.code(404).send({ error: 'Bot não encontrado' });

      const webhookUrl = `${config.webhook.baseUrl}/webhook/${botId}`;

      const res = await fetch(
        `https://api.telegram.org/bot${bot.telegramBotToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
        }
      );
      const data = await res.json() as any;

      if (!data.ok) return reply.code(400).send({ error: data.description });
      return reply.send({ ok: true, webhookUrl });
    }
  );

  // GET /api/bots/:botId/webhook/status
  fastify.get<{ Params: { botId: string } }>(
    '/api/bots/:botId/webhook/status',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { botId } = request.params;
      const status = await botManagementService.getWebhookStatus(botId, userId);
      return reply.send(status);
    }
  );
}
