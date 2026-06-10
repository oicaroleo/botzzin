import { prisma } from '../db.js';
import { sendMediaToChat } from './channel.service.js';

export interface FlowInput {
  name: string;
  description?: string;
  welcomeMessage?: string;
  welcomeMediaFileIds?: any;
  pixMessage?: string;
  confirmMessage?: string;
  deliveryType?: string;
  channelId?: string;
  deliveryValue?: string;
  priceVariationEnabled?: boolean;
  priceVariationMin?: number;
  priceVariationMax?: number;
  mediaCacheChatId?: string;
  randomDistribution?: boolean;
  redirectSlug?: string;
  redirectDomain?: string;
  ctaEnabled?: boolean;
  ctaButtons?: any;
  downsellEnabled?: boolean;
  downsellMessage?: string;
  downsellDelayMins?: number;
  downsellDiscount?: number;
  upsellEnabled?: boolean;
  upsellMessage?: string;
  upsellDelayMins?: number;
  upsellAdvanceRule?: string;
  downsellAdvanceRule?: string;
  downsellTrigger?: string;
  upsellDeliveryType?: string;
  upsellDeliveryValue?: string;
  downsellDeliveryType?: string;
  downsellDeliveryValue?: string;
  paymentConfig?: any;
  orderbumpEnabled?: boolean;
  orderbumpMessage?: string;
  orderbumpPlanId?: string;
  obApplyUpsell?: boolean;
  obApplyDownsell?: boolean;
  obApplyPack?: boolean;
}

async function assertFlowOwner(flowId: string, userId: string) {
  const flow = await prisma.flow.findFirst({ where: { id: flowId, userId } });
  if (!flow) throw new Error('Fluxo não encontrado');
  return flow;
}

