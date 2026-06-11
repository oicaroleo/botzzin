import { prisma } from './db.js';
import { sendMessage, kickChatMember } from './services/channel.service.js';
import { logLeadEvent } from './services/lead-event.service.js';

const HOUR_MS = 3_600_000;

function discountedPrice(price: number, discountPct: number) {
  const d = Math.min(Math.max(discountPct || 0, 0), 100);
  return Math.round(price * (1 - d / 100) * 100) / 100;
}

// Varredura periódica de renovação/expiração. Roda no Worker Manager (processo único).
//   1. Oferta de renovação: avisa o lead X horas antes de expirar (X = flow.renewalWarnHours).
//   2. Remoção: expulsa do canal/grupo quem já passou de accessExpiresAt.
export async function runRenewalSweep() {
  const now = new Date();

  // ── 1. Oferta de renovação (antes de expirar) ──────────────────────────────
  const warnCandidates = await prisma.lead.findMany({
    where: { status: 'paid', renewalWarnedAt: null, accessExpiresAt: { gt: now } },
    include: { bot: { select: { telegramBotToken: true } } },
  });

  for (const lead of warnCandidates) {
    if (!lead.flowId || !lead.accessExpiresAt) continue;
    const flow = await prisma.flow.findUnique({
      where: { id: lead.flowId },
      include: { plans: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!flow || !flow.plans.length) continue;

    // Só avisa dentro da janela: faltam <= renewalWarnHours para expirar.
    const warnFrom = new Date(lead.accessExpiresAt.getTime() - flow.renewalWarnHours * HOUR_MS);
    if (now < warnFrom) continue;

    const rows = flow.plans.map((p: any) => {
      const disc = Math.min(Math.max(p.renewalDiscount || 0, 0), 100);
      const price = discountedPrice(p.price, disc);
      const label = disc > 0
        ? `${p.emoji} ${p.name} — R$ ${price.toFixed(2)} (-${disc}%)`
        : `${p.emoji} ${p.name} — R$ ${price.toFixed(2)}`;
      return [{ text: label, callback_data: `renew_plan:${p.id}` }];
    });

    try {
      await sendMessage(lead.bot.telegramBotToken, lead.telegramUserId,
        `⏳ *Seu acesso está acabando!*\n\nRenove agora e continue sem interrupção. Escolha um plano:`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: rows } });
      await prisma.lead.update({ where: { id: lead.id }, data: { renewalWarnedAt: now } });
      await logLeadEvent(lead.id, 'renewal_offered');
      console.log(`[SWEEP] Oferta de renovação enviada: lead=${lead.id}`);
    } catch (e) {
      console.error(`[SWEEP] erro ao avisar lead=${lead.id}:`, e);
    }
  }

  // ── 2. Remoção (após expirar) ──────────────────────────────────────────────
  const expired = await prisma.lead.findMany({
    where: { status: 'paid', accessExpiresAt: { lt: now }, removedAt: null },
    include: { bot: { select: { telegramBotToken: true } } },
  });

  for (const lead of expired) {
    let channelId: string | null = null;
    if (lead.flowId) {
      const flow = await prisma.flow.findUnique({
        where: { id: lead.flowId },
        select: { deliveryType: true, channelId: true },
      });
      if (flow && (flow.deliveryType === 'channel' || flow.deliveryType === 'group')) {
        channelId = flow.channelId;
      }
    }

    try {
      if (channelId) {
        await kickChatMember(lead.bot.telegramBotToken, channelId, lead.telegramUserId);
      }
      await logLeadEvent(lead.id, 'removed', { channelId });
      console.log(`[SWEEP] Lead removido por expiração: lead=${lead.id} chan=${channelId ?? 'sem canal'}`);
    } catch (e) {
      console.error(`[SWEEP] erro ao remover lead=${lead.id} (segue marcando como expired):`, e);
    } finally {
      // Marca como expired mesmo se a remoção falhar — evita reprocessar em loop.
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'expired', removedAt: now },
      }).catch(() => {});
    }
  }
}
