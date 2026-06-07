'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { metricsAPI } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import LeadsTable from '@/components/LeadsTable';

export default function MetricsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.botId as string;

  const [metrics, setMetrics] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [botId, days]);

  const loadMetrics = async () => {
    try {
      const [metricsRes, leadsRes] = await Promise.all([
        metricsAPI.summary(botId, days),
        metricsAPI.leads(botId, { pageSize: 10 }),
      ]);
      setMetrics(metricsRes.data);
      setLeads(leadsRes.data.leads);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando métricas...</p>
      </div>
    );
  }

  const summary = metrics?.summary || {};
  const statusBreakdown = metrics?.statusBreakdown || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-purple-600 hover:text-purple-700"
              >
                ← Voltar
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Métricas & Analytics</h1>
            </div>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <MetricCard
            label="Total de Leads"
            value={summary.totalLeads || 0}
            icon="👥"
            color="blue"
          />
          <MetricCard
            label="Leads Novos"
            value={summary.leadsNovosPeriodo || 0}
            icon="🆕"
            color="purple"
          />
          <MetricCard
            label="PIX Gerados"
            value={summary.pixGerados || 0}
            icon="💳"
            color="yellow"
          />
          <MetricCard
            label="PIX Pagos"
            value={summary.pixPagos || 0}
            icon="✅"
            color="green"
          />
        </div>

        {/* Revenue Card */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Receita Total</h3>
            <p className="text-4xl font-bold text-green-600">
              R$ {(summary.totalReceita || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Período: {days} dias
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Taxa de Conversão</h3>
            <p className="text-4xl font-bold text-purple-600">
              {(summary.conversionRate || 0).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {summary.pixPagos || 0} de {summary.leadsNovosPeriodo || 0} leads convertidos
            </p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribuição de Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {statusBreakdown.started || 0}
              </p>
              <p className="text-sm text-gray-600">Iniciou</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {statusBreakdown.generated_pix || 0}
              </p>
              <p className="text-sm text-gray-600">PIX Gerado</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {statusBreakdown.paid || 0}
              </p>
              <p className="text-sm text-gray-600">Pagou</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {statusBreakdown.failed || 0}
              </p>
              <p className="text-sm text-gray-600">Falhou</p>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <LeadsTable leads={leads} botId={botId} />
      </main>
    </div>
  );
}
