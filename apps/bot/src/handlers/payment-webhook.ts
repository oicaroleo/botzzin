import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { confirmPayment, getPaymentByGatewayTxId } from '../services/payment.service.js';
import { generateInviteLink, sendMessage } from '../services/channel.service.js';

async function processConfirmedPayment(gatewayTxId: string, webhookData: unknown) {
  const pmt = await getPaymentByGatewayTxId(gatewayTxId);
  if (!pmt) {
    console.warn('[WEBHOOK] Payment not found:', gatewayTxId);
    return;
  }

  if (pmt.status === 'paid') {
    console.log('[WEBHOOK] Payment already confirmed, skipping:', pmt.id);
    return;
  }

  await confirmPayment(gatewayTxId, webhookData);

  const lead = pmt.lead;
  const bot = lead.bot;
  const plan = pmt.plan;

  // Atualizar lead como pago
  const accessExpiresAt = new Date();
  accessExpiresAt.setDate(accessExpiresAt.getDate() + plan.days);

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'paid', paidAt: new Date(), accessExpiresAt },
  });

  // Enviar acesso
  if (bot.channelId) {
    try {
      const link = await generateInviteLink(bot.telegramBotToken, bot.channelId, plan.days);

      await sendMessage(
        bot.telegramBotToken,
        lead.telegramUserId,
        `✅ *Pagamento confirmado!*\n\n` +
          `Plano: ${plan.emoji} ${plan.name}\n` +
          `Acesso por: *${plan.days} dias*\n\n` +
          `🔗 *Seu link de acesso:*\n${link}\n\n` +
          `_Link válido por ${plan.days} dias e de uso único._`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[WEBHOOK] Erro ao gerar/enviar link de acesso:', err);
      await sendMessage(
        bot.telegramBotToken,
        lead.telegramUserId,
        '✅ Pagamento confirmado! Em breve você receberá seu acesso.'
      );
    }
  } else {
    await sendMessage(
      bot.telegramBotToken,
      lead.telegramUserId,
      '✅ Pagamento confirmado! Em breve você receberá seu acesso.'
    );
  }

  console.log(`[WEBHOOK] Payment confirmed and access sent: lead=${lead.id} plan=${plan.name}`);
}

export async function setupPaymentWebhook(fastify: FastifyInstance) {
  // Webhook real do PushinPay
  fastify.post('/webhooks/pushinpay', async (request, reply) => {
    try {
      const payload = request.body as any;
      console.log('[PUSHINPAY WEBHOOK]', { id: payload.id, status: payload.status });

      if (payload.status === 'paid' || payload.status === 'confirmed') {
        await processConfirmedPayment(payload.id, payload);
      }

      return reply.send({ ok: true });
    } catch (err) {
      console.error('[PUSHINPAY WEBHOOK ERROR]', err);
      return reply.code(500).send({ error: String(err) });
    }
  });

  // Endpoint para simular pagamento (desenvolvimento)
  fastify.post<{ Querystring: { paymentId: string } }>(
    '/webhooks/simulate',
    async (request, reply) => {
      const { paymentId } = request.query;
      if (!paymentId) return reply.code(400).send({ error: 'paymentId required' });

      try {
        const pmt = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!pmt) return reply.code(404).send({ error: 'Payment not found' });
        if (!pmt.gatewayTxId) return reply.code(400).send({ error: 'Payment has no gatewayTxId' });

        await processConfirmedPayment(pmt.gatewayTxId, { simulated: true, paymentId });

        return reply.send({ ok: true, message: 'Pagamento simulado com sucesso' });
      } catch (err) {
        console.error('[SIMULATE ERROR]', err);
        return reply.code(500).send({ error: String(err) });
      }
    }
  );
}
