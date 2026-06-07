import { prisma } from '../db';

export interface PlanInput {
  name: string;
  description?: string;
  days: number;
  price: number;
  emoji?: string;
  isActive?: boolean;
  priority?: number;
}

export class PlanService {
  /**
   * Criar novo plano
   */
  async createPlan(botId: string, userId: string, input: PlanInput): Promise<any> {
    // Validar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Validar inputs
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Nome do plano é obrigatório');
    }

    if (!input.days || input.days < 1) {
      throw new Error('Dias deve ser maior que 0');
    }

    if (!input.price || input.price < 0) {
      throw new Error('Preço deve ser positivo');
    }

    // Criar plano
    const plan = await prisma.plan.create({
      data: {
        name: input.name,
        description: input.description,
        days: input.days,
        price: input.price,
        emoji: input.emoji || '💎',
        isActive: input.isActive !== false,
        priority: input.priority || 0,
      },
    });

    // Criar relação Bot-Plan
    const botPlan = await prisma.botPlan.create({
      data: {
        botId,
        planId: plan.id,
        isDefault: false,
      },
    });

    return this.formatPlanResponse(plan, botPlan.isDefault);
  }

  /**
   * Listar planos de um bot
   */
  async listPlans(botId: string, userId: string): Promise<any[]> {
    // Validar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Buscar planos do bot
    const botPlans = await prisma.botPlan.findMany({
      where: { botId },
      include: {
        plan: true,
      },
      orderBy: {
        plan: {
          priority: 'asc',
        },
      },
    });

    return (botPlans as any[]).map((bp: any) => this.formatPlanResponse(bp.plan, bp.isDefault));
  }

  /**
   * Obter detalhes de um plano
   */
  async getPlan(botId: string, planId: string, userId: string): Promise<any> {
    // Validar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Buscar relação Bot-Plan
    const botPlan = await prisma.botPlan.findFirst({
      where: { botId, planId },
      include: {
        plan: true,
      },
    });

    if (!botPlan) {
      throw new Error('Plano não encontrado neste bot');
    }

    return this.formatPlanResponse(botPlan.plan, botPlan.isDefault);
  }

  /**
   * Atualizar plano
   */
  async updatePlan(
    botId: string,
    planId: string,
    userId: string,
    input: Partial<PlanInput>
  ): Promise<any> {
    // Validar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Validar se plano pertence ao bot
    const botPlan = await prisma.botPlan.findFirst({
      where: { botId, planId },
    });

    if (!botPlan) {
      throw new Error('Plano não encontrado neste bot');
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.days !== undefined) updateData.days = input.days;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.emoji !== undefined) updateData.emoji = input.emoji;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.priority !== undefined) updateData.priority = input.priority;

    // Atualizar plano
    const updatedPlan = await prisma.plan.update({
      where: { id: planId },
      data: updateData,
    });

    return this.formatPlanResponse(updatedPlan, botPlan.isDefault);
  }

  /**
   * Deletar plano
   */
  async deletePlan(botId: string, planId: string, userId: string): Promise<void> {
    // Validar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Validar se plano pertence ao bot
    const botPlan = await prisma.botPlan.findFirst({
      where: { botId, planId },
    });

    if (!botPlan) {
      throw new Error('Plano não encontrado neste bot');
    }

    // Deletar relação Bot-Plan
    await prisma.botPlan.delete({
      where: {
        botId_planId: {
          botId,
          planId,
        },
      },
    });

    // Verificar se plano ainda está sendo usado por outros bots
    const otherUses = await prisma.botPlan.findMany({
      where: { planId },
    });

    // Se não está sendo usado por ninguém, deletar o plano
    if (otherUses.length === 0) {
      await prisma.plan.delete({
        where: { id: planId },
      });
    }
  }

  /**
   * Marcar plano como padrão
   */
  async setDefaultPlan(botId: string, planId: string, userId: string): Promise<any> {
    // Validar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Validar se plano pertence ao bot
    const botPlan = await prisma.botPlan.findFirst({
      where: { botId, planId },
    });

    if (!botPlan) {
      throw new Error('Plano não encontrado neste bot');
    }

    // Remover default de outros planos
    await prisma.botPlan.updateMany({
      where: { botId },
      data: { isDefault: false },
    });

    // Marcar como default
    const updatedBotPlan = await prisma.botPlan.update({
      where: {
        botId_planId: {
          botId,
          planId,
        },
      },
      data: { isDefault: true },
      include: { plan: true },
    });

    return this.formatPlanResponse(updatedBotPlan.plan, true);
  }

  /**
   * Obter plano padrão do bot
   */
  async getDefaultPlan(botId: string): Promise<any | null> {
    const botPlan = await prisma.botPlan.findFirst({
      where: { botId, isDefault: true },
      include: { plan: true },
    });

    if (!botPlan) {
      return null;
    }

    return this.formatPlanResponse(botPlan.plan, true);
  }

  /**
   * Formatar resposta de plano
   */
  private formatPlanResponse(plan: any, isDefault: boolean = false): any {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      days: plan.days,
      price: plan.price,
      emoji: plan.emoji,
      isActive: plan.isActive,
      isDefault,
      priority: plan.priority,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}

export const planService = new PlanService();
