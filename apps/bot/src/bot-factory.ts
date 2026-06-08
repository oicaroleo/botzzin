import { Bot, Context, InlineKeyboard } from 'grammy';
import { leadService } from './services/lead.service.js';
import { paymentService } from './services/payment.service.js';
import { planService } from './services/plan.service.js';
import { prisma } from './db.js';

interface BotInstance {
  bot: Bot<Context>;
  botId: string;
  token: string;
  config: any;
  plans: any[];
}

// Cache de instâncias de bot criadas
const botInstances = new Map<string, BotInstance>();
// Store temporário para rastrear leads durante a sessão
const sessionStores = new Map<string, Map<number, { leadId: string; botId: string; selectedPlan?: any }>>();

/**
 * Criar ou obter instância de bot para um ID específico
 */
export async function getBotInstance(botId: string): Promise<BotInstance> {
  // Se já existe em cache, retornar
  if (botInstances.has(botId)) {
    return botInstances.get(botId)!;
  }

  // Buscar bot no banco de dados
  const botRecord = await prisma.bot.findUnique({
    where: { id: botId },
    include: {
      plans: {
        include: { plan: true },
        orderBy: { plan: { priority: 'asc' } },
      },
    },
  });

  if (!botRecord) {
    throw new Error(`Bot not found: ${botId}`);
  }

  // Extrair planos
  const plans = (botRecord.plans || []).map((bp: any) => ({
    id: bp.plan.id,
    name: bp.plan.name,
    days: bp.plan.days,
    price: bp.plan.price,
    emoji: bp.plan.emoji,
    isDefault: bp.isDefault,
  }));

  // Criar instância de bot com este token
  const botInstance = new Bot(botRecord.telegramBotToken, {
    botInfo: {
      id: parseInt(botRecord.telegramBotId),
      is_bot: true,
      first_name: botRecord.telegramUsername || 'Bot',
      username: botRecord.telegramUsername || 'bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      can_manage_bots: false,
      has_main_web_app: false,
    } as any,
  });

  // Registrar handlers para este bot
  registerBotHandlers(botInstance, botId, botRecord, plans);

  // Criar store de sessão para este bot
  sessionStores.set(botId, new Map());

  // Armazenar em cache
  const instance: BotInstance = {
    bot: botInstance,
    botId,
    token: botRecord.telegramBotToken,
    config: botRecord,
    plans,
  };

  botInstances.set(botId, instance);

  console.log(`[BOT FACTORY] Bot instance created: ${botId}`);

  return instance;
}

/**
 * Registrar handlers para um bot específico
 */
function registerBotHandlers(bot: Bot, botId: string, config: any, plans: any[]) {
  const sessionStore = sessionStores.get(botId)!;

  /**
   * Comando /start
   */
  bot.command('start', async (ctx) => {
    try {
      const telegramUserId = String(ctx.from?.id);
      const firstName = ctx.from?.first_name || 'Amigo';

      // Registrar lead no banco
      const lead = await leadService.registerOrUpdateLead(botId, telegramUserId, {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
      });

      // Salvar na sessão
      sessionStore.set(ctx.from!.id, {
        leadId: lead.id,
        botId,
      });

      // Mensagem de boas-vindas (customizável)
      const welcomeMessage = config?.welcomeMessage ||
        `👋 Bem-vindo, ${firstName}!\n\n` +
        'Aqui você pode:\n' +
        '✅ Gerar PIX para pagamento\n' +
        '✅ Acessar conteúdo exclusivo\n' +
        '✅ Receber suporte 24/7\n\n' +
        'Escolha um plano abaixo para começar!';

      // Se tem planos, mostrar opções
      if (plans.length > 0) {
        const plansKeyboard = new InlineKeyboard();

        plans.forEach((plan, idx) => {
          const planText = `${plan.emoji} ${plan.name} (R$ ${plan.price.toFixed(2)})`;
          plansKeyboard.text(planText, `select_plan:${plan.id}`);
          if ((idx + 1) % 2 === 0) {
            plansKeyboard.row();
          }
        });

        plansKeyboard.row().text('📱 Suporte', 'support');

        await ctx.reply(welcomeMessage, {
          reply_markup: plansKeyboard,
        });
      } else {
        const defaultKeyboard = new InlineKeyboard()
          .text('💳 Gerar PIX', 'generate_pix')
          .row()
          .text('📱 Suporte', 'support');

        await ctx.reply(welcomeMessage, {
          reply_markup: defaultKeyboard,
        });
      }

      console.log(`[BOT] Lead registered: ${lead.id} (User: ${telegramUserId}, Bot: ${botId})`);
    } catch (error) {
      console.error('[BOT START ERROR]', error);
      await ctx.reply('❌ Erro ao processar seu pedido. Tente novamente.');
    }
  });

  /**
   * Callback - Selecionar plano
   */
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('select_plan:')) {
      const planId = data.replace('select_plan:', '');
      const session = sessionStore.get(ctx.from.id);

      if (!session) {
        await ctx.answerCallbackQuery('❌ Sessão expirada. Use /start novamente.');
        return;
      }

      try {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) {
          await ctx.answerCallbackQuery('❌ Plano não encontrado');
          return;
        }

        session.selectedPlan = plan;

        const message = `
✅ Plano selecionado: ${plan.emoji} ${plan.name}
💰 Valor: R$ ${plan.price.toFixed(2)}
⏱️ Duração: ${plan.days} dias

Clique no botão abaixo para gerar o PIX:
`;

        const keyboard = new InlineKeyboard().text('💳 Gerar PIX', 'generate_pix').row().text('🔙 Voltar', 'back_plans');

        await ctx.editMessageText(message, {
          reply_markup: keyboard,
        });

        await ctx.answerCallbackQuery('Plano selecionado!');
      } catch (error) {
        console.error('[BOT PLAN ERROR]', error);
        await ctx.answerCallbackQuery('❌ Erro ao selecionar plano');
      }
    } else if (data === 'generate_pix') {
      const session = sessionStore.get(ctx.from.id);

      if (!session || !session.selectedPlan) {
        await ctx.answerCallbackQuery('❌ Nenhum plano selecionado');
        return;
      }

      try {
        await ctx.answerCallbackQuery('⏳ Gerando PIX...');

        const pix = await paymentService.generatePIX(
          session.leadId,
          session.selectedPlan.id,
          session.selectedPlan.price,
          botId
        );

        if (!pix) {
          await ctx.reply('❌ Erro ao gerar PIX. Tente novamente.');
          return;
        }

        const pixMessage = `
💳 PIX gerado com sucesso!

📋 Chave PIX (Copia e Cola):
\`${pix.qr_code}\`

💰 Valor: R$ ${pix.amount.toFixed(2)}
⏰ Válido por: 10 minutos

Após o pagamento, você terá acesso imediato!
`;

        await ctx.editMessageText(pixMessage);
      } catch (error) {
        console.error('[BOT PIX ERROR]', error);
        await ctx.reply('❌ Erro ao gerar PIX');
      }
    }
  });
}

/**
 * Obter todos os bots em cache (para limpeza, etc)
 */
export function getAllBotInstances(): BotInstance[] {
  return Array.from(botInstances.values());
}

/**
 * Limpar cache de um bot
 */
export function clearBotInstanceCache(botId: string): void {
  botInstances.delete(botId);
  sessionStores.delete(botId);
  console.log(`[BOT FACTORY] Cache cleared for bot: ${botId}`);
}
