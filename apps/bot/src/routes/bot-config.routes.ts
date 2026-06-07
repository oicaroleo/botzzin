import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { botConfigService, BotConfigInput } from '../services/bot-config.service.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export async function setupBotConfigRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/bots/:botId/config
   * Obter configuração do bot
   */
  fastify.get<{ Params: { botId: string } }>(
    '/api/bots/:botId/config',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };

        const config = await botConfigService.getConfig(botId, userId);

        return reply.send(config);
      } catch (error: any) {
        console.error('[BOT CONFIG GET ERROR]', error);

        return reply.code(404).send({
          error: error.message || 'Configuração não encontrada',
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/config
   * Atualizar configuração do bot
   */
  fastify.post<{ Params: { botId: string }; Body: BotConfigInput }>(
    '/api/bots/:botId/config',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const data = request.body as BotConfigInput;

        const config = await botConfigService.updateConfig(botId, userId, data);

        return reply.send(config);
      } catch (error: any) {
        console.error('[BOT CONFIG UPDATE ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao atualizar configuração',
        });
      }
    }
  );

  /**
   * PATCH /api/bots/:botId/config
   * Atualizar parcialmente a configuração
   */
  fastify.patch<{ Params: { botId: string }; Body: Partial<BotConfigInput> }>(
    '/api/bots/:botId/config',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const data = request.body as Partial<BotConfigInput>;

        const config = await botConfigService.updateConfig(botId, userId, data);

        return reply.send(config);
      } catch (error: any) {
        console.error('[BOT CONFIG PATCH ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao atualizar configuração',
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/config/media
   * Upload/atualizar mídia de boas-vindas
   */
  fastify.post<{ Params: { botId: string }; Body: { mediaUrl: string } }>(
    '/api/bots/:botId/config/media',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const { mediaUrl } = request.body as { mediaUrl: string };

        if (!mediaUrl) {
          return reply.code(400).send({
            error: 'mediaUrl é obrigatória',
          });
        }

        const config = await botConfigService.updateMedia(botId, userId, mediaUrl);

        return reply.send(config);
      } catch (error: any) {
        console.error('[BOT CONFIG MEDIA ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao atualizar mídia',
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/config/test-webhook
   * Testar webhook
   */
  fastify.post<{ Params: { botId: string } }>(
    '/api/bots/:botId/config/test-webhook',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const webhookUrl = (request.body as any).webhookUrl || process.env.WEBHOOK_URL;

        if (!webhookUrl) {
          return reply.code(400).send({
            error: 'webhookUrl é obrigatória',
          });
        }

        // Buscar token do bot
        const bot = await prisma.bot.findFirst({
          where: { id: botId, userId },
        });

        if (!bot) {
          return reply.code(404).send({
            error: 'Bot não encontrado',
          });
        }

        const result = await botConfigService.testWebhook(
          bot.telegramBotToken,
          `${webhookUrl}/webhook`
        );

        return reply.send(result);
      } catch (error: any) {
        console.error('[BOT WEBHOOK TEST ERROR]', error);

        return reply.code(500).send({
          error: error.message || 'Erro ao testar webhook',
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/config/register-webhook
   * Registrar webhook no Telegram
   */
  fastify.post<{ Params: { botId: string } }>(
    '/api/bots/:botId/config/register-webhook',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const webhookUrl = (request.body as any).webhookUrl || process.env.WEBHOOK_URL;

        if (!webhookUrl) {
          return reply.code(400).send({
            error: 'webhookUrl é obrigatória',
          });
        }

        // Buscar token do bot
        const bot = await prisma.bot.findFirst({
          where: { id: botId, userId },
        });

        if (!bot) {
          return reply.code(404).send({
            error: 'Bot não encontrado',
          });
        }

        const result = await botConfigService.registerWebhook(
          bot.telegramBotToken,
          `${webhookUrl}/webhook`
        );

        if (!result.success) {
          return reply.code(400).send(result);
        }

        return reply.send(result);
      } catch (error: any) {
        console.error('[BOT WEBHOOK REGISTER ERROR]', error);

        return reply.code(500).send({
          error: error.message || 'Erro ao registrar webhook',
        });
      }
    }
  );
}
