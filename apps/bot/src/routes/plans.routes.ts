import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { planService, PlanInput } from '../services/plan.service.js';
import { requireAuth } from '../middleware/auth.js';

export async function setupPlansRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/bots/:botId/plans
   * Criar novo plano
   */
  fastify.post<{ Params: { botId: string }; Body: PlanInput }>(
    '/api/bots/:botId/plans',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const data = request.body as PlanInput;

        const plan = await planService.createPlan(botId, userId, data);

        return reply.code(201).send(plan);
      } catch (error: any) {
        console.error('[PLAN CREATE ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao criar plano',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/plans
   * Listar planos do bot
   */
  fastify.get<{ Params: { botId: string } }>(
    '/api/bots/:botId/plans',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };

        const plans = await planService.listPlans(botId, userId);

        return reply.send({
          plans,
          total: plans.length,
        });
      } catch (error: any) {
        console.error('[PLAN LIST ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao listar planos',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/plans/:planId
   * Obter detalhes de um plano
   */
  fastify.get<{ Params: { botId: string; planId: string } }>(
    '/api/bots/:botId/plans/:planId',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId, planId } = request.params as { botId: string; planId: string };

        const plan = await planService.getPlan(botId, planId, userId);

        return reply.send(plan);
      } catch (error: any) {
        console.error('[PLAN GET ERROR]', error);

        return reply.code(404).send({
          error: error.message || 'Plano não encontrado',
        });
      }
    }
  );

  /**
   * PATCH /api/bots/:botId/plans/:planId
   * Atualizar plano
   */
  fastify.patch<{ Params: { botId: string; planId: string }; Body: Partial<PlanInput> }>(
    '/api/bots/:botId/plans/:planId',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId, planId } = request.params as { botId: string; planId: string };
        const data = request.body as Partial<PlanInput>;

        const plan = await planService.updatePlan(botId, planId, userId, data);

        return reply.send(plan);
      } catch (error: any) {
        console.error('[PLAN UPDATE ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao atualizar plano',
        });
      }
    }
  );

  /**
   * DELETE /api/bots/:botId/plans/:planId
   * Deletar plano
   */
  fastify.delete<{ Params: { botId: string; planId: string } }>(
    '/api/bots/:botId/plans/:planId',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId, planId } = request.params as { botId: string; planId: string };

        await planService.deletePlan(botId, planId, userId);

        return reply.send({
          ok: true,
          message: 'Plano deletado com sucesso',
        });
      } catch (error: any) {
        console.error('[PLAN DELETE ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao deletar plano',
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/plans/:planId/set-default
   * Marcar plano como padrão
   */
  fastify.post<{ Params: { botId: string; planId: string } }>(
    '/api/bots/:botId/plans/:planId/set-default',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId, planId } = request.params as { botId: string; planId: string };

        const plan = await planService.setDefaultPlan(botId, planId, userId);

        return reply.send(plan);
      } catch (error: any) {
        console.error('[PLAN SET DEFAULT ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao marcar plano como padrão',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/plans/default
   * Obter plano padrão (nota: rota específica deve vir antes da dinâmica)
   */
  fastify.get<{ Params: { botId: string } }>(
    '/api/bots/:botId/plans/default',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { botId } = request.params as { botId: string };

        const plan = await planService.getDefaultPlan(botId);

        if (!plan) {
          return reply.code(404).send({
            error: 'Nenhum plano padrão configurado',
          });
        }

        return reply.send(plan);
      } catch (error: any) {
        console.error('[PLAN DEFAULT GET ERROR]', error);

        return reply.code(500).send({
          error: error.message || 'Erro ao obter plano padrão',
        });
      }
    }
  );
}
