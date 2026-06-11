import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { flowService } from '../services/flow.service.js';
import { requireAuth } from '../middleware/auth.js';

export async function setupFlowRoutes(fastify: FastifyInstance) {

  // GET /api/flows
  fastify.get('/api/flows', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const flows = await flowService.listFlows(userId);
      return reply.send({ flows });
    }
  );

  // GET /api/flows/:flowId
  fastify.get('/api/flows/:flowId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      try {
        const flow = await flowService.getFlow(flowId, userId);
        return reply.send(flow);
      } catch (e: any) {
        return reply.code(404).send({ error: e.message });
      }
    }
  );

  // POST /api/flows
  fastify.post('/api/flows', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const body = req.body as any;
      try {
        const flow = await flowService.createFlow(userId, body);
        return reply.code(201).send(flow);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // PATCH /api/flows/:flowId
  fastify.patch('/api/flows/:flowId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      const body = req.body as any;
      try {
        const flow = await flowService.updateFlow(flowId, userId, body);
        return reply.send(flow);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // DELETE /api/flows/:flowId
  fastify.delete('/api/flows/:flowId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      try {
        await flowService.deleteFlow(flowId, userId);
        return reply.send({ ok: true });
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // POST /api/flows/:flowId/bots — adiciona bot ao fluxo
  fastify.post('/api/flows/:flowId/bots', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      const { botId } = req.body as { botId: string };
      try {
        const fb = await flowService.assignBot(flowId, userId, botId);
        return reply.code(201).send(fb);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // DELETE /api/flows/:flowId/bots/:botId — remove bot do fluxo
  fastify.delete('/api/flows/:flowId/bots/:botId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId, botId } = req.params as { flowId: string; botId: string };
      try {
        await flowService.removeBot(flowId, userId, botId);
        return reply.send({ ok: true });
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // GET /api/flows/:flowId/channels — canais/grupos onde os bots são admin
  fastify.get('/api/flows/:flowId/channels', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      try {
        const channels = await flowService.listFlowChannels(flowId, userId);
        return reply.send({ channels });
      } catch (e: any) { return reply.code(400).send({ error: e.message }); }
    }
  );

  // POST /api/flows/:flowId/channels/sync — detecta admin via getChatAdministrators
  fastify.post('/api/flows/:flowId/channels/sync', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      const { chatId } = (req.body as any) || {};
      if (!chatId) return reply.code(400).send({ error: 'chatId é obrigatório' });
      try {
        const result = await flowService.syncChannel(flowId, userId, String(chatId));
        const channels = await flowService.listFlowChannels(flowId, userId);
        return reply.send({ ...result, channels });
      } catch (e: any) { return reply.code(400).send({ error: e.message }); }
    }
  );

  // POST /api/flows/:flowId/media — upload de mídia (base64 JSON) p/ canal de cache
  fastify.post('/api/flows/:flowId/media', { onRequest: [requireAuth], bodyLimit: 45 * 1024 * 1024 },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      const { filename, mimeType, dataBase64 } = (req.body as any) || {};
      try {
        if (!dataBase64) return reply.code(400).send({ error: 'Arquivo ausente' });
        const buffer = Buffer.from(String(dataBase64), 'base64');
        const media = await flowService.uploadMedia(flowId, userId, {
          buffer, filename: filename || 'media', mimeType: mimeType || 'application/octet-stream',
        });
        return reply.send(media);
      } catch (e: any) { return reply.code(400).send({ error: e.message }); }
    }
  );

  // POST /api/flows/:flowId/plans
  fastify.post('/api/flows/:flowId/plans', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      const body = req.body as any;
      try {
        const plan = await flowService.createPlan(flowId, userId, body);
        return reply.code(201).send(plan);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // PATCH /api/flows/:flowId/plans/:planId
  fastify.patch('/api/flows/:flowId/plans/:planId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId, planId } = req.params as { flowId: string; planId: string };
      const body = req.body as any;
      try {
        const plan = await flowService.updatePlan(flowId, userId, planId, body);
        return reply.send(plan);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // DELETE /api/flows/:flowId/plans/:planId
  fastify.delete('/api/flows/:flowId/plans/:planId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId, planId } = req.params as { flowId: string; planId: string };
      try {
        await flowService.deletePlan(flowId, userId, planId);
        return reply.send({ ok: true });
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // ─── Esteira (funnel steps) ──────────────────────────────────────────────
  // POST /api/flows/:flowId/steps
  fastify.post('/api/flows/:flowId/steps', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId } = req.params as { flowId: string };
      try {
        const step = await flowService.createStep(flowId, userId, req.body as any);
        return reply.code(201).send(step);
      } catch (e: any) { return reply.code(400).send({ error: e.message }); }
    }
  );

  // PATCH /api/flows/:flowId/steps/:stepId
  fastify.patch('/api/flows/:flowId/steps/:stepId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId, stepId } = req.params as { flowId: string; stepId: string };
      try {
        const step = await flowService.updateStep(flowId, userId, stepId, req.body as any);
        return reply.send(step);
      } catch (e: any) { return reply.code(400).send({ error: e.message }); }
    }
  );

  // DELETE /api/flows/:flowId/steps/:stepId
  fastify.delete('/api/flows/:flowId/steps/:stepId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId, stepId } = req.params as { flowId: string; stepId: string };
      try {
        await flowService.deleteStep(flowId, userId, stepId);
        return reply.send({ ok: true });
      } catch (e: any) { return reply.code(400).send({ error: e.message }); }
    }
  );

  // PUT /api/flows/:flowId/orderbumps/:context — cria/atualiza order bump
  fastify.put('/api/flows/:flowId/orderbumps/:context', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId, context } = req.params as { flowId: string; context: string };
      try {
        const bump = await flowService.upsertOrderBump(flowId, userId, context, req.body as any);
        return reply.send(bump);
      } catch (e: any) { return reply.code(400).send({ error: e.message }); }
    }
  );

  // POST /api/flows/:flowId/plans/:planId/set-default
  fastify.post('/api/flows/:flowId/plans/:planId/set-default', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { flowId, planId } = req.params as { flowId: string; planId: string };
      try {
        const plan = await flowService.setDefaultPlan(flowId, userId, planId);
        return reply.send(plan);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );
}
