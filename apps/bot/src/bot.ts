import { Bot, Context, InlineKeyboard } from 'grammy';
import { config } from './config';
import { leadService } from './services/lead.service';
import { paymentService } from './services/payment.service';
import { pushpayService } from './services/pushpay.service';
import { botService } from './services/bot.service';
import { planService } from './services/plan.service';
import { prisma } from './db';

// Store para armazenar botId e dados de sessão
let defaultBotId = 'default-bot';
let defaultBotConfig: any = null;
let botPlans: any[] = [];

// Inicializar e obter botId padrão + configurações
async function initializeDefaultBot() {
  try {
    const bot = await botService.getOrCreateDefaultBot();
    defaultBotId = bot.id;

    // Buscar configurações do bot
    defaultBotConfig = await prisma.bot.findUnique({
      where: { id: defaultBotId },
      include: {
        plans: {
          include: { plan: true },
          orderBy: { plan: { priority: 'asc' } },
        },
      },
    });

    // Extrair planos
    if (defaultBotConfig?.plans) {
      botPlans = defaultBotConfig.plans.map((bp: any) => ({
        id: bp.plan.id,
        name: bp.plan.name,
        days: bp.plan.days,
        price: bp.plan.price,
        emoji: bp.plan.emoji,
        isDefault: bp.isDefault,
      }));
    }

    console.log('[BOT] Default bot initialized:', defaultBotId);
    console.log('[BOT] Plans loaded:', botPlans.length, 'plans');
    if (defaultBotConfig?.welcomeMessage) {
      console.log('[BOT] Welcome message configured');
    }
  } catch (error) {
    console.error('[BOT] Error initializing default bot:', error);
  }
}

// Chamar inicialização
initializeDefaultBot();

// Inicializar bot
export const bot = new Bot(config.telegram.botToken!, {
  botInfo: {
    id: 0,
    is_bot: true,
    first_name: 'BotZZIN',
    username: 'botzzin',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
  },
});

// Store temporário para rastrear leads durante a sessão
const sessionStore = new Map<number, { leadId: string; botId: string; selectedPlan?: any }>();

/**
 * Comando /start - Mostrar boas-vindas e planos disponíveis
 */
bot.command('start', async (ctx) => {
  try {
    const telegramUserId = String(ctx.from?.id);
    const firstName = ctx.from?.first_name || 'Amigo';

    // Registrar lead no banco
    const lead = await leadService.registerOrUpdateLead(
      defaultBotId,
      telegramUserId,
      {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
      }
    );

    // Salvar na sessão
    sessionStore.set(ctx.from!.id, {
      leadId: lead.id,
      botId: defaultBotId,
    });

    // Obter configurações atualizadas do bot
    const currentConfig = await prisma.bot.findUnique({
      where: { id: defaultBotId },
    });

    // Mensagem de boas-vindas (customizável)
    const welcomeMessage = currentConfig?.welcomeMessage ||
      `👋 Bem-vindo, ${firstName}!\n\n` +
      'Aqui você pode:\n' +
      '✅ Gerar PIX para pagamento\n' +
      '✅ Acessar conteúdo exclusivo\n' +
      '✅ Receber suporte 24/7\n\n' +
      'Escolha um plano abaixo para começar!';

    // Se tem planos, mostrar opções
    if (botPlans.length > 0) {
      const plansKeyboard = new InlineKeyboard();

      // Adicionar botão para cada plano
      botPlans.forEach((plan, idx) => {
        const planText = `${plan.emoji} ${plan.name} (R$ ${plan.price.toFixed(2)})`;
        plansKeyboard.text(planText, `select_plan:${plan.id}`);
        // Nova linha a cada 2 planos
        if ((idx + 1) % 2 === 0) {
          plansKeyboard.row();
        }
      });

      // Botão de suporte
      plansKeyboard.row().text('📱 Suporte', 'support');

      await ctx.reply(welcomeMessage, {
        reply_markup: plansKeyboard,
      });
    } else {
      // Sem planos, mostrar botão genérico
      const defaultKeyboard = new InlineKeyboard()
        .text('💳 Gerar PIX', 'generate_pix')
        .row()
        .text('📱 Suporte', 'support');

      await ctx.reply(welcomeMessage, {
        reply_markup: defaultKeyboard,
      });
    }

    console.log(`[BOT] Lead registered: ${lead.id} (User: ${telegramUserId})`);
  } catch (error) {
    console.error('[BOT START ERROR]', error);
    await ctx.reply('❌ Erro ao processar seu pedido. Tente novamente.');
  }
});

