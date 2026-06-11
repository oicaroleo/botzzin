import { FastifyInstance } from 'fastify';
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

      const result = await botManagementService.registerWebhook(botId, userId);
      if (!result.success) return reply.code(400).send({ error: result.error });
      return reply.send({ ok: true, webhookUrl: result.url });
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
