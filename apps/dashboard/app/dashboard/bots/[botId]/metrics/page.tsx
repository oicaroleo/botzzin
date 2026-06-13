'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { metricsAPI, botsAPI } from '@/lib/api';
import LeadsTable from '@/components/LeadsTable';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Metrics {
  summary: {
    totalLeads: number; newLeads: number; pixGenerated: number; pixPaid: number;
    revenue: number; conversionRate: number; totalStarts: number; startsPerSale: number;
  };
  statusBreakdown: { started: number; pix_generated: number; paid: number; };
}

interface RevenuePoint { date: string; amount: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const DAYS_OPTIONS = [
  { value: 1,  label: 'Hoje'    },
  { value: 7,  label: '7 dias'  },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BotMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.botId as string;

  const [botName, setBotName] = useState('');
  const [days, setDays] = useState(7);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Load bot name
  useEffect(() => {
    botsAPI.get(botId).then(r => {
      setBotName(r.data?.telegramUsername || r.data?.name || botId);
    }).catch(() => {});
  }, [botId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes, lRes] = await Promise.all([
        metricsAPI.summary(botId, days),
        metricsAPI.revenue(botId, days),
        metricsAPI.leads(botId, { days, page, pageSize: 20 }),
      ]);
      setMetrics(mRes.data);
      setRevenue(rRes.data?.data ?? []);
      setLeads(lRes.data?.leads ?? []);
      setTotalPages(lRes.data?.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error('[BOT METRICS]', err);
    } finally {
      setLoading(false);
    }
  }, [botId, days, page]);

  useEffect(() => { load(); }, [load]);

  const s = metrics?.summary;
  const sb = metrics?.statusBreakdown;
  const avgTicket = s && s.pixPaid > 0 ? s.revenue / s.pixPaid : 0;

  return (
    <div>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px', padding: '6px 12px', color: '#7878A0',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            ← Voltar
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
          <div className="label">ANALYTICS</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.8px' }}>
              @{botName}
            </h1>
            <p style={{ color: '#505070', fontSize: '13px', marginTop: '4px' }}>
              Métricas e análise de desempenho
            </p>
          </div>
          {/* Period filter */}
          <div style={{
            display: 'inline-flex', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '3px', gap: '2px',
          }}>
            {DAYS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setDays(opt.value); setPage(1); }}
                style={{
                  padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 700,
                  background: days === opt.value ? 'rgba(102,103,171,0.12)' : 'transparent',
                  color: days === opt.value ? '#6667AB' : '#505070',
                  transition: 'all 0.15s',
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="card" style={{ height: '110px' }} />
          ))}
        </div>
      )}

      {!loading && s && (
        <>
          {/* Row 1: 4 big stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            {[
              { label: 'RECEITA',        value: fmt(s.revenue),                    accent: true  },
              { label: 'VENDAS (PIX)',    value: String(s.pixPaid),                 accent: false },
              { label: 'TICKET MÉDIO',   value: fmt(avgTicket),                    accent: false },
              { label: 'TAXA CONVERSÃO', value: `${s.conversionRate.toFixed(1)}%`, accent: false },
            ].map(({ label, value, accent }, i) => (
              <div key={label} className={`card fade-up delay-${i + 1}`} style={{ padding: '20px 22px' }}>
                <div className="label" style={{ marginBottom: '12px' }}>{label}</div>
                <div className="mono" style={{
                  fontSize: '30px', fontWeight: 700, lineHeight: 1, letterSpacing: '-1px',
                  color: accent ? '#6667AB' : '#F0EEE9',
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: 4 smaller stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            {[
              { label: 'NOVOS LEADS',  value: String(s.newLeads)          },
              { label: 'PIX GERADOS',  value: String(s.pixGenerated)      },
              { label: 'TOTAL STARTS', value: String(s.totalStarts)       },
              { label: 'STARTS/VENDA', value: String(s.startsPerSale)     },
            ].map(({ label, value }, i) => (
              <div key={label} className={`card fade-up delay-${i + 1}`} style={{ padding: '16px 20px' }}>
                <div className="label" style={{ marginBottom: '8px' }}>{label}</div>
                <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: '#7878A0' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Row 3: Revenue chart + Funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
            {/* Area chart */}
            <div className="card fade-up delay-3" style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div className="label">RECEITA POR DIA</div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#F0EEE9', marginTop: '4px' }}>
                    {fmt(revenue.reduce((s, d) => s + d.amount, 0))}
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#404060', fontWeight: 600 }}>{days} dias</span>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={revenue} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6667AB" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6667AB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date" tickFormatter={shortDate}
                    tick={{ fontSize: 10, fill: '#404060' }} tickLine={false} axisLine={false}
                    interval={Math.floor(revenue.length / 6)}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#0D0D1C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px', color: '#F0EEE9' }}
                    labelFormatter={(v: unknown) => shortDate(String(v))}
                    formatter={(v: unknown) => [fmt(Number(v)), 'Receita']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6667AB" strokeWidth={2} fill="url(#revGrad2)" dot={false}
                    activeDot={{ r: 4, fill: '#6667AB', stroke: '#08080A', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Funnel */}
            <div className="card fade-up delay-4" style={{ padding: '22px 24px' }}>
              <div className="label" style={{ marginBottom: '16px' }}>FUNIL DE CONVERSÃO</div>
              {sb && (() => {
                const total = (sb.started || 0) + (sb.pix_generated || 0) + (sb.paid || 0);
                return [
                  { label: 'Iniciados',  val: (sb.started || 0) + (sb.pix_generated || 0) + (sb.paid || 0), color: '#7878A0' },
                  { label: 'PIX Gerado', val: (sb.pix_generated || 0) + (sb.paid || 0), color: '#9293C9'  },
                  { label: 'Pagos',      val: sb.paid || 0,                              color: '#6667AB'  },
                ].map(({ label, val, color }) => {
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  return (
                    <div key={label} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#606080', fontWeight: 600 }}>{label}</span>
                        <span className="mono" style={{ fontSize: '12px', color }}>
                          {val} <span style={{ color: '#404060', fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '99px', background: color,
                          width: `${pct}%`, opacity: 0.8,
                          transition: 'width 0.8s cubic-bezier(.22,.68,0,1.2)',
                        }} />
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Starts bar chart mini */}
              <div style={{ marginTop: '24px' }}>
                <div className="label" style={{ marginBottom: '10px' }}>STARTS vs VENDAS</div>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={[
                    { name: 'Starts', value: s.totalStarts, fill: '#404060' },
                    { name: 'PIX',    value: s.pixGenerated, fill: '#9293C9' },
                    { name: 'Pagos',  value: s.pixPaid,      fill: '#6667AB' },
                  ]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="value" radius={[3,3,0,0]}>
                      {[
                        { fill: '#404060' }, { fill: '#9293C9' }, { fill: '#6667AB' }
                      ].map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#404060' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0D0D1C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: '#F0EEE9' }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Leads table */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700 }}>Leads do Período</h2>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '4px 10px', color: '#7878A0', fontSize: '12px', cursor: 'pointer' }}
                >←</button>
                <span className="mono" style={{ fontSize: '11px', color: '#404060' }}>{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '4px 10px', color: '#7878A0', fontSize: '12px', cursor: 'pointer' }}
                >→</button>
              </div>
            )}
          </div>
          <LeadsTable leads={leads} botId={botId} />
        </>
      )}
    </div>
  );
}
