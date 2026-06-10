import { initRedis } from './redis.js';

async function main() {
  const mode = process.env.BOT_MODE || 'server';
  const botId = process.env.BOT_ID;

  console.log(`[INIT] Starting in mode: ${mode}`);

  await initRedis();

  if (mode === 'server') {
    const { startServer } = await import('./server.js');
    await startServer();
  } else if (mode === 'worker') {
    if (!botId) {
      console.error('[INIT] BOT_ID is required for worker mode');
      process.exit(1);
    }
    const { startBotWorker } = await import('./bot-worker.js');
    await startBotWorker(botId);
  } else if (mode === 'manager') {
    const { startWorkerManager } = await import('./worker-manager.js');
    await startWorkerManager();
  } else {
    console.error(`[INIT] Unknown mode: ${mode}. Use: server, worker, manager`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[INIT] Fatal error:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Graceful shutdown...');
  process.exit(0);
});
