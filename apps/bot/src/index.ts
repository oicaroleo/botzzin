import { startServer } from './server.js';
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
    // Inicializar database primeiro
    await initializeDatabase();

    // Depois iniciar servidor
    await startServer();
  } catch (err: any) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Encerrando servidor...');
  process.exit(0);
});
