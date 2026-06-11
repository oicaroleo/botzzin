import { generateInviteLink, sendMessage } from './channel.service.js';

export interface DeliveryPlan {
  emoji: string; name: string; days: number;
  deliveryType: string | null; deliveryValue: string | null;
}
export interface DeliveryFlow {
  deliveryType: string; channelId: string | null; deliveryValue: string | null;
}

// Entrega (ou reenvia) o acesso ao lead conforme a config do plano/fluxo.
// Plano sobrescreve o fluxo. Retorna o tipo/canal resolvidos (para log de evento).
//   - resend=false (webhook de pagamento): em caso de erro, envia fallback "em breve".
//   - resend=true (reenvio manual): propaga o erro para a UI saber que falhou.
export interface DeliveryStep { deliveryType: string | null; deliveryValue: string | null; }

export async function deliverAccess(params: {
  botToken: string;
  telegramUserId: string;
  plan: DeliveryPlan;
  flow: DeliveryFlow | null;
  step?: DeliveryStep | null; // override de entrega do passo de esteira (maior prioridade)
  resend?: boolean;
}): Promise<{ deliveryType: string; channelId: string | null }> {
  const { botToken, telegramUserId, plan, flow, step, resend } = params;

  // Prioridade da entrega: step (esteira) > plano > fluxo.
  // Para channel/group o "value" da fonte é o chatId; p/ link/message é o texto/URL.
  let deliveryType: string; let channelId: string | null = null; let deliveryValue: string | null = null;
  const chanOf = (t: string) => t === 'channel' || t === 'group';
  if (step?.deliveryType) {
    deliveryType = step.deliveryType;
    if (chanOf(deliveryType)) channelId = step.deliveryValue ?? null; else deliveryValue = step.deliveryValue ?? null;
  } else if (plan.deliveryType) {
    deliveryType = plan.deliveryType;
    if (chanOf(deliveryType)) channelId = plan.deliveryValue ?? null; else deliveryValue = plan.deliveryValue ?? null;
  } else {
    deliveryType = flow?.deliveryType || 'channel';
    if (chanOf(deliveryType)) channelId = flow?.channelId ?? null; else deliveryValue = flow?.deliveryValue ?? null;
  }
  const isChan = chanOf(deliveryType);

  const header =
    (resend ? `🔄 *Reenvio do seu acesso*\n\n` : `✅ *Pagamento confirmado!*\n\n`) +
    `Plano: ${plan.emoji} ${plan.name}\n` +
    `Acesso por: *${plan.days} dias*\n\n`;

  try {
    if (isChan && channelId) {
      const link = await generateInviteLink(botToken, channelId, plan.days);
      await sendMessage(botToken, telegramUserId,
        header + `🔗 *Seu link de acesso:*\n${link}\n\n_Link válido por ${plan.days} dias e de uso único._`,
        { parse_mode: 'Markdown' });
    } else if (deliveryType === 'link' && deliveryValue) {
      await sendMessage(botToken, telegramUserId, header + `🔗 *Seu acesso:*\n${deliveryValue}`, { parse_mode: 'Markdown' });
    } else if (deliveryType === 'message' && deliveryValue) {
      await sendMessage(botToken, telegramUserId, header + deliveryValue, { parse_mode: 'Markdown' });
    } else {
      throw new Error('Entrega não configurada para este plano/fluxo.');
    }
  } catch (err) {
    if (resend) throw err; // reenvio manual: a UI precisa saber que falhou
    console.error('[ACCESS] Erro ao gerar/enviar acesso:', err);
    await sendMessage(botToken, telegramUserId, header + 'Em breve você receberá seu acesso.');
  }

  return { deliveryType, channelId };
}
