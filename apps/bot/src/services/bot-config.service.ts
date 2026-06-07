import axios from 'axios';
import { prisma } from '../db.js';

export interface BotConfigInput {
  channelId?: string;
  channelName?: string;
  welcomeMessage?: string;
  welcomeMediaUrl?: string;
}

export class BotConfigService {
  /**
   * Validar se um canal/grupo existe e o bot tem permissões
   */
  async validateChannel(
    botToken: string,
    channelId: string
  ): Promise<{
    id: string;
    title?: string;
    type: string;
    username?: string;
  }> {
    try {
      // Tentar obter informações do chat
      const response = await axios.get(
        `https://api.telegram.org/bot${botToken}/getChat`,
        {
          params: { chat_id: channelId },
        }
      );

      const data = response.data as { ok: boolean; result: any };
      if (!data.ok) {
        throw new Error('Canal não encontrado');
      }

      const chat = data.result;

      return {
        id: String(chat.id),
        title: chat.title || chat.first_name,
        type: chat.type, // private, group, supergroup, channel
        username: chat.username,
      };
    } catch (error: any) {
      throw new Error(`Erro ao validar canal: ${error.message}`);
    }
  }

  /**
   * Atualizar configuração do bot
   */
  async updateConfig(
    botId: string,
    userId: string,
    input: BotConfigInput
  ): Promise<any> {
    // Verificar se bot existe e pertence ao usuário
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    // Se informou channelId, validar
    let validatedChannelId = input.channelId;
    if (input.channelId) {
      try {
        const channelInfo = await this.validateChannel(
          bot.telegramBotToken,
          input.channelId
        );
        validatedChannelId = channelInfo.id;
      } catch (error: any) {
        throw new Error(`Canal inválido: ${error.message}`);
      }
    }

    // Atualizar bot
    const updatedBot = await prisma.bot.update({
      where: { id: botId },
      data: {
        defaultChannelId: validatedChannelId || bot.defaultChannelId,
        welcomeMessage: input.welcomeMessage || bot.welcomeMessage,
        welcomeMediaUrl: input.welcomeMediaUrl || bot.welcomeMediaUrl,
        updatedAt: new Date(),
      },
      include: {
        config: true,
      },
    });

    // Atualizar BotConfig também
    if (input.channelId || input.channelName) {
      await prisma.botConfig.update({
        where: { botId },
        data: {
          channelId: validatedChannelId || undefined,
          channelName: input.channelName || undefined,
        },
      });
    }

    return this.formatConfigResponse(updatedBot);
  }

  /**
   * Obter configuração do bot
   */
  async getConfig(botId: string, userId: string): Promise<any> {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
      include: {
        config: true,
      },
    });

    if (!bot) {
      throw new Error('Bot não encontrado');
    }

    return this.formatConfigResponse(bot);
  }

  /**
   * Testar webhook do bot
   */
  async testWebhook(
    botToken: string,
    webhookUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Fazer um POST teste para o webhook
      const testPayload = {
        update_id: 123456789,
        message: {
          message_id: 1,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 12345, type: 'private' },
          from: { id: 12345, is_bot: false, first_name: 'Test' },
          text: '/start',
        },
      };

      const response = await axios.post(webhookUrl, testPayload, {
        timeout: 5000,
      });

      return { success: (response as any).status === 200 };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Registrar webhook no Telegram
   */
  async registerWebhook(
    botToken: string,
    webhookUrl: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
        }
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: response.data.description,
        };
      }

      return {
        success: true,
        message: 'Webhook registrado com sucesso!',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload de mídia (salvar URL)
   */
  async updateMedia(
    botId: string,
    userId: string,
    mediaUrl: string
  ): Promise<any> {
    // Validar URL
    try {
      const response = await axios.head(mediaUrl, { timeout: 5000 });
      if ((response as any).status !== 200) {
        throw new Error('URL inválida');
      }
    } catch (error: any) {
      throw new Error(`Erro ao validar mídia: ${error.message}`);
    }

    // Atualizar bot
    const updatedBot = await prisma.bot.update({
      where: { id: botId },
      data: {
        welcomeMediaUrl: mediaUrl,
        updatedAt: new Date(),
      },
      include: {
        config: true,
      },
    });

    return this.formatConfigResponse(updatedBot);
  }

  /**
   * Formatar resposta de configuração
   */
  private formatConfigResponse(bot: any): any {
    return {
      botId: bot.id,
      telegramUsername: bot.telegramUsername,
      welcomeMessage: bot.welcomeMessage,
      welcomeMediaUrl: bot.welcomeMediaUrl,
      defaultChannelId: bot.defaultChannelId,
      config: {
        ...bot.config,
        channelId: bot.defaultChannelId,
      },
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
    };
  }
}

export const botConfigService = new BotConfigService();