/**
 * Callback: Selecionar plano
 */
bot.callbackQuery(/^select_plan:(.+)$/, async (ctx) => {
  try {
    const planId = ctx.match![1];
    await ctx.answerCallbackQuery();

    // Buscar plano no banco
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      await ctx.reply('❌ Plano não encontrado.');
      return;
    }

    // Atualizar sessão com plano selecionado
    const session = sessionStore.get(ctx.from!.id);
    if (!session) {
      await ctx.reply('❌ Sessão expirada. Use /start para começar.');
      return;
    }

    session.selectedPlan = plan;

    // Atualizar planDays do lead
    await prisma.lead.update({
      where: { id: session.leadId },
      data: { planDays: plan.days },
    });

    // Mostrar resumo e gerar PIX
    const pixKeyboard = new InlineKeyboard()
      .text('💳 Gerar PIX', 'generate_pix')
      .row()
      .text('🔙 Escolher outro', 'back_to_plans')
      .row()
      .text('📱 Suporte', 'support');

    await ctx.reply(
      `✅ *Plano Selecionado*\n\n` +
      `${plan.emoji} *${plan.name}*\n` +
      `Duração: ${plan.days} dias\n` +
      `Valor: R$ ${plan.price.toFixed(2)}\n\n` +
      `Clique em "Gerar PIX" para continuar.`,
      {
        reply_markup: pixKeyboard,
        parse_mode: 'Markdown',
      }
    );

    console.log(`[BOT] Plan selected: ${plan.name} (${plan.id}) for lead ${session.leadId}`);
  } catch (error) {
    console.error('[BOT SELECT PLAN ERROR]', error);
    await ctx.reply('❌ Erro ao selecionar plano.');
    await ctx.answerCallbackQuery();
  }
});

/**
 * Callback: Voltar para seleção de planos
 */
bot.callbackQuery('back_to_plans', async (ctx) => {
  try {
    await ctx.answerCallbackQuery();

    const session = sessionStore.get(ctx.from!.id);
    if (!session) {
      await ctx.reply('❌ Sessão expirada. Use /start para começar.');
      return;
    }

    // Mostrar planos novamente
    if (botPlans.length > 0) {
      const plansKeyboard = new InlineKeyboard();

      botPlans.forEach((plan, idx) => {
        const planText = `${plan.emoji} ${plan.name} (R$ ${plan.price.toFixed(2)})`;
        plansKeyboard.text(planText, `select_plan:${plan.id}`);
        if ((idx + 1) % 2 === 0) {
          plansKeyboard.row();
        }
      });

      plansKeyboard.row().text('📱 Suporte', 'support');

      await ctx.reply('Escolha um plano:', {
        reply_markup: plansKeyboard,
      });
    }
  } catch (error) {
    console.error('[BOT BACK TO PLANS ERROR]', error);
    await ctx.reply('❌ Erro ao voltar.');
  }
});

/**
 * Callback: Gerar PIX (com valor baseado no plano selecionado)
 */
