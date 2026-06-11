import { prisma } from '../db.js';
import { deliverAccess } from './access.service.js';
import { logLeadEvent } from './lead-event.service.js';

export interface LeadFilters {
  botId?: string;
  flowId?: string;
  status?: string; // todos | convertido | pendente | bloqueado
  search?: string;
  page?: number;
  pageSize?: number;
  days?: number;
}

// Monta o where base (escopo do dono + filtros de bot/fluxo/status/busca).
function buildWhere(userId: string, f: LeadFilters) {
  const where: any = { bot: { userId } };
  if (f.botId)  where.botId = f.botId;
  if (f.flowId) where.flowId = f.flowId;

  if (f.status === 'convertido') where.paidAt = { not: null };
  else if (f.status === 'bloqueado') where.blockedAt = { not: null };
  else if (f.status === 'pendente') { where.paidAt = null; where.blockedAt = null; }

  if (f.days) where.createdAt = { gte: new Date(Date.now() - f.days * 86400_000) };

  if (f.search?.trim()) {
    const s = f.search.trim();
    where.OR = [
      { telegramUsername: { contains: s, mode: 'insensitive' } },
      { firstName:        { contains: s, mode: 'insensitive' } },
      { telegramUserId:   { contains: s } },
      { payments: { some: { OR: [
        { endToEndId: { contains: s, mode: 'insensitive' } },
        { gatewayTxId: { contains: s, mode: 'insensitive' } },
      ] } } },
    ];
  }
  return where;
}

export const leadsService = {
  // Totais da conta (respeitando filtros de bot/fluxo/período).
  async summary(userId: string, f: LeadFilters = {}) {
    const base = buildWhere(userId, { ...f, status: undefined, search: undefined });
    const [total, converted, blocked] = await Promise.all([
      prisma.lead.count({ where: base }),
      prisma.lead.count({ where: { ...base, paidAt: { not: null } } }),
      prisma.lead.count({ where: { ...base, blockedAt: { not: null } } }),
    ]);
    const pending = await prisma.lead.count({ where: { ...base, paidAt: null, blockedAt: null } });
    return { total, converted, blocked, pending };
  },

  // Lista paginada de leads da conta.
  async listLeads(userId: string, f: LeadFilters = {}) {
    const page = f.page ?? 1;
    const pageSize = Math.min(f.pageSize ?? 25, 100);
    const where = buildWhere(userId, f);

    const [rows, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          bot:  { select: { id: true, telegramUsername: true } },
          payments: { where: { status: 'paid' }, orderBy: { paidAt: 'desc' }, take: 1,
            select: { amount: true, endToEndId: true, gatewayTxId: true, paidAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads: rows.map((l: any) => ({
        id: l.id,
        telegramUserId: l.telegramUserId,
        telegramUsername: l.telegramUsername,
        firstName: l.firstName,
        bot: l.bot,
        status: l.blockedAt ? 'bloqueado' : l.paidAt ? 'convertido' : 'pendente',
        rawStatus: l.status,
        paidAt: l.paidAt,
        accessExpiresAt: l.accessExpiresAt,
        blockedAt: l.blockedAt,
        createdAt: l.createdAt,
        lastPayment: l.payments[0] ?? null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  // Reenvia o link/acesso ao lead (usa o último plano pago).
  async resendAccess(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, bot: { userId } },
      include: {
        bot: { select: { telegramBotToken: true } },
        payments: { where: { status: 'paid' }, orderBy: { paidAt: 'desc' }, take: 1, include: { plan: true } },
      },
    });
    if (!lead) throw new Error('Lead não encontrado');
    const paid = lead.payments[0];
    if (!paid) throw new Error('Este lead não possui pagamento confirmado.');
    const plan = paid.plan;

    const flow = lead.flowId ? await prisma.flow.findUnique({ where: { id: lead.flowId } }) : null;
    const step = (paid as any).funnelStepId
      ? await prisma.funnelStep.findUnique({ where: { id: (paid as any).funnelStepId }, select: { deliveryType: true, deliveryValue: true } })
      : null;

    const { deliveryType, channelId } = await deliverAccess({
      botToken: lead.bot.telegramBotToken,
      telegramUserId: lead.telegramUserId,
      plan: { emoji: plan.emoji, name: plan.name, days: plan.days, deliveryType: plan.deliveryType, deliveryValue: plan.deliveryValue },
      flow: flow ? { deliveryType: flow.deliveryType, channelId: flow.channelId, deliveryValue: flow.deliveryValue } : null,
      step,
      resend: true,
    });

    await logLeadEvent(lead.id, 'access_granted', { type: deliveryType, channelId, planName: plan.name, resent: true });
    return { ok: true, deliveryType };
  },

  // Export CSV (colunas mínimas) p/ disparos externos — honra os filtros.
  // Busca em lotes selecionando só o necessário (evita carregar tudo de uma vez).
  async exportLeadsCsv(userId: string, f: LeadFilters = {}) {
    const where = buildWhere(userId, f);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['telegram_id', 'username', 'first_name', 'status', 'created_at', 'paid_amount', 'e2e'].join(',');
    const lines: string[] = [header];

    const batch = 1000;
    let skip = 0;
    for (;;) {
      const rows = await prisma.lead.findMany({
        where,
        select: {
          telegramUserId: true, telegramUsername: true, firstName: true,
          paidAt: true, blockedAt: true, createdAt: true,
          payments: { where: { status: 'paid' }, orderBy: { paidAt: 'desc' }, take: 1, select: { amount: true, endToEndId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: batch,
      });
      if (!rows.length) break;
      for (const l of rows as any[]) {
        const status = l.blockedAt ? 'bloqueado' : l.paidAt ? 'convertido' : 'pendente';
        const pay = l.payments[0];
        lines.push([
          esc(l.telegramUserId), esc(l.telegramUsername), esc(l.firstName),
          esc(status), esc(l.createdAt?.toISOString()), esc(pay?.amount ?? ''), esc(pay?.endToEndId ?? ''),
        ].join(','));
      }
      skip += batch;
      if (rows.length < batch || skip >= 50000) break; // teto de segurança
    }
    return lines.join('\n');
  },

  // Detalhe + timeline de um lead (valida posse via bot.userId).
  async getLeadTimeline(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, bot: { userId } },
      include: {
        bot:  { select: { id: true, telegramUsername: true } },
        events: { orderBy: { createdAt: 'asc' } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { plan: { select: { name: true, days: true } } },
        },
      },
    });
    if (!lead) throw new Error('Lead não encontrado');
    return lead;
  },
};
