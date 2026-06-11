import { prisma } from './db.js';
import { sendMessage, sendCachedMedia } from './services/channel.service.js';
import { logLeadEvent } from './services/lead-event.service.js';

function discounted(price: number, type: string | null, value: number | null): number {
  if (!value) return price;
  const p = type === 'percent' ? price * (1 - value / 100) : price - value;
  return Math.max(0, Math.round(p * 100) / 100);
}

function normMedia(v: any): Array<{ fileId: string; type: string }> {
  return (Array.isArray(v) ? v : [])
    .map((m: any) => typeof m === 'string' ? { fileId: m, type: 'document' } : m)
    .filter((m: any) => m?.fileId);
}

const advanceRuleFor = (flow: any, kind: string) =>
  (kind === 'upsell' ? flow?.upsellAdvanceRule : flow?.downsellAdvanceRule) || (kind === 'upsell' ? 'onlyIfPaid' : 'always');

// ─── Envio dos passos de esteira cujo horário chegou ────────────────────────────
// Roda no loop do worker-manager (a cada tick). 1 FunnelProgress por lead+kind.
export async function runFunnelSweep() {
  const now = new Date();
  const due = await prisma.funnelProgress.findMany({
    where: { status: 'active', sendAt: { lte: now } },
    take: 100,
    include: { lead: { include: { bot: { select: { telegramBotToken: true } } } } },
  });

  for (const prog of due) {
    try {
      const lead = prog.lead as any;
      if (!lead?.flowId) { await setStatus(prog.id, 'done'); continue; }

      // Downsell para se o lead converteu/bloqueou no meio do caminho
      if (prog.kind === 'downsell' && (lead.paidAt || lead.blockedAt)) { await setStatus(prog.id, 'stopped'); continue; }

      const flow = await prisma.flow.findUnique({
        where: { id: lead.flowId },
        select: { upsellAdvanceRule: true, downsellAdvanceRule: true },
      });
      const steps = await prisma.funnelStep.findMany({
        where: { flowId: lead.flowId, kind: prog.kind }, orderBy: { order: 'asc' },
      });
      const step: any = steps[prog.nextOrder];
      if (!step) { await setStatus(prog.id, 'done'); continue; }

      const token = lead.bot.telegramBotToken;
      const chatId = lead.telegramUserId;

      for (const m of normMedia(step.mediaFileIds)) {
        try { await sendCachedMedia(token, chatId, m); } catch (e) { console.error(`[FUNNEL] media err lead=${lead.id}:`, e); }
      }

      const planIds: string[] = Array.isArray(step.planIds) ? step.planIds : [];
      const plans = planIds.length
        ? await prisma.plan.findMany({ where: { id: { in: planIds }, isActive: true } })
        : [];
      const buttons: any[] = plans.map((p: any) => {
        const price = discounted(p.price, step.discountType, step.discountValue);
        return [{ text: `${p.emoji} ${p.name} — R$ ${price.toFixed(2)}`, callback_data: `fb:${step.id}:${p.id}` }];
      });
      if (!step.hideReject) buttons.push([{ text: step.rejectLabel || '❌ Não quero', callback_data: `fn:${prog.id}` }]);

      await sendMessage(token, chatId, step.message, {
        parse_mode: 'HTML',
        ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
      });
      await logLeadEvent(lead.id, 'funnel_sent', { kind: prog.kind, order: prog.nextOrder });

      // Avança a sequência conforme a regra do fluxo
      const hasNext = !!steps[prog.nextOrder + 1];
      if (!hasNext) { await setStatus(prog.id, 'done'); }
      else if (advanceRuleFor(flow, prog.kind) === 'always') {
        const next: any = steps[prog.nextOrder + 1];
        const sendAt = next.sendTiming === 'immediate' ? new Date() : new Date(Date.now() + (next.delayMins ?? 60) * 60_000);
        await prisma.funnelProgress.update({ where: { id: prog.id }, data: { nextOrder: prog.nextOrder + 1, sendAt } });
      } else {
        // onlyIfPaid: pausa apontando p/ o próximo step; só avança quando pagar a oferta
        await prisma.funnelProgress.update({ where: { id: prog.id }, data: { nextOrder: prog.nextOrder + 1, status: 'waiting' } });
      }
      console.log(`[FUNNEL] enviado ${prog.kind} step=${prog.nextOrder} lead=${lead.id}`);
    } catch (e) {
      console.error(`[FUNNEL] erro no progress=${prog.id}:`, e);
      await prisma.funnelProgress.update({ where: { id: prog.id }, data: { sendAt: new Date(Date.now() + 300_000) } }).catch(() => {});
    }
  }
}

// ─── Gatilho de downsell: detecta abandono e cria o FunnelProgress ──────────────
export async function runDownsellTriggers() {
  const flows = await prisma.flow.findMany({
    where: { downsellEnabled: true },
    select: { id: true, downsellDelayMins: true, downsellTrigger: true },
  });

  for (const flow of flows) {
    const hasSteps = await prisma.funnelStep.count({ where: { flowId: flow.id, kind: 'downsell' } });
    if (!hasSteps) continue;

    const win = flow.downsellDelayMins ?? 30;
    const cutoff = new Date(Date.now() - win * 60_000);
    const trig = flow.downsellTrigger || 'both';
    const statuses = trig === 'pix_unpaid' ? ['pix_generated']
      : trig === 'start_unpaid' ? ['started']
      : ['started', 'pix_generated'];

    const leads = await prisma.lead.findMany({
      where: {
        flowId: flow.id, paidAt: null, blockedAt: null,
        status: { in: statuses },
        updatedAt: { lt: cutoff },
        funnelProgress: { none: { kind: 'downsell' } },
      },
      select: { id: true }, take: 200,
    });
    for (const l of leads) {
      await prisma.funnelProgress.create({
        data: { leadId: l.id, kind: 'downsell', nextOrder: 0, sendAt: new Date(), status: 'active' },
      }).catch(() => {}); // unique(leadId,kind) protege corrida
    }
    if (leads.length) console.log(`[FUNNEL] downsell armado p/ ${leads.length} lead(s) no fluxo ${flow.id}`);
  }
}

async function setStatus(id: string, status: string) {
  await prisma.funnelProgress.update({ where: { id }, data: { status } }).catch(() => {});
}
