'use client';

import { useState } from 'react';
import { plansAPI } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  days: number;
  price: number;
  emoji: string;
  priority: number;
}

interface EditPlanModalProps {
  botId: string;
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}

const EMOJIS = ['🎯', '💎', '👑', '⭐', '🚀', '💰', '🎁', '🔥'];

export default function EditPlanModal({ botId, plan, onClose, onSuccess }: EditPlanModalProps) {
  const [name, setName] = useState(plan.name);
  const [days, setDays] = useState(plan.days.toString());
  const [price, setPrice] = useState(plan.price.toString());
  const [emoji, setEmoji] = useState(plan.emoji);
  const [priority, setPriority] = useState(plan.priority.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await plansAPI.update(botId, plan.id, {
        name,
        days: parseInt(days),
        price: parseFloat(price),
        emoji,
        priority: parseInt(priority),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao editar plano');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar plano</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Plano
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duração (dias)
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              min="1"
            />
          </div>

          {/* Preço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preço (R$)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              min="0.01"
              step="0.01"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emoji
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded transition-colors ${
                    emoji === e
                      ? 'bg-purple-600 scale-125'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              min="1"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
