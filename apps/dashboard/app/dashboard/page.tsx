'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { botsAPI } from '@/lib/api';
import BotsList from '@/components/BotsList';
import CreateBotModal from '@/components/CreateBotModal';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const response = await botsAPI.list();
      setBots(response.data.bots);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BotZZIN</h1>
              <p className="text-gray-600 mt-1">Bem-vindo, {user?.name}!</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Seus Bots</h2>
            <p className="text-gray-600">Gerenciar e configurar seus bots Telegram</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            + Novo Bot
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">Você ainda não tem nenhum bot cadastrado.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Criar seu primeiro bot
            </button>
          </div>
        ) : (
          <BotsList bots={bots} onBotCreated={loadBots} />
        )}
      </main>

      {showModal && (
        <CreateBotModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadBots();
          }}
        />
      )}
    </div>
  );
}