bot.callbackQuery('generate_pix', async (ctx) => {
  try {
    await ctx.answerCallbackQuery();

    const session = sessionStore.get(ctx.from!.id);
    if (!session) {
      await ctx.reply('❌ Sessão expirada. Use /start para começar.');
      return;
    }

    const { leadId, selectedPlan } = session;
    // Usar preço do plano selecionado, ou fallback para 19.90
    const amount = selectedPlan?.price || 19.9;
    const planName = selectedPlan?.name || 'Plano Padrão';

    // Mostrar "digitando..."
    await ctx.api.sendChatAction(ctx.chat!.id, 'typing');

    // Gerar PIX real via PushinPay
    const pixData = await pushpayService.createPix(
      amount,
      `${planName} - Lead ${leadId}`
    );

    // Obter bot com user ID
    const botData = await botService.getBotById(session.botId);
    const userId = botData?.userId || 'default-user';

    // Salvar no banco
    const payment = await paymentService.createPayment(
      userId,
      leadId,
      amount,
      'pushpay',
      pixData.qr_code,
      pixData.copy_paste,
      new Date(pixData.expires_at)
    );

    // Registrar que PIX foi gerado
    await leadService.recordPixGenerated(leadId);

    const pixKeyboard = new InlineKeyboard()
      .text('✅ Já Paguei', `confirm_payment:${payment.id}`)
      .row()
      .text('❌ Cancelar', 'cancel');

    await ctx.reply(
      `💳 *PIX Gerado com Sucesso!*\n\n` +
      `Plano: ${planName}\n` +
      `Valor: R$ ${amount.toFixed(2)}\n` +
      `Duração: ${selectedPlan?.days || 30} dias\n` +
      `Expira em: 60 minutos\n\n` +
      `*QR Code:*\n\`${pixData.qr_code}\`\n\n` +
      `*Copiar e Colar:*\n\`${pixData.copy_paste}\`\n\n` +
      `Após pagar, clique em "Já Paguei" abaixo.`,
      {
        reply_markup: pixKeyboard,
        parse_mode: 'Markdown',
      }
    );

    console.log(`[BOT] PIX generated: ${payment.id} for lead ${leadId} (${planName} - R$ ${amount})`);
  } catch (error) {
    console.error('[BOT GENERATE PIX ERROR]', error);
    await ctx.reply('❌ Erro ao gerar PIX. Tente novamente em alguns segundos.');
    await ctx.answerCallbackQuery();
  }
});

/**
 * Callback: Confirmar pagamento
 */
bot.callbackQuery(/^confirm_payment:(.+)$/, async (ctx) => {
  try {
    const paymentId = ctx.match![1];
    await ctx.answerCallbackQuery();

    const payment = await paymentService.getPaymentById(paymentId);
    if (!payment) {
      await ctx.reply('❌ Pagamento não encontrado.');
      return;
    }

    // Verificar status real no PushinPay (em produção)
    // Por enquanto, simular confirmação
    await paymentService.confirmPayment(paymentId, {
      confirmedAt: new Date(),
      status: 'confirmed',
    });

    const lead = await leadService.getLeadById(payment.leadId);
    if (lead) {
      await leadService.recordPaymentConfirmed(lead.id, paymentId);
    }

    await ctx.reply(
      '✅ *Pagamento Confirmado!*\n\n' +
      'Seu acesso foi liberado. Bem-vindo! 🎉\n\n' +
      'Link do grupo/canal será enviado em breve...',
      {
        parse_mode: 'Markdown',
      }
    );

    console.log(`[BOT] Payment confirmed: ${paymentId}`);
  } catch (error) {
    console.error('[BOT CONFIRM PAYMENT ERROR]', error);
    await ctx.reply('❌ Erro ao confirmar pagamento.');
  }
});

/**
 * Callback: Suporte
 */
bot.callbackQuery('support', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    '📧 Entre em contato conosco:\n\n' +
    'Email: suporte@botzzin.com\n' +
    'Telegram: @botzzin_support'
  );
});

/**
 * Callback: Cancelar
 */
bot.callbackQuery('cancel', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();
  await ctx.reply('❌ Operação cancelada. Use /start para começar novamente.');
});

/**
 * Handler genérico de erros
 */
bot.catch((err) => {
  console.error('[BOT ERROR]', err);
});

export default bot;
