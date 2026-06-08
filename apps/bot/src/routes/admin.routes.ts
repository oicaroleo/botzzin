import { FastifyInstance } from 'fastify';
import { execSync } from 'child_process';

export async function setupAdminRoutes(fastify: FastifyInstance) {
  /**
   * POST /admin/sync-database
   * Force Prisma to sync database schema
   * WARNING: This may cause data loss
   */
  fastify.post('/admin/sync-database', async (request, reply) => {
    try {
      console.log('[ADMIN] Syncing database schema...');

      // Execute prisma db push
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

      console.log('[ADMIN] ✅ Database synced successfully');

      return reply.send({
        ok: true,
        message: 'Database schema synchronized',
      });
    } catch (error: any) {
      console.error('[ADMIN] Error syncing database:', error);

      return reply.code(500).send({
        error: 'Failed to sync database',
        details: error.message,
      });
    }
  });
}
