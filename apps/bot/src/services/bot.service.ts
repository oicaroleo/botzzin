// Legado — não mais utilizado. Use botManagementService.
import { prisma } from '../db.js';

export const botService = {
  async getBotById(botId: string) {
    return prisma.bot.findUnique({ where: { id: botId } });
  },
};
