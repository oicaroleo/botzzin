import { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export async function setupWebhooksRoutes(fastify: FastifyInstance) {
  /**
   * Ativar webhook para um bot específico
   * POST /api/webhooks/setup?token=<bot_token>
   */
  fastify.post('/api/webhooks/setup', async (request, reply) => {
    try {
      const { token, botId } = request.query as { token?: string; botId?: string };

      if (!token) {
        return reply.code(400).send({ error: 'Token do bot é obrigatório (parâmetro ?token=...)' });
      }

      const webhookUrl = `${config.telegram.webhookUrl}/webhook`;

      console.log('[SETUP WEBHOOK] Setting webhook for bot:', botId);
      console.log('[SETUP WEBHOOK] Webhook URL:', webhookUrl);
      console.log('[SETUP WEBHOOK] Token:', token.substring(0, 20) + '...');

      // Chamar setWebhook via API com token do bot
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const data = (await response.json()) as any;

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
  });

  /**
   * Ativar webhook (rota alternativa /admin/setup-webhook para compatibilidade)
   */
  fastify.post('/admin/setup-webhook', async (request, reply) => {
    try {
      const { token, botId } = request.query as { token?: string; botId?: string };

      if (!token) {
        return reply.code(400).send({ error: 'Token do bot é obrigatório (parâmetro ?token=...)' });
      }

      const webhookUrl = `${config.telegram.webhookUrl}/webhook`;

      console.log('[SETUP WEBHOOK] Setting webhook for bot:', botId);
      console.log('[SETUP WEBHOOK] Webhook URL:', webhookUrl);
      console.log('[SETUP WEBHOOK] Token:', token.substring(0, 20) + '...');

      // Chamar setWebhook via API com token do bot
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const data = (await response.json()) as any;

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
  });
}
