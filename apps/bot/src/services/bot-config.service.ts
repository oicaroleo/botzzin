import { prisma } from '../db.js';

export interface BotConfigInput {
  name?: string;
  status?: string;
}

export const botConfigService = {
  async getConfig(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
      include: {
        flowBots: {
          include: { flow: { select: { id: true, name: true, welcomeMessage: true, channelId: true, deliveryType: true } } },
        },
      },
    });
    if (!bot) throw new Error('Bot não encontrado');

    const flow = (bot as any).flowBots?.[0]?.flow ?? null;

    return {
      botId: bot.id,
      name: bot.name,
      telegramUsername: bot.telegramUsername,
      status: bot.status,
      // Config vive no Flow agora:
      flow,
    };
  },

  async updateConfig(botId: string, userId: string, input: BotConfigInput) {
    const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
    if (!bot) throw new Error('Bot não encontrado');

    const updated = await prisma.bot.update({
      where: { id: botId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });

    return { botId: updated.id, name: updated.name, status: updated.status };
  },

  async updateMedia(_botId: string, _userId: string, _mediaUrl: string) {
    return { ok: true };
  },

  async testWebhook(botToken: string, webhookUrl: string) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_id: 1, message: { text: '/start' } }),
        signal: AbortSignal.timeout(5000),
      });
      return { success: res.ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async registerWebhook(botToken: string, webhookUrl: string) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
    });
    const data = await res.json() as any;
    if (!data.ok) return { success: false, error: data.description };
    return { success: true, message: 'Webhook registrado com sucesso' };
  },
};