export const flowService = {

  async listFlows(userId: string) {
    return prisma.flow.findMany({
      where: { userId },
      include: {
        bots:  { include: { bot: { select: { id: true, telegramUsername: true, telegramBotId: true, status: true } } } },
        plans: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { plans: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getFlow(flowId: string, userId: string) {
    const flow = await prisma.flow.findFirst({
      where: { id: flowId, userId },
      include: {
        bots:  { include: { bot: { select: { id: true, telegramUsername: true, telegramBotId: true, status: true, name: true } } } },
        plans: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        funnelSteps: { orderBy: [{ kind: 'asc' }, { order: 'asc' }] },
        orderBumps: true,
      },
    });
    if (!flow) throw new Error('Fluxo não encontrado');

    // ── Mini-dashboard: leads cadastrados neste fluxo + receita confirmada ──
    const botIds = flow.bots.map((fb: any) => fb.bot.id);
    const [leadCount, revenueAgg] = await Promise.all([
      prisma.lead.count({ where: { flowId } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'paid', lead: { flowId } },
      }),
    ]);

    return {
      ...flow,
      stats: {
        botCount: botIds.length,
        leadCount,
        revenue: revenueAgg._sum.amount ?? 0,
      },
    };
  },

  async createFlow(userId: string, input: FlowInput) {
    if (!input.name?.trim()) throw new Error('Nome do fluxo é obrigatório');
    return prisma.flow.create({
      data: {
        userId,
        name: input.name.trim(),
        description: input.description,
        welcomeMessage: input.welcomeMessage,
        pixMessage: input.pixMessage,
        confirmMessage: input.confirmMessage,
        deliveryType: input.deliveryType || 'channel',
        channelId: input.channelId,
        deliveryValue: input.deliveryValue,
        priceVariationEnabled: input.priceVariationEnabled ?? false,
        priceVariationMin: input.priceVariationMin,
        priceVariationMax: input.priceVariationMax,
        mediaCacheChatId: input.mediaCacheChatId,
        randomDistribution: input.randomDistribution ?? false,
        redirectSlug: input.redirectSlug,
        redirectDomain: input.redirectDomain,
        ctaEnabled: input.ctaEnabled ?? false,
        ctaButtons: input.ctaButtons ?? undefined,
        downsellEnabled: input.downsellEnabled ?? false,
        downsellMessage: input.downsellMessage,
        downsellDelayMins: input.downsellDelayMins ?? 30,
        downsellDiscount: input.downsellDiscount,
        upsellEnabled: input.upsellEnabled ?? false,
        upsellMessage: input.upsellMessage,
        upsellDelayMins: input.upsellDelayMins ?? 60,
        upsellAdvanceRule: input.upsellAdvanceRule ?? 'onlyIfPaid',
        downsellAdvanceRule: input.downsellAdvanceRule ?? 'always',
        downsellTrigger: input.downsellTrigger ?? 'both',
        orderbumpEnabled: input.orderbumpEnabled ?? false,
        orderbumpMessage: input.orderbumpMessage,
        orderbumpPlanId: input.orderbumpPlanId,
      },
    });
  },

  async updateFlow(flowId: string, userId: string, input: Partial<FlowInput> & { isActive?: boolean }) {
    await assertFlowOwner(flowId, userId);
    return prisma.flow.update({
      where: { id: flowId },
      data: {
        ...(input.name               !== undefined && { name:               input.name }),
        ...(input.description        !== undefined && { description:        input.description }),
        ...(input.welcomeMessage     !== undefined && { welcomeMessage:     input.welcomeMessage }),
        ...(input.welcomeMediaFileIds !== undefined && { welcomeMediaFileIds: input.welcomeMediaFileIds ?? null }),
        ...(input.pixMessage         !== undefined && { pixMessage:         input.pixMessage }),
        ...(input.confirmMessage     !== undefined && { confirmMessage:     input.confirmMessage }),
        ...(input.deliveryType          !== undefined && { deliveryType:          input.deliveryType }),
        ...(input.channelId             !== undefined && { channelId:             input.channelId }),
        ...(input.deliveryValue         !== undefined && { deliveryValue:         input.deliveryValue }),
        ...(input.priceVariationEnabled !== undefined && { priceVariationEnabled: input.priceVariationEnabled }),
        ...(input.priceVariationMin     !== undefined && { priceVariationMin:     input.priceVariationMin }),
        ...(input.priceVariationMax     !== undefined && { priceVariationMax:     input.priceVariationMax }),
        ...(input.mediaCacheChatId   !== undefined && { mediaCacheChatId:   input.mediaCacheChatId }),
        ...(input.randomDistribution !== undefined && { randomDistribution: input.randomDistribution }),
        ...(input.redirectSlug       !== undefined && { redirectSlug:       input.redirectSlug }),
        ...(input.redirectDomain     !== undefined && { redirectDomain:     input.redirectDomain }),
        ...(input.ctaEnabled         !== undefined && { ctaEnabled:         input.ctaEnabled }),
        ...(input.ctaButtons         !== undefined && { ctaButtons:         input.ctaButtons }),
        ...(input.downsellEnabled    !== undefined && { downsellEnabled:    input.downsellEnabled }),
        ...(input.downsellMessage    !== undefined && { downsellMessage:    input.downsellMessage }),
        ...(input.downsellDelayMins  !== undefined && { downsellDelayMins:  input.downsellDelayMins }),
        ...(input.downsellDiscount   !== undefined && { downsellDiscount:   input.downsellDiscount }),
        ...(input.upsellEnabled       !== undefined && { upsellEnabled:       input.upsellEnabled }),
        ...(input.upsellMessage       !== undefined && { upsellMessage:       input.upsellMessage }),
        ...(input.upsellDelayMins     !== undefined && { upsellDelayMins:     input.upsellDelayMins }),
        ...(input.upsellAdvanceRule   !== undefined && { upsellAdvanceRule:   input.upsellAdvanceRule }),
        ...(input.downsellAdvanceRule !== undefined && { downsellAdvanceRule: input.downsellAdvanceRule }),
        ...(input.downsellTrigger     !== undefined && { downsellTrigger:     input.downsellTrigger }),
        ...(input.upsellDeliveryType    !== undefined && { upsellDeliveryType:    input.upsellDeliveryType }),
        ...(input.upsellDeliveryValue   !== undefined && { upsellDeliveryValue:   input.upsellDeliveryValue }),
        ...(input.downsellDeliveryType  !== undefined && { downsellDeliveryType:  input.downsellDeliveryType }),
        ...(input.downsellDeliveryValue !== undefined && { downsellDeliveryValue: input.downsellDeliveryValue }),
        ...(input.paymentConfig      !== undefined && { paymentConfig:      input.paymentConfig }),
        ...(input.orderbumpEnabled   !== undefined && { orderbumpEnabled:   input.orderbumpEnabled }),
        ...(input.orderbumpMessage   !== undefined && { orderbumpMessage:   input.orderbumpMessage }),
        ...(input.orderbumpPlanId    !== undefined && { orderbumpPlanId:    input.orderbumpPlanId }),
        ...(input.obApplyUpsell      !== undefined && { obApplyUpsell:      input.obApplyUpsell }),
        ...(input.obApplyDownsell    !== undefined && { obApplyDownsell:    input.obApplyDownsell }),
        ...(input.obApplyPack        !== undefined && { obApplyPack:        input.obApplyPack }),
        ...(input.isActive           !== undefined && { isActive:           input.isActive }),
      },
    });
  },

  async deleteFlow(flowId: string, userId: string) {
    await assertFlowOwner(flowId, userId);
    await prisma.flow.delete({ where: { id: flowId } });
  },

  // ─── Bots ─────────────────────────────────────────────────────────────────

  async assignBot(flowId: string, userId: string, botId: string) {
    await assertFlowOwner(flowId, userId);
    // Verifica que o bot pertence ao mesmo usuário
    const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
    if (!bot) throw new Error('Bot não encontrado');

    // Remove de qualquer fluxo anterior
    await prisma.flowBot.deleteMany({ where: { botId } });

    return prisma.flowBot.create({ data: { flowId, botId } });
  },

  async removeBot(flowId: string, userId: string, botId: string) {
    await assertFlowOwner(flowId, userId);
    await prisma.flowBot.deleteMany({ where: { flowId, botId } });
  },

  // ─── Planos do fluxo ──────────────────────────────────────────────────────

  async createPlan(flowId: string, userId: string, input: {
    name: string; price: number; days: number; description?: string; emoji?: string; sortOrder?: number;
    useDefaultDelivery?: boolean; deliveryType?: string; deliveryValue?: string;
  }) {
    await assertFlowOwner(flowId, userId);
    if (!input.name?.trim()) throw new Error('Nome do plano é obrigatório');
    if (!input.days || input.days < 1) throw new Error('Dias deve ser maior que 0');
    if (input.price == null || input.price < 0) throw new Error('Preço inválido');

    // Se for o primeiro plano, marca como padrão
    const count = await prisma.plan.count({ where: { flowId } });

    return prisma.plan.create({
      data: {
        flowId,
        name: input.name.trim(),
        description: input.description,
        days: input.days,
        price: input.price,
        emoji: input.emoji || '💎',
        isDefault: count === 0,
        isActive: true,
        sortOrder: input.sortOrder ?? count,
        useDefaultDelivery: input.useDefaultDelivery ?? true,
        deliveryType: input.deliveryType,
        deliveryValue: input.deliveryValue,
      },
    });
  },

  async updatePlan(flowId: string, userId: string, planId: string, input: any) {
    await assertFlowOwner(flowId, userId);
    const plan = await prisma.plan.findFirst({ where: { id: planId, flowId } });
    if (!plan) throw new Error('Plano não encontrado');
    return prisma.plan.update({ where: { id: planId }, data: input });
  },

  async deletePlan(flowId: string, userId: string, planId: string) {
    await assertFlowOwner(flowId, userId);
    const plan = await prisma.plan.findFirst({ where: { id: planId, flowId } });
    if (!plan) throw new Error('Plano não encontrado');
    await prisma.plan.delete({ where: { id: planId } });
  },

  async setDefaultPlan(flowId: string, userId: string, planId: string) {
    await assertFlowOwner(flowId, userId);
    await prisma.plan.updateMany({ where: { flowId }, data: { isDefault: false } });
    return prisma.plan.update({ where: { id: planId }, data: { isDefault: true } });
  },

  // ─── Esteira (funnel steps: upsell / downsell) ─────────────────────────────

  async createStep(flowId: string, userId: string, input: {
    kind: string; message: string; delayMins?: number; planId?: string; mediaFileId?: string;
    sendTiming?: string; discountType?: string; discountValue?: number; planIds?: any;
    acceptLabel?: string; rejectLabel?: string; hideReject?: boolean;
    mediaFileIds?: any; deliveryType?: string; deliveryValue?: string;
  }) {
    await assertFlowOwner(flowId, userId);
    if (input.kind !== 'upsell' && input.kind !== 'downsell') throw new Error('Tipo de esteira inválido');
    if (!input.message?.trim()) throw new Error('Mensagem é obrigatória');
    const count = await prisma.funnelStep.count({ where: { flowId, kind: input.kind } });
    if (count >= 20) throw new Error('Máximo de 20 sequências por esteira');
    return prisma.funnelStep.create({
      data: {
        flowId,
        kind: input.kind,
        message: input.message.trim(),
        delayMins: input.delayMins ?? 60,
        planId: input.planId,
        mediaFileId: input.mediaFileId,
        order: count,
        sendTiming: input.sendTiming ?? 'delay',
        discountType: input.discountType,
        discountValue: input.discountValue,
        planIds: input.planIds ?? undefined,
        acceptLabel: input.acceptLabel,
        rejectLabel: input.rejectLabel,
        hideReject: input.hideReject ?? false,
        mediaFileIds: input.mediaFileIds ?? undefined,
        deliveryType: input.deliveryType,
        deliveryValue: input.deliveryValue,
      },
    });
  },

  async updateStep(flowId: string, userId: string, stepId: string, input: any) {
    await assertFlowOwner(flowId, userId);
    const step = await prisma.funnelStep.findFirst({ where: { id: stepId, flowId } });
    if (!step) throw new Error('Passo não encontrado');
    return prisma.funnelStep.update({
      where: { id: stepId },
      data: {
        ...(input.message       !== undefined && { message:       input.message }),
        ...(input.delayMins     !== undefined && { delayMins:     input.delayMins }),
        ...(input.planId        !== undefined && { planId:        input.planId }),
        ...(input.order         !== undefined && { order:         input.order }),
        ...(input.mediaFileId   !== undefined && { mediaFileId:   input.mediaFileId }),
        ...(input.sendTiming    !== undefined && { sendTiming:    input.sendTiming }),
        ...(input.discountType  !== undefined && { discountType:  input.discountType }),
        ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
        ...(input.planIds       !== undefined && { planIds:       input.planIds }),
        ...(input.acceptLabel   !== undefined && { acceptLabel:   input.acceptLabel }),
        ...(input.rejectLabel   !== undefined && { rejectLabel:   input.rejectLabel }),
        ...(input.hideReject    !== undefined && { hideReject:    input.hideReject }),
        ...(input.mediaFileIds  !== undefined && { mediaFileIds:  input.mediaFileIds }),
        ...(input.deliveryType  !== undefined && { deliveryType:  input.deliveryType }),
        ...(input.deliveryValue !== undefined && { deliveryValue: input.deliveryValue }),
      },
    });
  },

  async deleteStep(flowId: string, userId: string, stepId: string) {
    await assertFlowOwner(flowId, userId);
    const step = await prisma.funnelStep.findFirst({ where: { id: stepId, flowId } });
    if (!step) throw new Error('Passo não encontrado');
    await prisma.funnelStep.delete({ where: { id: stepId } });
  },

  // ─── Order Bump (por contexto: main | upsell | downsell | pack) ────────────

  async upsertOrderBump(flowId: string, userId: string, context: string, input: {
    enabled?: boolean; message?: string; offerPlanId?: string;
    name?: string; price?: number;
    acceptLabel?: string; rejectLabel?: string; hideReject?: boolean; ctaMessage?: string;
    mediaFileIds?: any; deliveryType?: string; deliveryValue?: string;
  }) {
    await assertFlowOwner(flowId, userId);
    const valid = ['main', 'upsell', 'downsell', 'pack'];
    if (!valid.includes(context)) throw new Error('Contexto inválido');
    return prisma.orderBump.upsert({
      where: { flowId_context: { flowId, context } },
      create: {
        flowId, context,
        enabled: input.enabled ?? false,
        message: input.message,
        offerPlanId: input.offerPlanId,
        name: input.name,
        price: input.price,
        acceptLabel: input.acceptLabel,
        rejectLabel: input.rejectLabel,
        hideReject: input.hideReject ?? false,
        ctaMessage: input.ctaMessage,
        mediaFileIds: input.mediaFileIds ?? undefined,
        deliveryType: input.deliveryType,
        deliveryValue: input.deliveryValue,
      },
      update: {
        ...(input.enabled       !== undefined && { enabled:       input.enabled }),
        ...(input.message       !== undefined && { message:       input.message }),
        ...(input.offerPlanId   !== undefined && { offerPlanId:   input.offerPlanId }),
        ...(input.name          !== undefined && { name:          input.name }),
        ...(input.price         !== undefined && { price:         input.price }),
        ...(input.acceptLabel   !== undefined && { acceptLabel:   input.acceptLabel }),
        ...(input.rejectLabel   !== undefined && { rejectLabel:   input.rejectLabel }),
        ...(input.hideReject    !== undefined && { hideReject:    input.hideReject }),
        ...(input.ctaMessage    !== undefined && { ctaMessage:    input.ctaMessage }),
        ...(input.mediaFileIds  !== undefined && { mediaFileIds:  input.mediaFileIds }),
        ...(input.deliveryType  !== undefined && { deliveryType:  input.deliveryType }),
        ...(input.deliveryValue !== undefined && { deliveryValue: input.deliveryValue }),
      },
    });
  },

  // ─── Canais/grupos onde os bots do fluxo são admin (auto-detecção) ─────────

  async listFlowChannels(flowId: string, userId: string) {
    await assertFlowOwner(flowId, userId);
    const fbs = await prisma.flowBot.findMany({ where: { flowId }, select: { botId: true } });
    const botIds = fbs.map((f: { botId: string }) => f.botId);
    if (!botIds.length) return [];
    const chans = await prisma.botChannel.findMany({
      where: { botId: { in: botIds }, isAdmin: true },
      orderBy: [{ title: 'asc' }],
    });
    // dedupe por chatId (vários bots podem ser admin do mesmo canal)
    const seen = new Map<string, { chatId: string; title: string | null; type: string }>();
    for (const c of chans) if (!seen.has(c.chatId)) seen.set(c.chatId, { chatId: c.chatId, title: c.title, type: c.type });
    return Array.from(seen.values());
  },

  // ─── Upload de mídia (prévia) para o canal de cache do fluxo ───────────────
  // Envia o arquivo via um bot do fluxo ao canal de cache e devolve o file_id.

  async uploadMedia(flowId: string, userId: string, file: { buffer: Buffer; filename: string; mimeType: string }) {
    await assertFlowOwner(flowId, userId);
    const flow = await prisma.flow.findFirst({
      where: { id: flowId },
      include: { bots: { include: { bot: { select: { telegramBotToken: true } } } } },
    });
    if (!flow) throw new Error('Fluxo não encontrado');
    if (!flow.mediaCacheChatId) throw new Error('Configure o canal de cache de mídia na aba Bots antes de enviar mídias.');
    const token = flow.bots?.[0]?.bot?.telegramBotToken;
    if (!token) throw new Error('Adicione um bot ao fluxo antes de enviar mídias.');
    if (!file?.buffer?.length) throw new Error('Arquivo vazio');

    return sendMediaToChat(token, flow.mediaCacheChatId, file.buffer, file.filename, file.mimeType);
  },

  // ─── Loader para o worker ──────────────────────────────────────────────────
  // Dado um botId, retorna o fluxo ativo e seus planos.

  async loadFlowForBot(botId: string) {
    const flowBot = await prisma.flowBot.findFirst({
      where: { botId },
      include: {
        flow: {
          include: {
            plans: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });
    return flowBot?.flow ?? null;
  },
};
