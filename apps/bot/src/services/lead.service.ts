import { prisma } from '../db.js';

// Compatibilidade — bot-worker usa prisma diretamente, mas rotas antigas usam este service
export const leadService = {
  async getLeadById(leadId: string) {
    return prisma.lead.findUnique({ where: { id: leadId } });
  },

  async getLeadsByBot(botId: string) {
    return prisma.lead.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
