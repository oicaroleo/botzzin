import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gatewayService } from '../services/gateway.service.js';
import { requireAuth } from '../middleware/auth.js';

export async function setupGatewayRoutes(fastify: FastifyInstance) {

  // GET /api/gateways — lista gateways da conta
  fastify.get('/api/gateways', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const [gateways, settings, platformStats] = await Promise.all([
        gatewayService.listGateways(userId),
        gatewayService.getSettings(userId),
        gatewayService.getPlatformStats(),
      ]);
      return reply.send({ gateways, settings, platformStats });
    }
  );

  // POST /api/gateways — adiciona gateway
  fastify.post('/api/gateways', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const body = req.body as any;
      try {
        const gw = await gatewayService.addGateway(userId, body);
        return reply.code(201).send(gw);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // PATCH /api/gateways/:id — atualiza gateway
  fastify.patch('/api/gateways/:id', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { id } = req.params as { id: string };
      const body = req.body as any;
      try {
        const gw = await gatewayService.updateGateway(userId, id, body);
        return reply.send(gw);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // DELETE /api/gateways/:id — remove gateway
  fastify.delete('/api/gateways/:id', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { id } = req.params as { id: string };
      try {
        await gatewayService.deleteGateway(userId, id);
        return reply.send({ ok: true });
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // POST /api/gateways/reorder — reordena prioridades
  fastify.post('/api/gateways/reorder', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { orderedIds } = req.body as { orderedIds: string[] };
      try {
        await gatewayService.reorderGateways(userId, orderedIds);
        return reply.send({ ok: true });
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // PATCH /api/gateways/settings — A/B test e platform intelligence
  fastify.patch('/api/gateways/settings', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const body = req.body as any;
      try {
        const settings = await gatewayService.upsertSettings(userId, body);
        return reply.send(settings);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );
}
