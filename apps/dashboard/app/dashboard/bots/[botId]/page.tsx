'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { botsAPI, configAPI, plansAPI } from '@/lib/api';
import BotConfig from '@/components/BotConfig';
import PlansList from '@/components/PlansList';

export default function BotDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.botId as string;

  const [bot, setBot] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'config' | 'plans' | 'metrics'>('config');

  useEffect(() => {
    loadBotData();
  }, [botId]);

  const loadBotData = async () => {
    try {
      const [botRes, plansRes] = await Promise.all([
        botsAPI.get(botId),
        plansAPI.list(botId),
      ]);
      setBot(botRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Erro ao carregar bot:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Bot não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-purple-600 hover:text-purple-700"
            >
              ← Voltar
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                @{bot.telegramUsername}
              </h1>
              <p className="text-gray-600">ID: {bot.telegramBotId}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8" aria-label="Tabs">
            {[
              { id: 'config', label: '⚙️ Configuração' },
              { id: 'plans', label: '💰 Planos' },
              { id: 'metrics', label: '📊 Métricas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {activeTab === 'config' && (
          <BotConfig bot={bot} botId={botId} onUpdate={loadBotData} />
        )}

        {activeTab === 'plans' && (
          <PlansList botId={botId} plans={plans} onPlansUpdate={loadBotData} />
        )}

        {activeTab === 'metrics' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Métricas do Bot</h2>
            <p className="text-gray-600">Em desenvolvimento...</p>
          </div>
        )}
      </main>
    </div>
  );
}
