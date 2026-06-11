import { prisma } from './db.js';
import { consumeBotMessage, getSession, setSession, updateSession } from './redis.js';
import { createPix } from './services/pushpay.service.js';
import { generateInviteLink, sendMessage, answerCallbackQuery, sendChatAction, sendCachedMedia, sendPhotoBase64 } from './services/channel.service.js';
import { gatewayService } from './services/gateway.service.js';
import { flowService } from './services/flow.service.js';
import * as payment from './services/payment.service.js';
import { logLeadEvent } from './services/lead-event.service.js';

// ─── Context ──────────────────────────────────────────────────────────────────

interface BotContext {
  botId:          string;
  userId:         string;   // dono do bot
  token:          string;
  channelId:      string | null;
  plans:          Array<{ id: string; name: string; emoji: string; price: number; days: number; renewalDiscount: number }>;
  welcomeMessage: string | null;
  welcomeMedia:   Array<{ fileId: string; type: string }>;
  flowId:         string | null;
  confirmPlan:    boolean; // exige etapa de confirmação antes de gerar o PIX
  payConfig:      any;     // paymentConfig do fluxo (textos, QR, botões…)
  orderBump:      OrderBumpCtx | null; // order bump do contexto principal
}

interface OrderBumpCtx {
  enabled: boolean; name: string; price: number; message: string | null;
  acceptLabel: string; rejectLabel: string; hideReject: boolean; ctaMessage: string | null;
  media: Array<{ fileId: string; type: string }>;
}

// Normaliza um array de mídias (string ou {fileId,type}) para {fileId,type}.
function normMediaList(v: any): Array<{ fileId: string; type: string }> {
  return (Array.isArray(v) ? v : [])
    .map((m: any) => typeof m === 'string' ? { fileId: m, type: 'document' } : m)
    .filter((m: any) => m?.fileId);
}

async function loadBotContext(botId: string): Promise<BotContext | null> {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { user: true },
  });
  if (!bot) return null;

  // Tenta carregar fluxo associado
  const flow = await flowService.loadFlowForBot(botId);

  // Order bump do contexto principal (oferta na compra), se habilitado
  const obRow = flow
    ? await prisma.orderBump.findFirst({ where: { flowId: flow.id, context: 'main', enabled: true } })
    : null;
  const orderBump: OrderBumpCtx | null = obRow ? {
    enabled: obRow.enabled, name: obRow.name, price: obRow.price, message: obRow.message,
    acceptLabel: obRow.acceptLabel, rejectLabel: obRow.rejectLabel, hideReject: obRow.hideReject,
    ctaMessage: obRow.ctaMessage, media: normMediaList((obRow as any).mediaFileIds),
  } : null;

  const plans = flow?.plans.map((p: any) => ({
    id: p.id, name: p.name, emoji: p.emoji, price: p.price, days: p.days,
    renewalDiscount: p.renewalDiscount ?? 0,
  })) ?? [];

  return {
    botId:          bot.id,
    userId:         bot.userId,
    token:          bot.telegramBotToken,
    channelId:      flow?.channelId ?? null,
    welcomeMessage: flow?.welcomeMessage ?? null,
    welcomeMedia:   (Array.isArray((flow as any)?.welcomeMediaFileIds) ? (flow as any).welcomeMediaFileIds : [])
                      .map((m: any) => typeof m === 'string' ? { fileId: m, type: 'document' } : m),
    flowId:         flow?.id ?? null,
    confirmPlan:    !!(flow as any)?.paymentConfig?.confirmPlan,
    payConfig:      (flow as any)?.paymentConfig ?? {},
    orderBump,
    plans,
  };
}

// ─── Texto do PIX: variáveis + saudação ─────────────────────────────────────────
const DEFAULT_PIX_TEXT =
  '✅ <b>Como realizar o pagamento:</b>\n\n1. Abra o app do seu banco.\n2. Selecione "Pagar" ou "PIX".\n3. Escolha "PIX Copia e Cola".\n4. Cole a chave abaixo e finalize com segurança.';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function applyPixVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(k).join(v), text);
}

// ─── Teclado de planos ────────────────────────────────────────────────────────

