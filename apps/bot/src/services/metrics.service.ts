import { prisma } from '../db.js';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
  days?: number;
}

function calcRange(range: DateRange = {}) {
  const end = range.endDate || new Date();
  const start = range.startDate || new Date(end.getTime() - (range.days || 30) * 86400_000);
  return { start, end };
}

async function assertBotOwner(botId: string, userId: string) {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new Error('Bot não encontrado');
  return bot;
}

export const metricsService = {
  async getBotMetrics(botId: string, userId: string, range: DateRange = {}) {
    await assertBotOwner(botId, userId);
    const { start, end } = calcRange(range);

    const [totalLeads, newLeads, pixGenerated, pixPaid, revenue, byStatus, startsAggregate] = await Promise.all([
      prisma.lead.count({ where: { botId } }),
      prisma.lead.count({ where: { botId, createdAt: { gte: start, lte: end } } }),
      prisma.payment.count({ where: { lead: { botId }, createdAt: { gte: start, lte: end } } }),
      prisma.payment.count({ where: { lead: { botId }, status: 'paid', paidAt: { gte: start, lte: end } } }),
      prisma.payment.aggregate({
        where: { lead: { botId }, status: 'paid', paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.lead.groupBy({ by: ['status'], where: { botId }, _count: true }),
      prisma.lead.aggregate({ where: { botId }, _sum: { starts: true } }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s: { status: string; _count: number }) => { statusMap[s.status] = s._count; });

    const totalStarts = startsAggregate._sum.starts ?? 0;
    const startsPerSale = pixPaid > 0 ? +(totalStarts / pixPaid).toFixed(2) : 0;

    return {
      period: { startDate: start, endDate: end },
      summary: {
        totalLeads,
        newLeads,
        pixGenerated,
        pixPaid,
        revenue: revenue._sum.amount ?? 0,
        conversionRate: newLeads > 0 ? +((pixPaid / newLeads) * 100).toFixed(2) : 0,
        totalStarts,
        startsPerSale,
      },
      statusBreakdown: {
        started: statusMap.started || 0,
        pix_generated: statusMap.pix_generated || 0,
        paid: statusMap.paid || 0,
      },
    };
  },

  async getLeads(
    botId: string,
    userId: string,
    options: { status?: string; page?: number; pageSize?: number; search?: string; range?: DateRange } = {}
  ) {
    await assertBotOwner(botId, userId);
    const { status, page = 1, pageSize = 20, search, range } = options;
    const { start, end } = calcRange(range);
    const skip = (page - 1) * pageSize;

    const where: any = { botId, createdAt: { gte: start, lte: end } };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { telegramUsername: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { telegramUserId: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads: (leads as any[]).map((l) => ({
        id: l.id,
        telegramUserId: l.telegramUserId,
        telegramUsername: l.telegramUsername,
        firstName: l.firstName,
        status: l.status,
        pixCount: l.pixCount,
        starts: l.starts,
        paidAt: l.paidAt,
        lastPayment: (l as any).payments[0] ?? null,
        createdAt: l.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getLeadDetails(botId: string, leadId: string, userId: string) {
    await assertBotOwner(botId, userId);
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, botId },
      include: { payments: { include: { plan: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!lead) throw new Error('Lead não encontrado');
    return lead;
  },

  async getRevenueChart(botId: string, userId: string, days = 30) {
    await assertBotOwner(botId, userId);
    const start = new Date(Date.now() - days * 86400_000);

    const payments = await prisma.payment.findMany({
      where: { lead: { botId }, status: 'paid', paidAt: { gte: start } },
      select: { amount: true, paidAt: true },
      orderBy: { paidAt: 'asc' },
    });

    const chart: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
      chart[d.toISOString().slice(0, 10)] = 0;
    }
    payments.forEach((p: { amount: number; paidAt: Date | null }) => {
      if (p.paidAt) chart[p.paidAt.toISOString().slice(0, 10)] = (chart[p.paidAt.toISOString().slice(0, 10)] || 0) + p.amount;
    });

    return Object.entries(chart).map(([date, amount]) => ({ date, amount: +amount.toFixed(2) }));
  },

  async getConversionChart(botId: string, userId: string, days = 30) {
    await assertBotOwner(botId, userId);
    const start = new Date(Date.now() - days * 86400_000);

    const byStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: { botId, createdAt: { gte: start } },
      _count: true,
    });

    const m: Record<string, number> = {};
    byStatus.forEach((s: { status: string; _count: number }) => { m[s.status] = s._count; });
    return { started: m.started || 0, pix_generated: m.pix_generated || 0, paid: m.paid || 0 };
  },
};
