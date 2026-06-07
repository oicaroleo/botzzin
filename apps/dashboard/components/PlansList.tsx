'use client';

import { useState } from 'react';
import { plansAPI } from '@/lib/api';
import CreatePlanModal from './CreatePlanModal';
import EditPlanModal from './EditPlanModal';

interface Plan {
  id: string;
  name: string;
  days: number;
  price: number;
  emoji: string;
  isDefault: boolean;
  priority: number;
}

interface PlansListProps {
  botId: string;
  plans: Plan[];
  onPlansUpdate: () => void;
}

export default function PlansList({ botId, plans, onPlansUpdate }: PlansListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Tem certeza que deseja deletar este plano?')) return;

    setLoading(true);
    try {
      await plansAPI.delete(botId, planId);
      onPlansUpdate();
    } catch (error) {
      console.error('Erro ao deletar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (planId: string) => {
    setLoading(true);
    try {
      await plansAPI.setDefault(botId, planId);
      onPlansUpdate();
    } catch (error) {
      console.error('Erro ao definir plano padrão:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Planos</h2>
          <p className="text-gray-600">Gerencie os planos de assinatura do seu bot</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
        >
          + Novo Plano
        </button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">Nenhum plano criado ainda.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            Criar primeiro plano
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span>{plan.emoji}</span>
                    {plan.name}
                  </h3>
                </div>
                {plan.isDefault && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                    Padrão
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duração:</span>
                  <span className="font-medium">{plan.days} dias</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-medium text-purple-600 text-lg">
                    R$ {plan.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prioridade:</span>
                  <span className="font-medium">{plan.priority}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-col">
                {!plan.isDefault && (
                  <button
                    onClick={() => handleSetDefault(plan.id)}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    Usar como padrão
                  </button>
                )}
                <button
                  onClick={() => setEditingPlan(plan)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors text-sm font-semibold"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreatePlanModal
          botId={botId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            onPlansUpdate();
          }}
        />
      )}

      {editingPlan && (
        <EditPlanModal
          botId={botId}
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSuccess={() => {
            setEditingPlan(null);
            onPlansUpdate();
          }}
        />
      )}
    </div>
  );
}
