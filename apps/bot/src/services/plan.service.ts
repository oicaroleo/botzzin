import { prisma } from '../db.js';

export interface PlanInput {
  name: string;
  description?: string;
  days: number;
  price: number;
  emoji?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Helper: encontra o flowId associado ao bot (se existir)
async function getFlowIdForBot(botId: string, userId: string): Promise<string | null> {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new Error('Bot não encontrado');

  const flowBot = await prisma.flowBot.findFirst({ where: { botId } });
  return flowBot?.flowId ?? null;
}

export const planService = {
  async createPlan(botId: string, userId: string, input: PlanInput) {
    const flowId = await getFlowIdForBot(botId, userId);
    if (!flowId) throw new Error('Este bot não está vinculado a nenhum fluxo. Crie um fluxo em Meus Fluxos primeiro.');

    if (!input.name?.trim()) throw new Error('Nome do plano é obrigatório');
    if (!input.days || input.days < 1) throw new Error('Dias deve ser maior que 0');
    if (input.price == null || input.price < 0) throw new Error('Preço deve ser positivo');

    return prisma.plan.create({
      data: {
        flowId,
        name: input.name.trim(),
        description: input.description,
        days: input.days,
        price: input.price,
        emoji: input.emoji || '💎',
        isActive: input.isActive !== false,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  },

  async listPlans(botId: string, userId: string) {
    const flowId = await getFlowIdForBot(botId, userId);
    if (!flowId) return [];

    return prisma.plan.findMany({
      where: { flowId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  async getPlan(botId: string, planId: string, userId: string) {
    const flowId = await getFlowIdForBot(botId, userId);
    const plan = await prisma.plan.findFirst({ where: { id: planId, ...(flowId ? { flowId } : {}) } });
    if (!plan) throw new Error('Plano não encontrado');
    return plan;
  },

  async updatePlan(botId: string, planId: string, userId: string, input: Partial<PlanInput>) {
    const flowId = await getFlowIdForBot(botId, userId);
    const exists = await prisma.plan.findFirst({ where: { id: planId, ...(flowId ? { flowId } : {}) } });
    if (!exists) throw new Error('Plano não encontrado');

    return prisma.plan.update({
      where: { id: planId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.days !== undefined && { days: input.days }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.emoji !== undefined && { emoji: input.emoji }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
  },

  async deletePlan(botId: string, planId: string, userId: string) {
    const flowId = await getFlowIdForBot(botId, userId);
    const exists = await prisma.plan.findFirst({ where: { id: planId, ...(flowId ? { flowId } : {}) } });
    if (!exists) throw new Error('Plano não encontrado');
    await prisma.plan.delete({ where: { id: planId } });
  },

  async setDefaultPlan(botId: string, planId: string, userId: string) {
    return this.getPlan(botId, planId, userId);
  },

  async getDefaultPlan(botId: string) {
    const flowBot = await prisma.flowBot.findFirst({ where: { botId } });
    if (!flowBot) return null;

    return prisma.plan.findFirst({
      where: { flowId: flowBot.flowId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  },
};
