import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { confirmPayment, getPaymentByGatewayTxId } from '../services/payment.service.js';
import { deliverAccess } from '../services/access.service.js';
import { logLeadEvent } from '../services/lead-event.service.js';

// Extrai o código E2E (end-to-end) do payload do gateway — varia por provedor.
function extractE2E(data: any): string | null {
  return data?.end_to_end_id ?? data?.endToEndId ?? data?.e2e ?? data?.e2e_id ?? null;
}

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

  // Código E2E do PIX (defesa MED) — grava no pagamento se o gateway enviou
  const e2e = extractE2E(webhookData);
  if (e2e) await prisma.payment.update({ where: { id: pmt.id }, data: { endToEndId: e2e } }).catch(() => {});

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
  await logLeadEvent(lead.id, 'paid', { paymentId: pmt.id, amount: pmt.amount, e2e });

  // ── Entrega o acesso (config do plano sobrescreve a do fluxo) ──────────────
  const flow = lead.flowId
    ? await prisma.flow.findUnique({ where: { id: lead.flowId } })
    : null;

  // Override de entrega do passo de esteira (se a compra veio de uma oferta)
  const step = (pmt as any).funnelStepId
    ? await prisma.funnelStep.findUnique({ where: { id: (pmt as any).funnelStepId }, select: { deliveryType: true, deliveryValue: true } })
    : null;

  const { deliveryType, channelId } = await deliverAccess({
    botToken: bot.telegramBotToken,
    telegramUserId: lead.telegramUserId,
    plan: { emoji: plan.emoji, name: plan.name, days: plan.days, deliveryType: plan.deliveryType, deliveryValue: plan.deliveryValue },
    flow: flow ? { deliveryType: flow.deliveryType, channelId: flow.channelId, deliveryValue: flow.deliveryValue } : null,
    step,
  });

  await logLeadEvent(lead.id, 'access_granted', {
    type: deliveryType, channelId, days: plan.days, expiresAt: accessExpiresAt.toISOString(), planName: plan.name,
  });

  // ── Esteira: avança quem estava 'waiting' (regra onlyIfPaid) ou arma o upsell ──
  if (lead.flowId) {
    // 1) Pagou uma OFERTA pela qual a esteira aguardava → avança a sequência.
    const waiting = await prisma.funnelProgress.findFirst({ where: { leadId: lead.id, status: 'waiting' } });
    if (waiting) {
      const step = await prisma.funnelStep.findFirst({
        where: { flowId: lead.flowId, kind: waiting.kind, order: waiting.nextOrder },
        select: { sendTiming: true, delayMins: true },
      });
      if (step) {
        const sendAt = step.sendTiming === 'immediate' ? new Date() : new Date(Date.now() + (step.delayMins ?? 60) * 60_000);
        await prisma.funnelProgress.update({ where: { id: waiting.id }, data: { status: 'active', sendAt } });
      } else {
        await prisma.funnelProgress.update({ where: { id: waiting.id }, data: { status: 'done' } });
      }
    } else if (flow?.upsellEnabled) {
      // 2) Compra principal → arma o upsell (se há steps e ainda não existe progress).
      const hasUpsell = await prisma.funnelStep.count({ where: { flowId: lead.flowId, kind: 'upsell' } });
      const exists = await prisma.funnelProgress.findUnique({ where: { leadId_kind: { leadId: lead.id, kind: 'upsell' } }, select: { id: true } });
      if (hasUpsell && !exists) {
        const sendAt = new Date(Date.now() + ((flow as any).upsellDelayMins ?? 60) * 60_000);
        await prisma.funnelProgress.create({ data: { leadId: lead.id, kind: 'upsell', nextOrder: 0, sendAt, status: 'active' } })
          .catch((e: unknown) => console.error('[WEBHOOK] erro ao armar upsell:', e));
      }
    }
  }

  console.log(`[WEBHOOK] Payment confirmed and access sent: lead=${lead.id} plan=${plan.name} type=${deliveryType}`);
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
