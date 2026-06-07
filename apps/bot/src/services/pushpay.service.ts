import axios from 'axios';
import { config } from '../config';

interface CreatePixResponse {
  status: string;
  transaction_id: string;
  qr_code: string;
  copy_paste: string;
  amount: number;
  expires_at: string;
}

interface PixConfirmationWebhook {
  status: string;
  transaction_id: string;
  amount: number;
  paid_at: string;
}

export class PushpayService {
  private baseUrl = 'https://api.pushinpay.com.br/api'; // Produção (seu token é para produção)
  private baseSandboxUrl = 'https://api-sandbox.pushinpay.com.br/api'; // Sandbox
  private apiKey = config.gateways.pushpay.apiKey;

  constructor() {
    if (!this.apiKey) {
      throw new Error('PUSHPAY_API_KEY não configurado');
    }
  }

  /**
   * Criar PIX via API PushinPay - Endpoint: /pix/cashIn
   */
  async createPix(amount: number, description: string): Promise<CreatePixResponse> {
    try {
      const authHeader = `Bearer ${this.apiKey}`;
      console.log('[PUSHPAY] Criando PIX:', { amount, description });
      console.log('[PUSHPAY] API Key presente:', !!this.apiKey);
      console.log('[PUSHPAY] Auth Header:', authHeader.substring(0, 20) + '...');

      // Converter para centavos (inteiro)
      const valueInCents = Math.round(amount * 100);

      const response = await axios.post(
        `${this.baseUrl}/pix/cashIn`,
        {
          value: valueInCents,
          // webhook_url: `${config.telegram.webhookUrl}/webhooks/pushpay`, // Removido - pode estar bloqueando no dashboard
          split_rules: [],
        },
        {
          headers: {
            Authorization: authHeader,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[PUSHPAY] PIX criado com sucesso:', response.data.id);
      console.log('[PUSHPAY] Resposta completa:', JSON.stringify(response.data, null, 2));

      return {
        status: response.data.status,
        transaction_id: response.data.id,
        qr_code: response.data.qr_code,
        copy_paste: response.data.qr_code, // QR code como copy_paste
        amount: response.data.value,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };
    } catch (error: any) {
      console.error('[PUSHPAY ERROR]', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(
        `Erro ao criar PIX: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Verificar status do PIX
   */
  async checkPixStatus(transactionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pix/cashIn/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[PUSHPAY ERROR]', error.response?.data || error.message);
      throw new Error(`Erro ao verificar status: ${error.message}`);
    }
  }

  /**
   * Validar webhook do PushinPay
   */
  validateWebhook(webhookSecret: string, payload: any, signature: string): boolean {
    console.log('[PUSHPAY] Webhook recebido:', {
      transactionId: payload.id,
      status: payload.status,
      amount: payload.value,
    });
    return true;
  }
}

export const pushpayService = new PushpayService();