function buildPlansKeyboard(plans: BotContext['plans']) {
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < plans.length; i += 2) {
    rows.push(
      plans.slice(i, i + 2).map((p) => ({
        text: `${p.emoji} ${p.name} — R$ ${p.price.toFixed(2)}`,
        callback_data: `select_plan:${p.id}`,
      }))
    );
  }
  rows.push([{ text: 'Suporte', callback_data: 'support' }]);
  return { inline_keyboard: rows };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleStart(ctx: BotContext, update: any) {
  const from   = update.message.from;
  const chatId = update.message.chat.id;
  const telegramUserId = String(from.id);

  // Upsert lead + incrementa starts
  const lead = await prisma.lead.upsert({
    where:  { botId_telegramUserId: { botId: ctx.botId, telegramUserId } },
    update: {
      telegramUsername: from.username ?? null,
      firstName:        from.first_name ?? null,
      flowId:           ctx.flowId,
      starts:           { increment: 1 },
      updatedAt:        new Date(),
    },
    create: {
      botId:           ctx.botId,
      telegramUserId,
      telegramUsername: from.username ?? null,
      firstName:        from.first_name ?? null,
      flowId:           ctx.flowId,
      status:           'started',
      starts:           1,
    },
  });

  await setSession(ctx.botId, telegramUserId, { leadId: lead.id });

  // Evento 'started' só no primeiro /start (starts === 1 ⇒ acabou de ser criado)
  if (lead.starts === 1) await logLeadEvent(lead.id, 'started');

  const name    = from.first_name || 'amigo';
  const welcome = (ctx.welcomeMessage || `Ola, ${name}!\n\nEscolha um plano para continuar:`).replace('{nome}', name);

  // Mídias de prévia da boas-vindas (file_ids no canal de cache) — opcional.
  for (const m of ctx.welcomeMedia) {
    try { await sendCachedMedia(ctx.token, chatId, m); }
    catch (e) { console.error(`[WORKER ${ctx.botId}] welcome media error:`, e); }
  }

  if (ctx.plans.length > 0) {
    await sendMessage(ctx.token, chatId, welcome, { reply_markup: buildPlansKeyboard(ctx.plans) });
  } else {
    await sendMessage(ctx.token, chatId, welcome + '\n\nNenhum plano disponivel no momento.');
  }
}

