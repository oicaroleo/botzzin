import { prisma } from '../db.js';

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

  /**
   * Gerar PIX (cria um pagamento pendente)
   */
  async generatePIX(leadId: string, planId: string, amount: number, botId: string) {
    try {
      // Gerar QR code e copiar-colar
      const qrCode = `https://qrcode.example.com/${Math.random().toString(36).substring(7)}`;
      const copyPaste = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(7)}520400005303986540510.995802BR5913BotZZIN6009Sao Paulo62370503***63041D3D`;

      const payment = await this.createPayment(
        botId,
        leadId,
        amount,
        'pix',
        qrCode,
        copyPaste,
        new Date(Date.now() + 30 * 60 * 1000) // Expira em 30 min
      );

      return {
        id: payment.id,
        qr_code: copyPaste, // Use snake_case para compatibilidade
        amount: amount,
        expiresAt: payment.expiresAt,
      };
    } catch (error) {
      console.error('[PAYMENT] Error generating PIX:', error);
      return null;
    }
  }
}

export const paymentService = new PaymentService();
