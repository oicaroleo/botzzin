'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Bot {
  id: string;
  telegramUsername: string;
  telegramBotId: string;
  status: string;
  createdAt: string;
}

interface BotsListProps {
  bots: Bot[];
  onBotCreated?: () => void;
}

export default function BotsList({ bots }: BotsListProps) {
  const router = useRouter();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {bots.map((bot) => (
        <div key={bot.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  @{bot.telegramUsername}
                </h3>
                <p className="text-sm text-gray-600">ID: {bot.telegramBotId}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                bot.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {bot.status === 'active' ? '🟢 Ativo' : '⚫ Inativo'}
              </span>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              Criado em {new Date(bot.createdAt).toLocaleDateString('pt-BR')}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/dashboard/bots/${bot.id}`)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors text-sm font-semibold"
              >
                Configurar
              </button>
              <button
                onClick={() => router.push(`/dashboard/bots/${bot.id}/metrics`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors text-sm font-semibold"
              >
                Métricas
              </button>
            </div>
          </div>
      ))}
    </div>
  );
}
