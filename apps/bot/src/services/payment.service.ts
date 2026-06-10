import { prisma } from '../db.js';
import { gatewayService } from './gateway.service.js';

export async function createPayment(params: {
  leadId: string;
  planId: string;
  amount: number;
  gateway: string;
  gatewayTxId: string;
  qrCode: string;
  copyPaste: string;
  expiresAt: Date;
  gatewayConfigId?: string;
}) {
  return prisma.payment.create({ data: { ...params, status: 'pending' } });
}

export async function confirmPayment(gatewayTxId: string, webhookData: unknown) {
  const pmt = await prisma.payment.update({
    where: { gatewayTxId },
    data:  { status: 'paid', paidAt: new Date(), webhookData: webhookData as any },
    include: { lead: true },
  });

  // Atualiza lead
  await prisma.lead.update({
    where: { id: pmt.leadId },
    data:  { status: 'paid', paidAt: new Date() },
  });

  // Rastreia conversão no gateway (A/B tracking)
  if (pmt.gatewayConfigId) {
    await gatewayService.trackPixPaid(pmt.gatewayConfigId, pmt.gateway);
  }

  return pmt;
}

export async function getPaymentByGatewayTxId(gatewayTxId: string) {
  return prisma.payment.findUnique({
    where:   { gatewayTxId },
    include: { lead: { include: { bot: { include: { user: { include: { gateways: true } } } } } }, plan: true },
  });
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where:   { id },
    include: { lead: { include: { bot: true } }, plan: true },
  });
}
