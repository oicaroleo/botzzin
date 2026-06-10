import { prisma } from '../db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GatewayInput {
  provider: string;
  apiKey: string;
  displayName?: string;
  priority?: number;
}

// ─── Gateway Service ──────────────────────────────────────────────────────────

export const gatewayService = {

  async listGateways(userId: string) {
    return prisma.gatewayConfig.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    });
  },

  async addGateway(userId: string, input: GatewayInput) {
    if (!input.provider?.trim()) throw new Error('Provider é obrigatório');
    if (!input.apiKey?.trim()) throw new Error('API Key é obrigatória');

    // Determina próxima prioridade se não informada
    let priority = input.priority;
    if (priority == null) {
      const last = await prisma.gatewayConfig.findFirst({
        where: { userId },
        orderBy: { priority: 'desc' },
      });
      priority = last ? last.priority + 1 : 0;
    }

    return prisma.gatewayConfig.create({
      data: {
        userId,
        provider: input.provider.trim(),
        apiKey: input.apiKey.trim(),
        displayName: input.displayName?.trim() || null,
        priority,
        isActive: true,
      },
    });
  },

  async updateGateway(userId: string, gatewayId: string, data: Partial<GatewayInput> & { isActive?: boolean }) {
    const gw = await prisma.gatewayConfig.findFirst({ where: { id: gatewayId, userId } });
    if (!gw) throw new Error('Gateway não encontrado');

    return prisma.gatewayConfig.update({
      where: { id: gatewayId },
      data: {
        ...(data.provider    !== undefined && { provider:    data.provider }),
        ...(data.apiKey      !== undefined && { apiKey:      data.apiKey }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.priority    !== undefined && { priority:    data.priority }),
        ...(data.isActive    !== undefined && { isActive:    data.isActive }),
      },
    });
  },

  async deleteGateway(userId: string, gatewayId: string) {
    const gw = await prisma.gatewayConfig.findFirst({ where: { id: gatewayId, userId } });
    if (!gw) throw new Error('Gateway não encontrado');
    await prisma.gatewayConfig.delete({ where: { id: gatewayId } });
  },

  async reorderGateways(userId: string, orderedIds: string[]) {
    // Atualiza priority de cada gateway conforme a ordem enviada
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.gatewayConfig.updateMany({
          where: { id, userId },
          data: { priority: index },
        })
      )
    );
  },

  async getSettings(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } });
  },

  async upsertSettings(userId: string, data: { abTestEnabled?: boolean; platformIntelligenceEnabled?: boolean }) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  // ─── Seleciona gateway para gerar um PIX ─────────────────────────────────
  // Lógica:
  //   1. Se A/B test ativo → distribui entre gateways ativos em round-robin
  //   2. Se platform intelligence ativo → prioriza o gateway com maior conversão global
  //   3. Caso contrário → usa o de menor priority (primário)
  //   Fallback automático: se o gateway escolhido falhar, tenta o próximo.

  async selectGateway(userId: string): Promise<{ id: string; provider: string; apiKey: string } | null> {
    const gateways = await prisma.gatewayConfig.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'asc' },
    });
    if (!gateways.length) return null;

    const settings = await prisma.userSettings.findUnique({ where: { userId } });

    // Platform intelligence: reordena pelo melhor provedor global
    if (settings?.platformIntelligenceEnabled && gateways.length > 1) {
      const stats = await prisma.platformGatewayStats.findMany();
      const convMap: Record<string, number> = {};
      for (const s of stats) {
        convMap[s.provider] = s.pixGenerated > 0 ? s.pixPaid / s.pixGenerated : 0;
      }
      gateways.sort((a: any, b: any) => (convMap[b.provider] ?? 0) - (convMap[a.provider] ?? 0));
    }

    // A/B test: round-robin pelo pixGenerated (menor → próximo a usar)
    if (settings?.abTestEnabled && gateways.length > 1) {
      const minGenerated = Math.min(...gateways.map((g: any) => g.pixGenerated));
      const candidate = gateways.find((g: any) => g.pixGenerated === minGenerated) ?? gateways[0];
      return { id: candidate.id, provider: candidate.provider, apiKey: candidate.apiKey };
    }

    return { id: gateways[0].id, provider: gateways[0].provider, apiKey: gateways[0].apiKey };
  },

  // Chamado após gerar um PIX (rastreia uso do gateway)
  async trackPixGenerated(gatewayConfigId: string, provider: string) {
    await Promise.all([
      prisma.gatewayConfig.update({
        where: { id: gatewayConfigId },
        data: { pixGenerated: { increment: 1 } },
      }),
      prisma.platformGatewayStats.upsert({
        where: { provider },
        create: { provider, pixGenerated: 1, pixPaid: 0, updatedAt: new Date() },
        update: { pixGenerated: { increment: 1 }, updatedAt: new Date() },
      }),
    ]);
  },

  // Chamado quando um PIX é pago
  async trackPixPaid(gatewayConfigId: string, provider: string) {
    await Promise.all([
      prisma.gatewayConfig.update({
        where: { id: gatewayConfigId },
        data: { pixPaid: { increment: 1 } },
      }),
      prisma.platformGatewayStats.upsert({
        where: { provider },
        create: { provider, pixGenerated: 0, pixPaid: 1, updatedAt: new Date() },
        update: { pixPaid: { increment: 1 }, updatedAt: new Date() },
      }),
    ]);
  },

  async getPlatformStats() {
    return prisma.platformGatewayStats.findMany();
  },
};
