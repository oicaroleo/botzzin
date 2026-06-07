import { prisma } from '../db';

export class PaymentService {
  /**
   * Criar registro de pagamento
   */
  async createPayment(
    userId: string,
    leadId: string,
    amount: number,
    gateway: string,
    qrCode: string,
    copyPaste: string,
    expiresAt: Date
  ) {
    const payment = await prisma.payment.create({
      data: {
        userId,
        leadId,
        amount,
        gateway,
        qrCode,
        copyPaste,
        expiresAt,
        status: 'pending',
      },
    });

    return payment;
  }

  /**
   * Confirmar pagamento via webhook
   */
  async confirmPayment(gatewayTxId: string, webhookData: any) {
    const payment = await prisma.payment.update({
      where: { gatewayTxId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        webhookData,
      },
    });

    return payment;
  }

  /**
   * Obter pagamento por ID
   */
  async getPaymentById(paymentId: string) {
    return await prisma.payment.findUnique({
      where: { id: paymentId },
    });
  }

  /**
   * Obter pagamento por transaction ID do gateway
   */
  async getPaymentByGatewayTxId(gatewayTxId: string) {
    return await prisma.payment.findFirst({
      where: { gatewayTxId },
    });
  }

  /**
   * Obter pagamentos por lead
   */
  async getPaymentsByLeadId(leadId: string) {
    return await prisma.payment.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obter último pagamento de um lead
   */
  async getLastPaymentByLeadId(leadId: string) {
    return await prisma.payment.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marcar pagamento como falhado
   */
  async failPayment(paymentId: string, reason: string) {
    return await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        webhookData: {
          failedReason: reason,
          failedAt: new Date().toISOString(),
        },
      },
    });
  }
}

export const paymentService = new PaymentService();