async function handleSelectPlan(ctx: BotContext, update: any, planId: string) {
  const cbq  = update.callback_query;
  const chatId = cbq.message.chat.id;
  const telegramUserId = String(cbq.from.id);

  await answerCallbackQuery(ctx.token, cbq.id);

  const plan = ctx.plans.find((p) => p.id === planId);
  if (!plan) { await sendMessage(ctx.token, chatId, 'Plano nao encontrado.'); return; }

  const session = await getSession(ctx.botId, telegramUserId);
  if (!session) { await sendMessage(ctx.token, chatId, 'Sessao expirada. Use /start.'); return; }

  // Limpa campos de oferta de esteira (caso ainda na sessão) — compra normal.
  await updateSession(ctx.botId, telegramUserId, { selectedPlanId: plan.id, priceOverride: undefined, funnelStepId: undefined });
  if (session.leadId) await logLeadEvent(session.leadId, 'plan_selected', { planId: plan.id, planName: plan.name, price: plan.price });

  // Confirmação do plano desativada → segue direto (order bump, se houver, ou PIX).
  if (!ctx.confirmPlan) {
    await maybeOrderBumpThenPix(ctx, chatId, telegramUserId);
    return;
  }

  await sendMessage(ctx.token, chatId,
    `*Plano selecionado:* ${plan.emoji} ${plan.name}\n` +
    `Valor: R$ ${plan.price.toFixed(2)}\n` +
    `Acesso por: ${plan.days} dias\n\n` +
    `Clique em "Gerar PIX" para continuar.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Gerar PIX', callback_data: 'generate_pix' }],
          [{ text: 'Outros planos', callback_data: 'back_to_plans' }],
        ],
      },
    }
  );
}

// Renovação: o lead clicou num plano da oferta de renovação. Reconstrói a sessão
// (mesmo sem /start recente) marcando isRenewal para aplicar o desconto no PIX.
async function handleRenewPlan(ctx: BotContext, update: any, planId: string) {
  const cbq  = update.callback_query;
  const chatId = cbq.message.chat.id;
  const telegramUserId = String(cbq.from.id);

  await answerCallbackQuery(ctx.token, cbq.id);

  const plan = ctx.plans.find((p) => p.id === planId);
  if (!plan) { await sendMessage(ctx.token, chatId, 'Plano nao encontrado.'); return; }

  const lead = await prisma.lead.findUnique({
    where: { botId_telegramUserId: { botId: ctx.botId, telegramUserId } },
  });
  if (!lead) { await sendMessage(ctx.token, chatId, 'Use /start para comecar.'); return; }

  await setSession(ctx.botId, telegramUserId, { leadId: lead.id, selectedPlanId: plan.id, isRenewal: true });

  const discount = Math.min(Math.max(plan.renewalDiscount || 0, 0), 100);
  const price = Math.round(plan.price * (1 - discount / 100) * 100) / 100;

  await sendMessage(ctx.token, chatId,
    `*Renovação:* ${plan.emoji} ${plan.name}\n` +
    (discount > 0 ? `De ~R$ ${plan.price.toFixed(2)}~ por *R$ ${price.toFixed(2)}* _(-${discount}%)_\n` : `Valor: *R$ ${price.toFixed(2)}*\n`) +
    `Acesso por: ${plan.days} dias\n\n` +
    `Clique em "Gerar PIX" para renovar.`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Gerar PIX', callback_data: 'generate_pix' }]] },
    }
  );
}

async function handleGeneratePix(ctx: BotContext, update: any) {
  const cbq  = update.callback_query;
  await answerCallbackQuery(ctx.token, cbq.id);
  await maybeOrderBumpThenPix(ctx, cbq.message.chat.id, String(cbq.from.id));
}

// Esteira: lead clicou num plano de uma oferta de upsell/downsell.
async function handleFunnelBuy(ctx: BotContext, update: any, stepId: string, planId: string) {
  const cbq = update.callback_query;
  const chatId = cbq.message.chat.id;
  const telegramUserId = String(cbq.from.id);
  await answerCallbackQuery(ctx.token, cbq.id);

  const plan = ctx.plans.find((p) => p.id === planId);
  if (!plan) { await sendMessage(ctx.token, chatId, 'Plano indisponível.'); return; }

  const step = await prisma.funnelStep.findUnique({ where: { id: stepId }, select: { kind: true, discountType: true, discountValue: true } });
  const v = step?.discountValue || 0;
  const price = v
    ? Math.max(0, Math.round((step!.discountType === 'percent' ? plan.price * (1 - v / 100) : plan.price - v) * 100) / 100)
    : plan.price;

  const lead = await prisma.lead.findUnique({ where: { botId_telegramUserId: { botId: ctx.botId, telegramUserId } } });
  if (!lead) { await sendMessage(ctx.token, chatId, 'Use /start para comecar.'); return; }

  // Não mexe no progress: ao pagar, o webhook avança (onlyIfPaid) ou o sweep
  // continua na próxima sequência (always).
  await setSession(ctx.botId, telegramUserId, { leadId: lead.id, selectedPlanId: plan.id, priceOverride: price, funnelStepId: stepId });
  await proceedToPix(ctx, chatId, telegramUserId);
}

async function handleFunnelReject(ctx: BotContext, update: any, progressId: string) {
  const cbq = update.callback_query;
  await answerCallbackQuery(ctx.token, cbq.id, 'Tudo bem!');
  // Só para a sequência se a regra for "onlyIfPaid"; em "always" o próximo step
  // continua no horário (config: "recebe a próxima mesmo se recusar").
  const prog = await prisma.funnelProgress.findUnique({ where: { id: progressId } });
  if (!prog) return;
  const lead = await prisma.lead.findUnique({ where: { id: prog.leadId }, select: { flowId: true } });
  const flow = lead?.flowId ? await prisma.flow.findUnique({ where: { id: lead.flowId }, select: { upsellAdvanceRule: true, downsellAdvanceRule: true } }) : null;
  const rule = (prog.kind === 'upsell' ? flow?.upsellAdvanceRule : flow?.downsellAdvanceRule) || (prog.kind === 'upsell' ? 'onlyIfPaid' : 'always');
  if (rule === 'onlyIfPaid') {
    await prisma.funnelProgress.update({ where: { id: progressId }, data: { status: 'stopped' } }).catch(() => {});
  }
}

// Etapa de order bump (se habilitado e ainda não oferecido) antes de gerar o PIX.
async function maybeOrderBumpThenPix(ctx: BotContext, chatId: number | string, telegramUserId: string) {
  const ob = ctx.orderBump;
  if (ob?.enabled) {
    const session = await getSession(ctx.botId, telegramUserId);
    if (session && !session.orderBumpOffered) {
      await updateSession(ctx.botId, telegramUserId, { orderBumpOffered: true });
      // Mídias do order bump (prévia) — file_ids no canal de cache
      for (const m of ob.media) {
        try { await sendCachedMedia(ctx.token, chatId, m); } catch (e) { console.error(`[WORKER ${ctx.botId}] ob media error:`, e); }
      }
      const buttons: any[] = [[{ text: ob.acceptLabel || '✅ ADICIONAR', callback_data: 'ob_yes' }]];
      if (!ob.hideReject) buttons.push([{ text: ob.rejectLabel || '❌ NÃO QUERO', callback_data: 'ob_no' }]);
      const header = ob.message || `🎁 <b>Oferta especial:</b> adicione <b>${ob.name}</b> por apenas R$ ${ob.price.toFixed(2)}`;
      const msg = header + (ob.ctaMessage ? `\n\n${ob.ctaMessage}` : '');
      await sendMessage(ctx.token, chatId, msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
      return;
    }
  }
  await proceedToPix(ctx, chatId, telegramUserId);
}

async function handleOrderBump(ctx: BotContext, update: any, accepted: boolean) {
  const cbq = update.callback_query;
  await answerCallbackQuery(ctx.token, cbq.id);
  await updateSession(ctx.botId, String(cbq.from.id), { orderBumpAccepted: accepted });
  await proceedToPix(ctx, cbq.message.chat.id, String(cbq.from.id));
}

// Núcleo da geração de PIX — reutilizado pelo botão "Gerar PIX" e pelo atalho
// (confirmação desativada). Assume que a sessão já tem o plano selecionado.
async function proceedToPix(ctx: BotContext, chatId: number | string, telegramUserId: string) {
  const session = await getSession(ctx.botId, telegramUserId);
  if (!session?.leadId || !session?.selectedPlanId) {
    await sendMessage(ctx.token, chatId, 'Selecione um plano primeiro. Use /start.');
    return;
  }

  const plan = ctx.plans.find((p) => p.id === session.selectedPlanId);
  if (!plan) { await sendMessage(ctx.token, chatId, 'Plano invalido. Use /start.'); return; }

  // Preço: priceOverride (ofertas de esteira) tem prioridade; senão desconto de renovação.
  const discount = session.isRenewal ? Math.min(Math.max(plan.renewalDiscount || 0, 0), 100) : 0;
  let price = session.priceOverride != null
    ? session.priceOverride
    : Math.round(plan.price * (1 - discount / 100) * 100) / 100;

  // Order bump aceito: soma o valor do bump ao total
  const bump = ctx.orderBump;
  const bumpAdded = !!(session.orderBumpAccepted && bump?.enabled);
  if (bumpAdded) price = Math.round((price + (bump!.price || 0)) * 100) / 100;

  // Seleciona gateway via sistema de prioridade/A/B/platform intelligence
  const gw = await gatewayService.selectGateway(ctx.userId);
  if (!gw) {
    await sendMessage(ctx.token, chatId, 'Gateway de pagamento nao configurado. Contate o suporte.');
    return;
  }

  await sendChatAction(ctx.token, chatId, 'typing');

  try {
    const pix = await createPix(gw.apiKey, price, `${plan.name} - ${session.leadId}`);

    const pmt = await payment.createPayment({
      leadId:          session.leadId,
      planId:          plan.id,
      amount:          price,
      gateway:         gw.provider,
      gatewayTxId:     pix.transactionId,
      qrCode:          pix.qrCode,
      copyPaste:       pix.copyPaste,
      expiresAt:       new Date(pix.expiresAt),
      gatewayConfigId: gw.id,
      ...(session.funnelStepId ? { funnelStepId: session.funnelStepId } : {}),
    });

    // Registra uso do gateway (para A/B tracking)
    await gatewayService.trackPixGenerated(gw.id, gw.provider);

    // Atualiza lead
    await prisma.lead.update({
      where: { id: session.leadId },
      data:  { status: 'pix_generated', pixCount: { increment: 1 } },
    });
    await logLeadEvent(session.leadId, 'pix_generated', { paymentId: pmt.id, amount: price });

    // ── Monta a mensagem do PIX a partir do paymentConfig (configurável) ──
    const cfg = ctx.payConfig || {};
    const lead = await prisma.lead.findUnique({ where: { id: session.leadId }, select: { firstName: true } });
    const body = applyPixVars(cfg.pixText || DEFAULT_PIX_TEXT, {
      '{nome}':     lead?.firstName || 'amigo',
      '{plano}':    plan.name,
      '{valor}':    `R$ ${price.toFixed(2)}`,
      '{qr_code}':  pix.copyPaste,
      '{saudacao}': saudacao(),
      '{uf}':       '',
    });
    const codeFmt    = cfg.pixFormat === 'plain' ? pix.copyPaste : `<code>${pix.copyPaste}</code>`;
    const beforeCode = cfg.beforeCodeMsg || 'Copie o código abaixo:';
    const beforeBtns = cfg.buttonsBeforeMsg || '';
    const keyboard = {
      inline_keyboard: [
        [{ text: cfg.btnCopyLabel || '📋 Copiar Código', copy_text: { text: pix.copyPaste } }],
        [{ text: cfg.btnStatusLabel || '✅ Verificar Status', callback_data: `check_payment:${pmt.id}` }],
        [{ text: 'Cancelar', callback_data: 'cancel' }],
      ],
    };
    const codeMsg = `${beforeCode}\n${codeFmt}${beforeBtns ? `\n\n${beforeBtns}` : ''}`;
    const qrDisplay = cfg.qrDisplay || 'message';

    // Mídia própria do PIX (imagem/vídeo de branding) — opcional, antes do QR
    for (const m of normMediaList(cfg.pixMediaFileIds)) {
      try { await sendCachedMedia(ctx.token, chatId, m); } catch (e) { console.error(`[WORKER ${ctx.botId}] pix media error:`, e); }
    }

    if (qrDisplay !== 'none' && pix.qrCodeBase64) {
      if (qrDisplay === 'separate') {
        await sendMessage(ctx.token, chatId, body, { parse_mode: 'HTML' });
        await sendPhotoBase64(ctx.token, chatId, pix.qrCodeBase64);
      } else {
        await sendPhotoBase64(ctx.token, chatId, pix.qrCodeBase64, body); // imagem + legenda
      }
      await sendMessage(ctx.token, chatId, codeMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await sendMessage(ctx.token, chatId, `${body}\n\n${codeMsg}`, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (err) {
    console.error(`[WORKER ${ctx.botId}] Erro ao gerar PIX:`, err);
    await sendMessage(ctx.token, chatId, 'Erro ao gerar PIX. Tente novamente em instantes.');
  }
}

async function handleCheckPayment(ctx: BotContext, update: any, paymentId: string) {
  const cbq    = update.callback_query;
  const chatId = cbq.message.chat.id;

  await answerCallbackQuery(ctx.token, cbq.id);

  const pmt = await payment.getPaymentById(paymentId);
  if (!pmt) { await sendMessage(ctx.token, chatId, 'Pagamento nao encontrado.'); return; }

  if (pmt.status === 'paid') {
    await sendMessage(ctx.token, chatId, 'Pagamento ja confirmado! Seu acesso foi liberado.');
    return;
  }

  if (pmt.status !== 'pending') {
    await sendMessage(ctx.token, chatId, 'Este pagamento nao esta mais ativo. Use /start para gerar novo.');
    return;
  }

  await sendMessage(ctx.token, chatId,
    'Ainda nao identificamos seu pagamento.\n\nAguarde alguns instantes apos pagar e tente novamente.',
    {
      reply_markup: {
        inline_keyboard: [[{ text: 'Verificar novamente', callback_data: `check_payment:${paymentId}` }]],
      },
    }
  );
}

async function handleBackToPlans(ctx: BotContext, update: any) {
  const cbq = update.callback_query;
  await answerCallbackQuery(ctx.token, cbq.id);
  if (ctx.plans.length > 0) {
    await sendMessage(ctx.token, cbq.message.chat.id, 'Escolha um plano:', {
      reply_markup: buildPlansKeyboard(ctx.plans),
    });
  }
}

async function handleSupport(ctx: BotContext, update: any) {
  const cbq = update.callback_query;
  await answerCallbackQuery(ctx.token, cbq.id);
  await sendMessage(ctx.token, cbq.message.chat.id, 'Para suporte, entre em contato com o administrador.');
}

async function handleCancel(ctx: BotContext, update: any) {
  const cbq = update.callback_query;
  await answerCallbackQuery(ctx.token, cbq.id);
  await sendMessage(ctx.token, cbq.message.chat.id, 'Cancelado. Use /start para recomecar.');
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

// Descobre canais/grupos onde o bot virou (ou deixou de ser) administrador.
async function handleMyChatMember(ctx: BotContext, update: any) {
  const m = update.my_chat_member;
  const chat = m?.chat;
  if (!chat) return;
  const status = m.new_chat_member?.status;

  // Chat privado: 'kicked' = o lead bloqueou o bot; 'member' = desbloqueou.
  if (chat.type === 'private') {
    try {
      const telegramUserId = String(m.from?.id ?? chat.id);
      const lead = await prisma.lead.findUnique({ where: { botId_telegramUserId: { botId: ctx.botId, telegramUserId } } });
      if (!lead) return;
      if (status === 'kicked') {
        await prisma.lead.update({ where: { id: lead.id }, data: { blockedAt: new Date() } });
        await logLeadEvent(lead.id, 'blocked');
      } else if (status === 'member' && lead.blockedAt) {
        await prisma.lead.update({ where: { id: lead.id }, data: { blockedAt: null } });
      }
    } catch (e) { console.error(`[WORKER ${ctx.botId}] block detect error:`, e); }
    return;
  }

  const chatId = String(chat.id);
  const isAdmin = status === 'administrator' || status === 'creator';
  try {
    if (isAdmin) {
      await prisma.botChannel.upsert({
        where: { botId_chatId: { botId: ctx.botId, chatId } },
        create: { botId: ctx.botId, chatId, title: chat.title ?? null, type: chat.type, isAdmin: true },
        update: { title: chat.title ?? null, type: chat.type, isAdmin: true },
      });
    } else {
      await prisma.botChannel.updateMany({ where: { botId: ctx.botId, chatId }, data: { isAdmin: false } });
    }
  } catch (e) { console.error(`[WORKER ${ctx.botId}] my_chat_member error:`, e); }
}

async function processUpdate(ctx: BotContext, update: any) {
  const text:         string | undefined = update.message?.text;
  const callbackData: string | undefined = update.callback_query?.data;

  if (update.my_chat_member) { await handleMyChatMember(ctx, update); return; }

  if (text?.startsWith('/start')) { await handleStart(ctx, update); return; }

  if (callbackData) {
    if      (callbackData.startsWith('select_plan:'))    await handleSelectPlan(ctx, update, callbackData.slice(12));
    else if (callbackData.startsWith('renew_plan:'))     await handleRenewPlan(ctx, update, callbackData.slice(11));
    else if (callbackData === 'generate_pix')            await handleGeneratePix(ctx, update);
    else if (callbackData === 'ob_yes')                  await handleOrderBump(ctx, update, true);
    else if (callbackData === 'ob_no')                   await handleOrderBump(ctx, update, false);
    else if (callbackData.startsWith('fb:'))             { const [, s, p] = callbackData.split(':'); await handleFunnelBuy(ctx, update, s, p); }
    else if (callbackData.startsWith('fn:'))             await handleFunnelReject(ctx, update, callbackData.slice(3));
    else if (callbackData.startsWith('check_payment:'))  await handleCheckPayment(ctx, update, callbackData.slice(14));
    else if (callbackData === 'back_to_plans')           await handleBackToPlans(ctx, update);
    else if (callbackData === 'support')                 await handleSupport(ctx, update);
    else if (callbackData === 'cancel')                  await handleCancel(ctx, update);
  }
}

// ─── Worker loop ──────────────────────────────────────────────────────────────

export async function startBotWorker(botId: string) {
  console.log(`[WORKER ${botId}] Starting...`);

  const ctx = await loadBotContext(botId);
  if (!ctx) { console.error(`[WORKER ${botId}] Bot not found`); process.exit(1); }

  console.log(`[WORKER ${botId}] Loaded: ${ctx.plans.length} plans, flow: ${ctx.flowId ?? 'none'}`);

  while (true) {
    try {
      const update = await consumeBotMessage(botId, 30);
      if (!update) continue;

      const freshCtx = await loadBotContext(botId);
      if (!freshCtx) continue;

      await processUpdate(freshCtx, update);
    } catch (err) {
      console.error(`[WORKER ${botId}] Error:`, err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
