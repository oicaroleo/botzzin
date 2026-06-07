'use client';

import { useState, useEffect } from 'react';
import { botsAPI } from '@/lib/api';

interface BotConfigProps {
  bot: any;
  botId: string;
  onUpdate: () => void;
}

export default function BotConfig({ bot, botId, onUpdate }: BotConfigProps) {
  const [welcomeMessage, setWelcomeMessage] = useState(bot.welcomeMessage || '');
  const [channelId, setChannelId] = useState(bot.defaultChannelId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setWelcomeMessage(bot.welcomeMessage || '');
    setChannelId(bot.defaultChannelId || '');
  }, [bot]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await botsAPI.update(botId, {
        welcomeMessage,
        defaultChannelId: channelId,
      });
      setSuccess('Configurações salvas com sucesso!');
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuração do Bot</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Informações do Bot */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Informações do Bot</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm text-gray-600">Username</label>
              <p className="text-gray-900 font-medium">@{bot.telegramUsername}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">ID do Bot Telegram</label>
              <p className="text-gray-900 font-medium">{bot.telegramBotId}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Token</label>
              <p className="text-gray-900 font-medium font-mono text-sm break-all">
                {bot.telegramBotToken.substring(0, 20)}...
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem de Boas-vindas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem de Boas-vindas
          </label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={5}
            placeholder="Digite a mensagem que será enviada quando o usuário digitar /start"
          />
          <p className="text-xs text-gray-500 mt-2">
            Use {'{nome}'} para inserir o nome do usuário
          </p>
        </div>

        {/* Canal Padrão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID do Canal Padrão
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="-1001234567890"
          />
          <p className="text-xs text-gray-500 mt-2">
            ID do canal ou grupo onde os usuários receberão acesso após pagamento
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          <button
            type="button"
            className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
