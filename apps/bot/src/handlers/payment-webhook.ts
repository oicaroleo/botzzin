import { FastifyInstance } from 'fastify';
import { paymentService } from '../services/payment.service';
import { leadService } from '../services/lead.service';
import { channelService } from '../services/channel.service';
import { bot } from '../bot';
import { prisma } from '../db';

export async function setupPaymentWebhook(fastify: FastifyInstance) {
  /**
   * Webhook do PushinPay para confirmação de pagamento
   */
  fastify.post('/webhooks/pushpay', async (request, reply) => {
    try {
      const payload = request.body as any;

      console.log('[PUSHPAY WEBHOOK]', {
        transactionId: payload.id,
        status: payload.status,
        amount: payload.amount,
      });

      // Validar que é um pagamento confirmado
      if (payload.status !== 'paid' && payload.status !== 'confirmed' && payload.status !== 'created') {
        return reply.send({ ok: true });
      }

      // Buscar pagamento no banco
      const payment = await paymentService.getPaymentByGatewayTxId(payload.id);

      if (!payment) {
        console.warn('[PUSHPAY WEBHOOK] Payment not found:', payload.id);
        return reply.send({ ok: true });
      }

      // Confirmar pagamento
      await paymentService.confirmPayment(payload.id, payload);

      // Atualizar lead
      const lead = await leadService.getLeadById(payment.leadId);
      if (lead) {
        await leadService.recordPaymentConfirmed(lead.id, payment.id);

        // Obter configuração do bot
        const botConfig = await prisma.bot.findUnique({
          where: { id: payment.lead.botId },
        });

        // Gerar link de convite com expiração baseada no plano
        const planDays = lead.planDays || 30;

        // Usar canal ID da configuração ou fallback
        const channelId = botConfig?.defaultChannelId || -3966757980;

        const inviteLink = await channelService.generateInviteLink(planDays, channelId);

        // Calcular data de expiração
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + planDays);

        // Atualizar lead com link de convite
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            inviteLink,
            inviteLinkExpires: expirationDate,
          },
        });

        // Registrar comprovante de entrega
        await prisma.delivery.create({
          data: {
            leadId: lead.id,
            channelLink: inviteLink,
            channelType: 'private_channel',
            metadata: {
              planDays,
              status: 'sent',
            },
          },
        });

        // Enviar link de convite para o user
        const sent = await channelService.sendInviteLinkToUser(
          lead.telegramUserId,
          inviteLink,
          planDays
        );

        if (sent) {
          console.log('[PAYMENT WEBHOOK] Acesso liberado para:', lead.telegramUserId);
        } else {
          console.error('[PAYMENT WEBHOOK] Falha ao enviar link para:', lead.telegramUserId);
        }
      }

      console.log('[PUSHPAY WEBHOOK] Payment confirmed:', payment.id);
      return reply.send({ ok: true });
    } catch (error) {
      console.error('[PUSHPAY WEBHOOK ERROR]', error);
      return reply.code(500).send({ error: String(error) });
    }
  });

  /**
   * Endpoint para SIMULAR pagamento (testes)
   * POST /webhooks/simulate?paymentId=abc123
   */
  fastify.post('/webhooks/simulate', async (request, reply) => {
    try {
      const { paymentId } = request.query as { paymentId: string };

      if (!paymentId) {
        return reply.code(400).send({ error: 'paymentId obrigatório' });
      }

      console.log('[SIMULATE] Simulando pagamento para:', paymentId);

      // Buscar pagamento
      const payment = await paymentService.getPaymentById(paymentId);

      if (!payment) {
        return reply.code(404).send({ error: 'Pagamento não encontrado' });
      }

      // Simular webhook do PushinPay
      const simulatedPayload = {
        id: payment.gatewayTxId || paymentId,
        status: 'paid', // Simulando como pago
        amount: payment.amount,
        qr_code: payment.qrCode,
      };

      console.log('[SIMULATE] Payload:', simulatedPayload);

      // Chamar o mesmo handler do webhook real
      const webhookRequest = {
        body: simulatedPayload,
      };

      // Simular a confirmação de pagamento
      await paymentService.confirmPayment(
        simulatedPayload.id,
        simulatedPayload
      );

      const lead = await leadService.getLeadById(payment.leadId);
      if (lead) {
        await leadService.recordPaymentConfirmed(lead.id, payment.id);

        // Obter configuração do bot
        const botConfig = await prisma.bot.findUnique({
          where: { id: payment.lead.botId },
        });

        const planDays = lead.planDays || 30;

        // Usar canal ID da configuração ou fallback
        const channelId = botConfig?.defaultChannelId || -3966757980;

        const inviteLink = await channelService.generateInviteLink(planDays, channelId);

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + planDays);

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            inviteLink,
            inviteLinkExpires: expirationDate,
          },
        });

        await prisma.delivery.create({
          data: {
            leadId: lead.id,
            channelLink: inviteLink,
            channelType: 'private_channel',
            metadata: {
              planDays,
              status: 'sent',
            },
          },
        });

        await channelService.sendInviteLinkToUser(
          lead.telegramUserId,
          inviteLink,
          planDays
        );

        console.log('[SIMULATE] Pagamento confirmado e link enviado!');
      }

      return reply.send({
        ok: true,
        message: 'Pagamento simulado com sucesso!',
        paymentId,
      });
    } catch (error) {
      console.error('[SIMULATE ERROR]', error);
      return reply.code(500).send({ error: String(error) });
    }
  });
}
