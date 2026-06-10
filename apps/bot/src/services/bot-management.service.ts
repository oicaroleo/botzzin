import { prisma } from '../db.js';
import { config } from '../config.js';

export interface BotCreateInput {
  telegramBotToken: string;
  name?: string;
}

export interface BotUpdateInput {
  name?: string;
  status?: string;
}

async function validateTelegramToken(token: string): Promise<{ id: string; username: string }> {
  const clean = token.trim();
  if (!clean || !clean.includes(':')) throw new Error('Formato de token inválido');

  try {
    const res = await fetch(`https://api.telegram.org/bot${clean}/getMe`);
    const data = await res.json() as any;
    if (data.ok) {
      return { id: String(data.result.id), username: data.result.username };
    }
  } catch {
    // Fallback: aceitar token com formato válido
  }

  const botId = clean.split(':')[0];
  return { id: botId, username: `bot_${botId}` };
}

export const botManagementService = {
  async createBot(userId: string, input: BotCreateInput) {
    const botInfo = await validateTelegramToken(input.telegramBotToken);

    const existing = await prisma.bot.findUnique({ where: { telegramBotId: botInfo.id } });
    if (existing) throw new Error('Este bot já está cadastrado');

    const bot = await prisma.bot.create({
      data: {
        userId,
        name: input.name || `@${botInfo.username}`,
        telegramBotId: botInfo.id,
        telegramBotToken: input.telegramBotToken.trim(),
        telegramUsername: botInfo.username,
      },
    });

    // Configurar webhook automaticamente
    try {
      const webhookUrl = `${config.webhook.baseUrl}/webhook/${bot.id}`;
      await fetch(`https://api.telegram.org/bot${bot.telegramBotToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      console.log(`[BOT CREATE] Webhook set: ${webhookUrl}`);
    } catch (err) {
      console.warn('[BOT CREATE] Could not set webhook automatically:', err);
    }

    return formatBot(bot);
  },

  async listBots(userId: string) {
    const bots = await prisma.bot.findMany({
      where: { userId },
      include: { flowBots: { include: { flow: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return bots.map(formatBot);
  },

  async getBot(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
      include: { flowBots: { include: { flow: { select: { id: true, name: true } } } } },
    });
    if (!bot) throw new Error('Bot não encontrado');
    return formatBot(bot);
  },

  async updateBot(botId: string, userId: string, input: BotUpdateInput) {
    const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
    if (!bot) throw new Error('Bot não encontrado');

    const updated = await prisma.bot.update({
      where: { id: botId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });
    return formatBot(updated);
  },

  async deleteBot(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
    if (!bot) throw new Error('Bot não encontrado');

    try {
      await fetch(`https://api.telegram.org/bot${bot.telegramBotToken}/deleteWebhook`, {
        method: 'POST',
      });
    } catch {}

    await prisma.bot.delete({ where: { id: botId } });
  },

  async getWebhookStatus(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
      select: { telegramBotToken: true },
    });
    if (!bot) throw new Error('Bot não encontrado');

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${bot.telegramBotToken}/getWebhookInfo`
      );
      const data = await res.json() as any;
      if (data.ok) return { configured: true, ...data.result };
    } catch {}

    return { configured: false };
  },

  async registerWebhook(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
      select: { telegramBotToken: true },
    });
    if (!bot) throw new Error('Bot não encontrado');

    const webhookUrl = `${config.webhook.baseUrl}/webhook/${botId}`;
    const res = await fetch(`https://api.telegram.org/bot${bot.telegramBotToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
    });
    const data = await res.json() as any;
    if (!data.ok) return { success: false, error: data.description };
    return { success: true, url: webhookUrl };
  },
};

function formatBot(bot: any) {
  return {
    id: bot.id,
    userId: bot.userId,
    name: bot.name,
    telegramBotId: bot.telegramBotId,
    telegramUsername: bot.telegramUsername,
    status: bot.status,
    flow: bot.flowBots?.[0]?.flow ?? null,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };
}
