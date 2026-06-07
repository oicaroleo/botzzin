import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { botManagementService, BotCreateInput, BotUpdateInput } from '../services/bot-management.service.js';
import { requireAuth } from '../middleware/auth.js';

export async function setupBotsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/bots
   * Criar novo bot
   */
  fastify.post<{ Body: BotCreateInput }>(
    '/api/bots',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { telegramBotToken, name } = request.body as BotCreateInput;

        if (!telegramBotToken) {
          return reply.code(400).send({
            error: 'Token Telegram é obrigatório',
          });
        }

        const bot = await botManagementService.createBot(userId, {
          telegramBotToken,
          name,
        });

        return reply.code(201).send(bot);
      } catch (error: any) {
        console.error('[BOT CREATE ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao criar bot',
        });
      }
    }
  );

  /**
   * GET /api/bots
   * Listar bots do usuário
   */
  fastify.get(
    '/api/bots',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;

        const bots = await botManagementService.listBots(userId);

        return reply.send({
          bots,
          total: bots.length,
        });
      } catch (error: any) {
        console.error('[BOT LIST ERROR]', error);

        return reply.code(500).send({
          error: error.message || 'Erro ao listar bots',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId
   * Obter detalhes de um bot
   */
  fastify.get<{ Params: { botId: string } }>(
    '/api/bots/:botId',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };

        const bot = await botManagementService.getBot(botId, userId);

        return reply.send(bot);
      } catch (error: any) {
        console.error('[BOT GET ERROR]', error);

        return reply.code(404).send({
          error: error.message || 'Bot não encontrado',
        });
      }
    }
  );

  /**
   * PATCH /api/bots/:botId
   * Atualizar bot
   */
  fastify.patch<{ Params: { botId: string }; Body: BotUpdateInput }>(
    '/api/bots/:botId',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const data = request.body as BotUpdateInput;

        const bot = await botManagementService.updateBot(botId, userId, data);

        return reply.send(bot);
      } catch (error: any) {
        console.error('[BOT UPDATE ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao atualizar bot',
        });
      }
    }
  );

  /**
   * DELETE /api/bots/:botId
   * Deletar bot
   */
  fastify.delete<{ Params: { botId: string } }>(
    '/api/bots/:botId',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };

        await botManagementService.deleteBot(botId, userId);

        return reply.send({
          ok: true,
          message: 'Bot deletado com sucesso',
        });
      } catch (error: any) {
        console.error('[BOT DELETE ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao deletar bot',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/webhook-status
   * Obter status do webhook
   */
  fastify.get<{ Params: { botId: string } }>(
    '/api/bots/:botId/webhook-status',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };

        const status = await botManagementService.getWebhookStatus(botId, userId);

        return reply.send(status);
      } catch (error: any) {
        console.error('[BOT WEBHOOK STATUS ERROR]', error);

        return reply.code(500).send({
          error: error.message || 'Erro ao verificar webhook',
        });
      }
    }
  );
}
