import { prisma } from './db.js';
import { consumeBotMessage, initRedis } from './redis.js';
import { leadService } from './services/lead.service.js';

/**
 * Bot Worker - Consome mensagens de uma fila Redis e processa com a instância do bot
 */
export async function startBotWorker(botId: string) {
  console.log(`[BOT WORKER] Starting worker for bot: ${botId}`);

  // Buscar configuração do bot
  const botConfig = await prisma.bot.findUnique({
    where: { id: botId },
    include: {
      plans: {
        include: { plan: true },
        orderBy: { plan: { priority: 'asc' } },
      },
    },
  });

  if (!botConfig) {
    console.error(`[BOT WORKER] Bot not found: ${botId}`);
    process.exit(1);
  }

  console.log(`[BOT WORKER] Bot config loaded: ${botConfig.telegramUsername}`);

  // Loop de consumo de mensagens
  while (true) {
    try {
      console.log(`[BOT WORKER ${botId}] Waiting for messages...`);

      // Bloqueia aguardando mensagens (timeout 30s)
      const update = await consumeBotMessage(botId, 30);

      if (!update) {
        // Timeout, volta para aguardar
        continue;
      }

      console.log(`[BOT WORKER ${botId}] Processing update...`);

      // Processar comando /start
      if (update.message?.text === '/start') {
        await handleStartCommand(botId, botConfig, update);
      } else if (update.callback_query) {
        await handleCallbackQuery(botId, botConfig, update);
      } else {
        console.log(`[BOT WORKER ${botId}] Unknown update type`);
      }
    } catch (error) {
      console.error(`[BOT WORKER ${botId} ERROR]`, error);
      // Continua mesmo com erro
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function handleStartCommand(botId: string, botConfig: any, update: any) {
  try {
    const telegramUserId = String(update.message.from.id);
    const chatId = update.message.chat.id;
    const firstName = update.message.from.first_name || 'Amigo';

    // Registrar lead
    const lead = await leadService.registerOrUpdateLead(botId, telegramUserId, {
      username: update.message.from.username,
      firstName: update.message.from.first_name,
    });

    console.log(`[BOT WORKER ${botId}] Lead registered:`, lead.id);

    // Preparar mensagem
    const welcomeMessage = botConfig.welcomeMessage ||
      `👋 Bem-vindo, ${firstName}!\n\n` +
      'Aqui você pode:\n' +
      '✅ Gerar PIX para pagamento\n' +
      '✅ Acessar conteúdo exclusivo\n' +
      '✅ Receber suporte 24/7\n\n' +
      'Escolha um plano abaixo para começar!';

    // Enviar via Telegram API
    await fetch(`https://api.telegram.org/bot${botConfig.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeMessage,
        reply_markup: botConfig.plans.length > 0 ? buildPlansKeyboard(botConfig.plans) : buildDefaultKeyboard(),
      }),
    });

    console.log(`[BOT WORKER ${botId}] Welcome message sent to user:`, telegramUserId);
  } catch (error) {
    console.error(`[BOT WORKER ${botId}] Error handling /start:`, error);
  }
}

async function handleCallbackQuery(botId: string, botConfig: any, update: any) {
  try {
    const callbackData = update.callback_query.data;
    const chatId = update.callback_query.message.chat.id;
    const callbackQueryId = update.callback_query.id;

    console.log(`[BOT WORKER ${botId}] Callback:`, callbackData);

    // Responder callback query
    await fetch(`https://api.telegram.org/bot${botConfig.telegramBotToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: '✅ Clicado!',
      }),
    });
  } catch (error) {
    console.error(`[BOT WORKER ${botId}] Error handling callback:`, error);
  }
}

function buildPlansKeyboard(plans: any[]) {
  const buttons = plans.map((bp) => ({
    text: `${bp.plan.emoji} ${bp.plan.name} (R$ ${bp.plan.price.toFixed(2)})`,
    callback_data: `select_plan:${bp.plan.id}`,
  }));

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 2) {
    keyboard.push(buttons.slice(i, i + 2));
  }
  keyboard.push([{ text: '📱 Suporte', callback_data: 'support' }]);

  return { inline_keyboard: keyboard };
}

function buildDefaultKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '💳 Gerar PIX', callback_data: 'generate_pix' }],
      [{ text: '📱 Suporte', callback_data: 'support' }],
    ],
  };
}
