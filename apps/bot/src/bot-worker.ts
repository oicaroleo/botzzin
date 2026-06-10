import { prisma } from './db.js';
import { consumeBotMessage, getSession, setSession, updateSession } from './redis.js';
import { createPix } from './services/pushpay.service.js';
import { generateInviteLink, sendMessage, answerCallbackQuery, sendChatAction, sendCachedMedia } from './services/channel.service.js';
import { gatewayService } from './services/gateway.service.js';
import { flowService } from './services/flow.service.js';
import * as payment from './services/payment.service.js';

// ─── Context ──────────────────────────────────────────────────────────────────

interface BotContext {
  botId:          string;
  userId:         string;   // dono do bot
  token:          string;
  channelId:      string | null;
  plans:          Array<{ id: string; name: string; emoji: string; price: number; days: number }>;
  welcomeMessage: string | null;
  welcomeMedia:   Array<{ fileId: string; type: string }>;
  flowId:         string | null;
}

async function loadBotContext(botId: string): Promise<BotContext | null> {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { user: true },
  });
  if (!bot) return null;

  // Tenta carregar fluxo associado
  const flow = await flowService.loadFlowForBot(botId);

  const plans = flow?.plans.map((p: any) => ({
    id: p.id, name: p.name, emoji: p.emoji, price: p.price, days: p.days,
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
    plans,
  };
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

  await updateSession(ctx.botId, telegramUserId, { selectedPlanId: plan.id });

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

async function handleGeneratePix(ctx: BotContext, update: any) {
  const cbq  = update.callback_query;
  const chatId = cbq.message.chat.id;
  const telegramUserId = String(cbq.from.id);

  await answerCallbackQuery(ctx.token, cbq.id);

  const session = await getSession(ctx.botId, telegramUserId);
  if (!session?.leadId || !session?.selectedPlanId) {
    await sendMessage(ctx.token, chatId, 'Selecione um plano primeiro. Use /start.');
    return;
  }

  const plan = ctx.plans.find((p) => p.id === session.selectedPlanId);
  if (!plan) { await sendMessage(ctx.token, chatId, 'Plano invalido. Use /start.'); return; }

  // Seleciona gateway via sistema de prioridade/A/B/platform intelligence
  const gw = await gatewayService.selectGateway(ctx.userId);
  if (!gw) {
    await sendMessage(ctx.token, chatId, 'Gateway de pagamento nao configurado. Contate o suporte.');
    return;
  }

  await sendChatAction(ctx.token, chatId, 'typing');

  try {
    const pix = await createPix(gw.apiKey, plan.price, `${plan.name} - ${session.leadId}`);

    const pmt = await payment.createPayment({
      leadId:          session.leadId,
      planId:          plan.id,
      amount:          plan.price,
      gateway:         gw.provider,
      gatewayTxId:     pix.transactionId,
      qrCode:          pix.qrCode,
      copyPaste:       pix.copyPaste,
      expiresAt:       new Date(pix.expiresAt),
      gatewayConfigId: gw.id,
    });

    // Registra uso do gateway (para A/B tracking)
    await gatewayService.trackPixGenerated(gw.id, gw.provider);

    // Atualiza lead
    await prisma.lead.update({
      where: { id: session.leadId },
      data:  { status: 'pix_generated', pixCount: { increment: 1 } },
    });

    await sendMessage(ctx.token, chatId,
      `*PIX Gerado!*\n\n` +
      `Plano: ${plan.emoji} ${plan.name}\n` +
      `Valor: *R$ ${plan.price.toFixed(2)}*\n` +
      `Expira em: 60 minutos\n\n` +
      `*Copia e Cola:*\n\`${pix.copyPaste}\`\n\n` +
      `Apos pagar, toque em "Ja Paguei".`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Ja Paguei', callback_data: `check_payment:${pmt.id}` }],
            [{ text: 'Cancelar', callback_data: 'cancel' }],
          ],
        },
      }
    );
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
  if (!chat || chat.type === 'private') return;
  const chatId = String(chat.id);
  const status = m.new_chat_member?.status;
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
    else if (callbackData === 'generate_pix')            await handleGeneratePix(ctx, update);
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
