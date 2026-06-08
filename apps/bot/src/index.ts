// Import dinamicamente para evitar inicializar bot.ts em modos worker/manager
// import { startServer } from './server.js';
import { startBotWorker } from './bot-worker.js';
import { startWorkerManager } from './worker-manager.js';
import { initRedis } from './redis.js';
import { prisma } from './db.js';

async function initializeDatabase() {
  try {
    console.log('[INIT] Sincronizando schema com banco de dados...');

    // Import do módulo execSync
    const { execSync } = await import('child_process');

    // Rodar prisma db push
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    console.log('[INIT] ✅ Database sincronizado com sucesso!');
  } catch (error) {
    console.error('[INIT] ❌ Erro ao sincronizar database:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    // Determinar modo de execução
    const mode = process.env.BOT_MODE || 'server';
    const botId = process.env.BOT_ID;

    console.log(`[INIT] 🚀 BotZZIN Starting in mode: ${mode}`);

    // Apenas sincronizar database em modo server
    if (mode === 'server') {
      await initializeDatabase();
    }

    // Inicializar Redis
    await initRedis();

    if (mode === 'server') {
      console.log('[INIT] Starting webhook server...');
      const { startServer } = await import('./server.js');
      await startServer();
    } else if (mode === 'worker') {
      if (!botId) {
        console.error('[INIT] BOT_ID environment variable is required for worker mode');
        process.exit(1);
      }
      console.log(`[INIT] Starting bot worker for: ${botId}`);
      await startBotWorker(botId);
    } else if (mode === 'manager') {
      console.log('[INIT] Starting worker manager (auto-detect bots)...');
      await startWorkerManager();
    } else {
      console.error(`[INIT] Unknown mode: ${mode}. Valid modes: server, worker, manager`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Encerrando servidor...');
  process.exit(0);
});
