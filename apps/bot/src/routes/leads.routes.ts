import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { leadsService, LeadFilters } from '../services/leads.service.js';
import { buildLeadReport } from '../services/lead-report.service.js';
import { requireAuth } from '../middleware/auth.js';

function parseFilters(q: any): LeadFilters {
  return {
    botId:    q.botId || undefined,
    flowId:   q.flowId || undefined,
    status:   q.status || undefined,
    search:   q.search || undefined,
    page:     q.page ? parseInt(q.page) : undefined,
    pageSize: q.pageSize ? parseInt(q.pageSize) : undefined,
    days:     q.days ? parseInt(q.days) : undefined,
  };
}

export async function setupLeadsRoutes(fastify: FastifyInstance) {
  // GET /api/leads/summary — totais (total/convertidos/bloqueados/pendentes)
  fastify.get('/api/leads/summary', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const summary = await leadsService.summary(userId, parseFilters(req.query));
      return reply.send(summary);
    }
  );

  // GET /api/leads/export — CSV filtrado (para disparos externos)
  fastify.get('/api/leads/export', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const csv = await leadsService.exportLeadsCsv(userId, parseFilters(req.query));
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().slice(0,10)}.csv"`)
        .send('﻿' + csv); // BOM p/ Excel abrir acentos corretamente
    }
  );

  // GET /api/leads — lista paginada
  fastify.get('/api/leads', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const result = await leadsService.listLeads(userId, parseFilters(req.query));
      return reply.send(result);
    }
  );

  // POST /api/leads/:leadId/resend-access — reenvia o link de acesso
  fastify.post('/api/leads/:leadId/resend-access', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { leadId } = req.params as { leadId: string };
      try {
        const result = await leadsService.resendAccess(userId, leadId);
        return reply.send(result);
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    }
  );

  // GET /api/leads/:leadId/report — relatório PDF do lead (defesa MED)
  fastify.get('/api/leads/:leadId/report', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { leadId } = req.params as { leadId: string };
      try {
        const { buffer, lead } = await buildLeadReport(userId, leadId);
        const fname = `lead-${lead.telegramUsername || lead.telegramUserId}.pdf`;
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${fname}"`)
          .send(buffer);
      } catch (e: any) {
        return reply.code(404).send({ error: e.message });
      }
    }
  );

  // GET /api/leads/:leadId — detalhe + timeline
  fastify.get('/api/leads/:leadId', { onRequest: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId;
      const { leadId } = req.params as { leadId: string };
      try {
        const lead = await leadsService.getLeadTimeline(userId, leadId);
        return reply.send(lead);
      } catch (e: any) {
        return reply.code(404).send({ error: e.message });
      }
    }
  );
}
