import { prisma } from './db.js';
import { initRedis, getRedis } from './redis.js';
import { startBotWorker } from './bot-worker.js';

/**
 * Worker Manager - Gerencia múltiplos bot workers automaticamente
 * Lê todos os bots do banco e inicia um worker para cada um
 */
export async function startWorkerManager() {
  console.log('[WORKER MANAGER] Starting...');

  try {
    // Inicializar Redis
    await initRedis();
    console.log('[WORKER MANAGER] Redis initialized');

    // Buscar todos os bots ativos
    const bots = await prisma.bot.findMany({
      where: {
        // Pode adicionar filtros aqui se necessário
        // ex: { status: 'active' }
      },
      select: {
        id: true,
        telegramUsername: true,
        telegramBotId: true,
      },
    });

    console.log(`[WORKER MANAGER] Found ${bots.length} active bots`);

    if (bots.length === 0) {
      console.warn('[WORKER MANAGER] No bots found in database');
      return;
    }

    // Iniciar um worker para cada bot
    const workerPromises = bots.map((bot) => {
      console.log(`[WORKER MANAGER] Starting worker for bot: ${bot.telegramUsername} (${bot.id})`);
      return startBotWorker(bot.id).catch((error) => {
        console.error(`[WORKER MANAGER] Error starting worker for bot ${bot.id}:`, error);
      });
    });

    // Aguardar todos os workers (na verdade nunca resolvem pois rodacm em loop infinito)
    await Promise.allSettled(workerPromises);

    console.log('[WORKER MANAGER] All workers started');
  } catch (error) {
    console.error('[WORKER MANAGER] Fatal error:', error);
    process.exit(1);
  }
}
