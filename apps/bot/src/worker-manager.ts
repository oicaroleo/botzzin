import { prisma } from './db.js';
import { startBotWorker } from './bot-worker.js';

const activeWorkers = new Set<string>(); // botIds com worker rodando

async function spawnWorker(botId: string, username: string | null) {
  if (activeWorkers.has(botId)) return;
  activeWorkers.add(botId);
  console.log(`[MANAGER] Starting worker for @${username ?? botId}`);

  startBotWorker(botId)
    .catch((err) => {
      console.error(`[MANAGER] Worker ${botId} crashed:`, err);
    })
    .finally(() => {
      activeWorkers.delete(botId);
      console.log(`[MANAGER] Worker ${botId} stopped — will retry in next cycle`);
    });
}

export async function startWorkerManager() {
  console.log('[MANAGER] Worker manager started — polling every 15s for active bots');

  // Loop: a cada 15s verifica bots ativos e spawna workers para os novos
  while (true) {
    try {
      const bots = await prisma.bot.findMany({
        where: { status: 'active' },
        select: { id: true, telegramUsername: true },
      });

      for (const bot of bots) {
        spawnWorker(bot.id, bot.telegramUsername);
      }

      if (bots.length === 0) {
        console.log('[MANAGER] No active bots yet, waiting...');
      }
    } catch (err) {
      console.error('[MANAGER] Error polling bots:', err);
    }

    await new Promise((r) => setTimeout(r, 15_000));
  }
}
