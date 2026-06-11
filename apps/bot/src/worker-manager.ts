import { prisma } from './db.js';
import { startBotWorker } from './bot-worker.js';
import { runRenewalSweep } from './renewal-sweep.js';
import { runFunnelSweep, runDownsellTriggers } from './funnel-sweep.js';

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

  let tick = 0;

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

    // Esteira de upsell/downsell — a cada tick (15s), delays costumam ser curtos.
    try {
      await runFunnelSweep();
    } catch (err) {
      console.error('[MANAGER] Error in funnel sweep:', err);
    }

    // A cada ~60s: renovação/expiração + detecção de abandono (gatilho de downsell).
    if (tick % 4 === 0) {
      try { await runRenewalSweep(); } catch (err) { console.error('[MANAGER] Error in renewal sweep:', err); }
      try { await runDownsellTriggers(); } catch (err) { console.error('[MANAGER] Error in downsell triggers:', err); }
    }
    tick++;

    await new Promise((r) => setTimeout(r, 15_000));
  }
}
