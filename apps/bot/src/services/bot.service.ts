import { prisma } from '../db.js';
import { config } from '../config.js';

export class BotService {
  /**
   * Obter ou criar bot padrão
   */
  async getOrCreateDefaultBot() {
    const botId = 'default-bot';

    let bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      // Criar user padrão primeiro
      let user = await prisma.user.findFirst({
        where: { email: 'default@botzzin.local' },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'default@botzzin.local',
            name: 'Bot Padrão',
          },
        });
      }

      // Criar bot
      bot = await prisma.bot.create({
        data: {
          id: botId,
          userId: user.id,
          telegramBotId: config.telegram.botToken!.split(':')[0],
          telegramBotToken: config.telegram.botToken!,
          telegramUsername: 'botzzin',
          status: 'active',
        },
      });

      console.log('[BOT SERVICE] Bot padrão criado:', bot.id);
    }

    return bot;
  }

  /**
   * Obter bot por ID
   */
  async getBotById(botId: string) {
    return await prisma.bot.findUnique({
      where: { id: botId },
    });
  }
}

export const botService = new BotService();
