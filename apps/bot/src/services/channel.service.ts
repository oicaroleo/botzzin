import { bot } from '../bot.js';

// MVP: Configuração fixa para teste
// Depois será configurável no site
const CHANNEL_CONFIG = {
  id: -3966757980, // ID do canal privado de teste
  name: 'Canal Exclusivo BotZZIN',
};

export class ChannelService {
  /**
   * Gerar link de convite para o canal com expiração
   */
  async generateInviteLink(
    daysValid: number = 30,
    channelId?: string | number
  ): Promise<string> {
    try {
      // Usar channelId passado ou fallback para configuração
      const targetChannelId = channelId || CHANNEL_CONFIG.id;

      console.log('[CHANNEL] Gerando link de convite para', daysValid, 'dias, Canal:', targetChannelId);

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysValid);

      const inviteLink = await bot!.api.createChatInviteLink(targetChannelId, {
        expire_date: Math.floor(expirationDate.getTime() / 1000),
        member_limit: 1,
      });

      console.log('[CHANNEL] Link criado:', inviteLink.invite_link);
      return inviteLink.invite_link;
    } catch (error) {
      console.error('[CHANNEL ERROR]', error);
      throw new Error(`Erro ao gerar link: ${error}`);
    }
  }

  /**
   * Enviar link de convite para o user
   */
  async sendInviteLinkToUser(
    telegramUserId: string,
    inviteLink: string,
    daysValid: number
  ): Promise<boolean> {
    try {
      const userId = parseInt(telegramUserId);
      const expiresDate = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

      const message = `✅ *Acesso Liberado!*

Bem-vindo ao ${CHANNEL_CONFIG.name}! 🎉

*Seu link de acesso:*
${inviteLink}

*Válido por:* ${daysValid} dias
*Expira em:* ${expiresDate.toLocaleDateString('pt-BR')}

Clique no link para entrar agora!`;

      await bot!.api.sendMessage(userId, message, {
        parse_mode: 'Markdown',
      });

      console.log('[CHANNEL] Link enviado para user:', userId);
      return true;
    } catch (error) {
      console.error('[CHANNEL SEND ERROR]', error);
      return false;
    }
  }
}

export const channelService = new ChannelService();
