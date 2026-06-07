import { prisma } from '../db';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
  days?: number; // Últimos N dias
}

export class MetricsService {
  /**
   * Calcular data range
   */
  private calculateDateRange(range: DateRange = {}): { startDate: Date; endDate: Date } {
    const endDate = range.endDate || new Date();
    const startDate = range.startDate || new Date(endDate.getTime() - (range.days || 30) * 24 * 60 * 60 * 1000);

    return { startDate, endDate };
  }

  /**
   * Obter métricas do bot
   */
  async getBotMetrics(
    botId: string,
    userId: string,
    range: DateRange = {}
  ): Promise<any> {
    // Validar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    const { startDate, endDate } = this.calculateDateRange(range);

    // Buscar dados
    const [
      totalLeads,
      leadsNovosPeriodo,
      pixGerados,
      pixPagos,
      totalReceita,
      taxaConversao,
      leadsPorStatus,
    ] = await Promise.all([
      // Total de leads
      prisma.lead.count({
        where: { botId },
      }),

      // Leads novos no período
      prisma.lead.count({
        where: {
          botId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // PIX gerados (status generated_pix ou paid)
      prisma.payment.count({
        where: {
          lead: { botId },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // PIX pagos
      prisma.payment.count({
        where: {
          lead: { botId },
          status: 'confirmed',
          confirmedAt: { gte: startDate, lte: endDate },
        },
      }),

      // Total de receita
      prisma.payment.aggregate({
        where: {
          lead: { botId },
          status: 'confirmed',
          confirmedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),

      // Taxa de conversão
      prisma.lead.groupBy({
        by: ['status'],
        where: {
          botId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),

      // Leads por status
      prisma.lead.groupBy({
        by: ['status'],
        where: { botId },
        _count: true,
      }),
    ]);

    // Calcular conversão
    const conversionRate =
      leadsNovosPeriodo > 0 ? ((pixPagos / leadsNovosPeriodo) * 100).toFixed(2) : '0';

    // Agrupar por status
    const statusMap: { [key: string]: number } = {};
    (leadsPorStatus as any[]).forEach((item: any) => {
      statusMap[item.status] = item._count;
    });

    return {
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalLeads,
        leadsNovosPeriodo,
        pixGerados,
        pixPagos,
        totalReceita: (totalReceita._sum as any).amount || 0,
        conversionRate: parseFloat(conversionRate as string),
      },
      statusBreakdown: {
        started: statusMap.started || 0,
        generated_pix: statusMap.generated_pix || 0,
        paid: statusMap.paid || 0,
        failed: statusMap.failed || 0,
      },
    };
  }

  /**
   * Obter lista de leads com filtros
   */
  async getLeads(
    botId: string,
    userId: string,
    options: {
      status?: string;
      page?: number;
      pageSize?: number;
      search?: string;
      range?: DateRange;
    } = {}
  ): Promise<any> {
    // Validar se bot existe
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    const { status, page = 1, pageSize = 20, search, range } = options;
    const skip = (page - 1) * pageSize;
    const { startDate, endDate } = this.calculateDateRange(range);

    // Construir filtro
    const where: any = {
      botId,
      createdAt: { gte: startDate, lte: endDate },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { telegramUsername: { contains: search, mode: 'insensitive' } },
        { telegramFirstName: { contains: search, mode: 'insensitive' } },
        { telegramUserId: { contains: search } },
      ];
    }

    // Buscar leads
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          interactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads: (leads as any[]).map((lead: any) => this.formatLeadResponse(lead)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Obter detalhes de um lead
   */
  async getLeadDetails(
    botId: string,
    leadId: string,
    userId: string
  ): Promise<any> {
    // Validar se bot existe
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Buscar lead
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, botId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
        },
        delivery: true,
      },
    });

    if (!lead) {
      throw new Error('Lead não encontrado');
    }

    return {
      ...this.formatLeadResponse(lead),
      payments: lead.payments,
      interactions: lead.interactions,
      delivery: lead.delivery,
    };
  }

  /**
   * Obter gráfico de receita (últimos N dias)
   */
  async getRevenueChart(
    botId: string,
    userId: string,
    days: number = 30
  ): Promise<any[]> {
    // Validar se bot existe
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar pagamentos confirmados
    const payments = await prisma.payment.findMany({
      where: {
        lead: { botId },
        status: 'confirmed',
        confirmedAt: { gte: startDate },
      },
      select: {
        amount: true,
        confirmedAt: true,
      },
      orderBy: { confirmedAt: 'asc' },
    });

    // Agrupar por dia
    const chartData: { [key: string]: number } = {};

    // Inicializar todos os dias com 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      chartData[dateStr] = 0;
    }

    // Somar receitas
    (payments as any[]).forEach((payment: any) => {
      if (payment.confirmedAt) {
        const dateStr = payment.confirmedAt.toISOString().split('T')[0];
        chartData[dateStr] = (chartData[dateStr] || 0) + payment.amount;
      }
    });

    // Converter para array
    return Object.entries(chartData).map(([date, amount]) => ({
      date,
      amount: parseFloat((amount as number).toFixed(2)),
    }));
  }

  /**
   * Obter gráfico de conversão
   */
  async getConversionChart(
    botId: string,
    userId: string,
    days: number = 30
  ): Promise<any> {
    // Validar se bot existe
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar dados por status
    const statusData = await prisma.lead.groupBy({
      by: ['status'],
      where: {
        botId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    return {
      started: statusData.find((s: any) => s.status === 'started')?._count || 0,
      generated_pix: statusData.find((s: any) => s.status === 'generated_pix')?._count || 0,
      paid: statusData.find((s: any) => s.status === 'paid')?._count || 0,
      failed: statusData.find((s: any) => s.status === 'failed')?._count || 0,
    };
  }

  /**
   * Formatar resposta de lead
   */
  private formatLeadResponse(lead: any): any {
    const lastPayment = lead.payments?.[0];

    return {
      id: lead.id,
      telegramUserId: lead.telegramUserId,
      telegramUsername: lead.telegramUsername,
      telegramFirstName: lead.telegramFirstName,
      status: lead.status,
      planDays: lead.planDays,
      pixAttempts: lead.pixAttemptsCount,
      totalMessages: lead.totalMessagesCount,
      lastPaymentStatus: lastPayment?.status,
      lastPaymentAmount: lastPayment?.amount,
      lastPaymentDate: lastPayment?.confirmedAt,
      paidAt: lead.paidAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }
}

export const metricsService = new MetricsService();
