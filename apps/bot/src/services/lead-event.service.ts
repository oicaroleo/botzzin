import { prisma } from '../db.js';

export type LeadEventType =
  | 'started'
  | 'plan_selected'
  | 'pix_generated'
  | 'paid'
  | 'access_granted'
  | 'renewal_offered'
  | 'access_expired'
  | 'removed'
  | 'blocked'
  | 'funnel_sent';

// Registra um marco do ciclo de vida do lead. Best-effort: nunca quebra o fluxo
// principal (um erro aqui não deve impedir o bot de responder ou entregar acesso).
export async function logLeadEvent(leadId: string, type: LeadEventType, meta?: Record<string, unknown>) {
  try {
    await prisma.leadEvent.create({ data: { leadId, type, meta: meta as any } });
  } catch (e) {
    console.error(`[LEAD EVENT] falha ao registrar ${type} (lead=${leadId}):`, e);
  }
}
