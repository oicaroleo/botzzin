import { prisma } from '../db';

export class LeadService {
  /**
   * Registra ou atualiza um lead
   */
  async registerOrUpdateLead(
    botId: string,
    telegramUserId: string,
    data?: {
      username?: string;
      firstName?: string;
      phone?: string;
    }
  ) {
    const lead = await prisma.lead.upsert({
      where: {
        botId_telegramUserId: {
          botId,
          telegramUserId,
        },
      },
      update: {
        telegramUsername: data?.username,
        telegramFirstName: data?.firstName,
        telegramPhone: data?.phone,
        lastInteractionAt: new Date(),
      },
      create: {
        botId,
        telegramUserId,
        telegramUsername: data?.username,
        telegramFirstName: data?.firstName,
        telegramPhone: data?.phone,
      },
    });

    return lead;
  }

  /**
   * Registra que foi gerado um PIX
   */
  async recordPixGenerated(leadId: string) {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        pixAttemptsCount: { increment: 1 },
        status: 'generated_pix',
        lastInteractionAt: new Date(),
      },
    });

    await prisma.interaction.create({
      data: {
        leadId,
        type: 'pix_generated',
      },
    });

    return lead;
  }

  /**
   * Registra que o pagamento foi confirmado
   */
  async recordPaymentConfirmed(leadId: string, paymentId: string) {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        lastInteractionAt: new Date(),
      },
    });

    await prisma.interaction.create({
      data: {
        leadId,
        type: 'pix_confirmed',
        data: {
          paymentId,
        },
      },
    });

    return lead;
  }

  /**
   * Obter lead por ID
   */
  async getLeadById(leadId: string) {
    return await prisma.lead.findUnique({
      where: { id: leadId },
    });
  }

  /**
   * Obter lead por telegram ID
   */
  async getLeadByTelegramId(botId: string, telegramUserId: string) {
    return await prisma.lead.findUnique({
      where: {
        botId_telegramUserId: {
          botId,
          telegramUserId,
        },
      },
    });
  }

  /**
   * Registrar interação genérica
   */
  async recordInteraction(leadId: string, type: string, data?: any) {
    return await prisma.interaction.create({
      data: {
        leadId,
        type,
        data,
      },
    });
  }
}

export const leadService = new LeadService();
