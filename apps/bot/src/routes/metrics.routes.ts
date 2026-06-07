import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metricsService, DateRange } from '../services/metrics.service.js';
import { requireAuth } from '../middleware/auth.js';

export async function setupMetricsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/bots/:botId/metrics
   * Obter métricas do bot
   */
  fastify.get<{
    Params: { botId: string };
    Querystring: { days?: string; startDate?: string; endDate?: string };
  }>(
    '/api/bots/:botId/metrics',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const { days, startDate, endDate } = request.query as {
          days?: string;
          startDate?: string;
          endDate?: string;
        };

        const range: DateRange = {};
        if (days) range.days = parseInt(days);
        if (startDate) range.startDate = new Date(startDate);
        if (endDate) range.endDate = new Date(endDate);

        const metrics = await metricsService.getBotMetrics(botId, userId, range);

        return reply.send(metrics);
      } catch (error: any) {
        console.error('[METRICS GET ERROR]', error);

        return reply.code(404).send({
          error: error.message || 'Erro ao obter métricas',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/leads
   * Listar leads com filtros
   */
  fastify.get<{
    Params: { botId: string };
    Querystring: {
      status?: string;
      page?: string;
      pageSize?: string;
      search?: string;
      days?: string;
    };
  }>(
    '/api/bots/:botId/leads',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const { status, page, pageSize, search, days } = request.query as {
          status?: string;
          page?: string;
          pageSize?: string;
          search?: string;
          days?: string;
        };

        const range: DateRange = {};
        if (days) range.days = parseInt(days);

        const result = await metricsService.getLeads(botId, userId, {
          status,
          page: page ? parseInt(page) : 1,
          pageSize: pageSize ? parseInt(pageSize) : 20,
          search,
          range,
        });

        return reply.send(result);
      } catch (error: any) {
        console.error('[LEADS GET ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao obter leads',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/leads/:leadId
   * Obter detalhes de um lead
   */
  fastify.get<{ Params: { botId: string; leadId: string } }>(
    '/api/bots/:botId/leads/:leadId',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId, leadId } = request.params as { botId: string; leadId: string };

        const lead = await metricsService.getLeadDetails(botId, leadId, userId);

        return reply.send(lead);
      } catch (error: any) {
        console.error('[LEAD DETAILS GET ERROR]', error);

        return reply.code(404).send({
          error: error.message || 'Lead não encontrado',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/charts/revenue
   * Gráfico de receita
   */
  fastify.get<{
    Params: { botId: string };
    Querystring: { days?: string };
  }>(
    '/api/bots/:botId/charts/revenue',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const { days } = request.query as { days?: string };

        const chart = await metricsService.getRevenueChart(
          botId,
          userId,
          days ? parseInt(days) : 30
        );

        return reply.send({
          data: chart,
          period: `Últimos ${days || 30} dias`,
        });
      } catch (error: any) {
        console.error('[REVENUE CHART ERROR]', error);

        return reply.code(404).send({
          error: error.message || 'Erro ao obter gráfico de receita',
        });
      }
    }
  );

  /**
   * GET /api/bots/:botId/charts/conversion
   * Gráfico de conversão
   */
  fastify.get<{
    Params: { botId: string };
    Querystring: { days?: string };
  }>(
    '/api/bots/:botId/charts/conversion',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { botId } = request.params as { botId: string };
        const { days } = request.query as { days?: string };

        const chart = await metricsService.getConversionChart(
          botId,
          userId,
          days ? parseInt(days) : 30
        );

        return reply.send({
          data: chart,
          period: `Últimos ${days || 30} dias`,
        });
      } catch (error: any) {
        console.error('[CONVERSION CHART ERROR]', error);

        return reply.code(404).send({
          error: error.message || 'Erro ao obter gráfico de conversão',
        });
      }
    }
  );
}
