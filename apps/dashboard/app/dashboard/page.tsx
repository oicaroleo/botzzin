'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { botsAPI, metricsAPI, flowAPI } from '@/lib/api';
import Link from 'next/link';
import CreateBotModal from '@/components/CreateBotModal';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────
interface Bot { id: string; telegramUsername: string; telegramBotId: string; status: string; }
interface FlowLite { id: string; name: string; bots: { bot: { id: string } }[]; }

interface Metrics {
  summary: {
    totalLeads: number; newLeads: number; pixGenerated: number; pixPaid: number;
    revenue: number; conversionRate: number; totalStarts: number; startsPerSale: number;
  };
  statusBreakdown: { started: number; pix_generated: number; paid: number; };
}

interface RevenuePoint { date: string; amount: number; }

interface Lead {
  id: string; telegramUsername: string | null; firstName: string | null;
  status: string; createdAt: string; paidAt: string | null;
  lastPayment: { amount: number; status: string } | null;
}

type Period = 'hoje' | '7d' | '30d' | 'total';

// ── Period config ─────────────────────────────────────────────────────────────
const PERIODS: { key: Period; label: string; days: number; chartDays: number }[] = [
  { key: 'hoje',  label: 'Hoje',    days: 1,    chartDays: 7  },
  { key: '7d',    label: '7 dias',  days: 7,    chartDays: 7  },
  { key: '30d',   label: '30 dias', days: 30,   chartDays: 30 },
  { key: 'total', label: 'Total',   days: 3650, chartDays: 30 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : `R$ ${n.toFixed(2).replace('.', ',')}`;

const fmtShort = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div style={{
      display: 'inline-flex', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '3px', gap: '2px',
    }}>
      {PERIODS.map(p => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          style={{
            padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em',
            background: value === p.key ? 'rgba(102,103,171,0.12)' : 'transparent',
            color: value === p.key ? '#6667AB' : '#505070',
            transition: 'all 0.15s',
          }}
        >{p.label}</button>
      ))}
    </div>
  );
}

function FlowSelect({ flows, value, onChange }: {
  flows: FlowLite[]; value: string | 'all'; onChange: (id: string | 'all') => void;
}) {
  if (flows.length === 0) return null;
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        appearance: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: value === 'all' ? 'rgba(255,255,255,0.03)' : 'rgba(102,103,171,0.08)',
        border: '1px solid', borderColor: value === 'all' ? 'rgba(255,255,255,0.06)' : 'rgba(102,103,171,0.3)',
        color: value === 'all' ? '#7878A0' : '#6667AB',
        borderRadius: '10px', padding: '8px 30px 8px 14px', fontSize: '12px', fontWeight: 700,
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M1 3l4 4 4-4\' stroke=\'%23505070\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/></svg>")',
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
      }}
    >
      <option value="all">Todos os fluxos</option>
      {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  );
}

function StatCard({
  label, value, sub, accent = false, delta, delay = 0,
}: {
  label: string; value: string; sub?: string;
  accent?: boolean; delta?: { val: string; up: boolean }; delay?: number;
}) {
  return (
    <div className={`card fade-up delay-${delay}`} style={{ padding: '22px 24px' }}>
      <div className="label" style={{ marginBottom: '14px' }}>{label}</div>
      <div className="mono" style={{
        fontSize: '34px', fontWeight: 700, lineHeight: 1,
        color: accent ? '#6667AB' : '#F0EEE9', letterSpacing: '-1px',
      }}>
        {value}
      </div>
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sub && <span style={{ fontSize: '12px', color: '#404060' }}>{sub}</span>}
        {delta && (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
            background: delta.up ? 'rgba(102,103,171,0.08)' : 'rgba(255,59,78,0.08)',
            color: delta.up ? '#6667AB' : '#FF3B4E',
          }}>
            {delta.up ? '↑' : '↓'} {delta.val}
          </span>
        )}
      </div>
    </div>
  );
}

function ConversionGauge({ rate }: { rate: number }) {
  const clamped = Math.min(100, Math.max(0, rate));
  // Semicircle gauge via PieChart
  const filled = clamped;
  const empty = 100 - filled;
  const data = [
    { value: filled,  color: '#6667AB' },
    { value: empty,   color: 'rgba(255,255,255,0.06)' },
  ];

  return (
    <div className="card fade-up delay-2" style={{ padding: '22px 24px' }}>
      <div className="label" style={{ marginBottom: '4px' }}>TAXA DE CONVERSÃO</div>
      <div style={{ position: 'relative', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="85%"
              startAngle={180} endAngle={0}
              innerRadius={52} outerRadius={68}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', bottom: '8px',
          textAlign: 'center', lineHeight: 1,
        }}>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 700, color: '#6667AB', letterSpacing: '-1px' }}>
            {clamped.toFixed(1)}%
          </div>
        </div>
      </div>
      <div style={{ marginTop: '4px', fontSize: '12px', color: '#404060', textAlign: 'center' }}>
        PIX pagos / novos leads
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const maxVal = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="card fade-up delay-3" style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div className="label">RECEITA</div>
          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: '#F0EEE9', marginTop: '4px' }}>
            {fmt(data.reduce((s, d) => s + d.amount, 0))}
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#404060', fontWeight: 600 }}>
          {data.length} dias
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6667AB" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#6667AB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 10, fill: '#404060', fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false} axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis hide domain={[0, maxVal * 1.2]} />
          <Tooltip
            contentStyle={{
              background: '#0D0D1C', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', fontSize: '12px', color: '#F0EEE9',
            }}
            labelFormatter={(label: unknown) => shortDate(String(label))}
            formatter={(val: unknown) => [fmt(Number(val)), 'Receita']}
          />
          <Area
            type="monotone" dataKey="amount"
            stroke="#6667AB" strokeWidth={2}
            fill="url(#revGrad)"
            dot={false} activeDot={{ r: 4, fill: '#6667AB', stroke: '#08080A', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActivityLog({ leads }: { leads: Lead[] }) {
  const events = leads.slice(0, 12).map(l => {
    const name = l.telegramUsername ? `@${l.telegramUsername}` : (l.firstName || 'Lead');
    let icon = '👤';
    let text = `Novo lead: ${name}`;
    let color = '#7878A0';

    if (l.status === 'paid' || l.paidAt) {
      icon = '✅'; text = `Venda aprovada: ${name}`; color = '#6667AB';
    } else if (l.status === 'pix_generated') {
      icon = '⚡'; text = `PIX gerado: ${name}`; color = '#9293C9';
    }

    return { icon, text, color, time: l.paidAt || l.createdAt, id: l.id };
  });

  return (
    <div className="card fade-up delay-4" style={{ padding: '22px 24px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div className="label">LOG DE ATIVIDADES</div>
        <span className="dot dot-on" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {events.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#404060', textAlign: 'center', padding: '24px 0' }}>
            Nenhuma atividade no período
          </div>
        ) : events.map(ev => (
          <div key={ev.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}>
              {ev.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px', fontWeight: 600, color: ev.color,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {ev.text}
              </div>
              <div className="mono" style={{ fontSize: '10px', color: '#404060', marginTop: '2px' }}>
                {new Date(ev.time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PixStats({ pixGenerated, pixPaid }: { pixGenerated: number; pixPaid: number }) {
  const rate = pixGenerated > 0 ? (pixPaid / pixGenerated) * 100 : 0;

  return (
    <div className="card fade-up delay-3" style={{ padding: '22px 24px' }}>
      <div className="label" style={{ marginBottom: '14px' }}>VENDAS APROVADAS</div>
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#404060', marginBottom: '4px' }}>PIX GERADOS</div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 700, color: '#F0EEE9' }}>
            {fmtShort(pixGenerated)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#404060', marginBottom: '4px' }}>APROVADOS</div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 700, color: '#6667AB' }}>
            {fmtShort(pixPaid)}
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#404060', fontWeight: 700 }}>TAXA DE APROVAÇÃO</span>
          <span className="mono" style={{ fontSize: '10px', color: '#6667AB', fontWeight: 700 }}>
            {rate.toFixed(1)}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            width: `${Math.min(100, rate)}%`,
            background: 'linear-gradient(90deg, #6667AB, #9293C9)',
            transition: 'width 0.8s cubic-bezier(.22,.68,0,1.2)',
          }} />
        </div>
      </div>
    </div>
  );
}

function BotSelectorRow({ bots, selected, onSelect }: {
  bots: Bot[]; selected: string | 'all'; onSelect: (id: string | 'all') => void;
}) {
  if (bots.length <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button
        onClick={() => onSelect('all')}
        style={{
          padding: '5px 12px', borderRadius: '20px', border: '1px solid',
          borderColor: selected === 'all' ? 'rgba(102,103,171,0.3)' : 'rgba(255,255,255,0.06)',
          background: selected === 'all' ? 'rgba(102,103,171,0.08)' : 'transparent',
          color: selected === 'all' ? '#6667AB' : '#505070',
          fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        }}
      >Todos</button>
      {bots.map(b => (
        <button key={b.id} onClick={() => onSelect(b.id)} style={{
          padding: '5px 12px', borderRadius: '20px', border: '1px solid',
          borderColor: selected === b.id ? 'rgba(102,103,171,0.3)' : 'rgba(255,255,255,0.06)',
          background: selected === b.id ? 'rgba(102,103,171,0.08)' : 'transparent',
          color: selected === b.id ? '#6667AB' : '#505070',
          fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span className={`dot ${b.status === 'active' ? 'dot-on' : 'dot-off'}`} style={{ width: '5px', height: '5px' }} />
          @{b.telegramUsername}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [flows, setFlows] = useState<FlowLite[]>([]);
  const [selectedBot, setSelectedBot] = useState<string | 'all'>('all');
  const [selectedFlow, setSelectedFlow] = useState<string | 'all'>('all');
  const [period, setPeriod] = useState<Period>('7d');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const periodCfg = PERIODS.find(p => p.key === period)!;

  // Load bots once
  useEffect(() => {
    botsAPI.list().then(res => {
      const d = res.data;
      const list: Bot[] = Array.isArray(d) ? d : (d?.bots ?? []);
      setBots(list);
      if (list.length > 0) setSelectedBot(list.length === 1 ? list[0].id : 'all');
    }).catch(console.error);
    flowAPI.list().then(res => {
      setFlows(res.data?.flows ?? []);
    }).catch(console.error);
  }, []);

  // Bots pertencentes ao fluxo selecionado (para filtrar o seletor de bots)
  const flowBotIds = selectedFlow === 'all'
    ? null
    : new Set((flows.find(f => f.id === selectedFlow)?.bots ?? []).map(fb => fb.bot.id));
  const visibleBots = flowBotIds ? bots.filter(b => flowBotIds.has(b.id)) : bots;

  // Ao trocar de fluxo, reseta o bot selecionado
  useEffect(() => { setSelectedBot('all'); }, [selectedFlow]);

  // Load metrics when bot or period changes
  const loadMetrics = useCallback(async () => {
    if (bots.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      const inFlow = flowBotIds ? bots.filter(b => flowBotIds.has(b.id)) : bots;
      const targetBots = selectedBot === 'all' ? inFlow : inFlow.filter(b => b.id === selectedBot);
      if (targetBots.length === 0) {
        setMetrics(null); setRevenueData([]); setLeads([]); setLoading(false); return;
      }

      const [metricsResults, revenueResults, leadsResults] = await Promise.all([
        Promise.all(targetBots.map(b => metricsAPI.summary(b.id, periodCfg.days).then(r => r.data))),
        Promise.all(targetBots.map(b => metricsAPI.revenue(b.id, periodCfg.chartDays).then(r => r.data))),
        Promise.all(targetBots.map(b => metricsAPI.leads(b.id, { days: periodCfg.days, pageSize: 20 }).then(r => r.data))),
      ]);

      // Aggregate metrics across bots
      const agg: Metrics = {
        summary: { totalLeads: 0, newLeads: 0, pixGenerated: 0, pixPaid: 0, revenue: 0, conversionRate: 0, totalStarts: 0, startsPerSale: 0 },
        statusBreakdown: { started: 0, pix_generated: 0, paid: 0 },
      };
      metricsResults.forEach(m => {
        if (!m?.summary) return;
        agg.summary.totalLeads    += m.summary.totalLeads    ?? 0;
        agg.summary.newLeads      += m.summary.newLeads      ?? 0;
        agg.summary.pixGenerated  += m.summary.pixGenerated  ?? 0;
        agg.summary.pixPaid       += m.summary.pixPaid       ?? 0;
        agg.summary.revenue       += m.summary.revenue       ?? 0;
        agg.summary.totalStarts   += m.summary.totalStarts   ?? 0;
        agg.statusBreakdown.started     += m.statusBreakdown?.started      ?? 0;
        agg.statusBreakdown.pix_generated += m.statusBreakdown?.pix_generated ?? 0;
        agg.statusBreakdown.paid        += m.statusBreakdown?.paid          ?? 0;
      });
      agg.summary.conversionRate = agg.summary.newLeads > 0
        ? +((agg.summary.pixPaid / agg.summary.newLeads) * 100).toFixed(2) : 0;
      agg.summary.startsPerSale = agg.summary.pixPaid > 0
        ? +(agg.summary.totalStarts / agg.summary.pixPaid).toFixed(2) : 0;
      setMetrics(agg);

      // Aggregate revenue charts by date
      const revMap: Record<string, number> = {};
      revenueResults.forEach(r => {
        const pts: RevenuePoint[] = r?.data ?? [];
        pts.forEach(p => { revMap[p.date] = (revMap[p.date] || 0) + p.amount; });
      });
      const revArr = Object.entries(revMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, amount]) => ({ date, amount }));
      setRevenueData(revArr);

      // Merge and sort all leads
      const allLeads: Lead[] = leadsResults.flatMap(r => r?.leads ?? []);
      allLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLeads(allLeads.slice(0, 20));
    } catch (e) {
      console.error('[DASHBOARD] Failed to load metrics:', e);
    } finally {
      setLoading(false);
    }
  }, [bots, flows, selectedBot, selectedFlow, period]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const s = metrics?.summary;
  const avgTicket = s && s.pixPaid > 0 ? s.revenue / s.pixPaid : 0;

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Bom dia' : greetHour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#404060', marginBottom: '6px' }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.1 }}>
              {greeting}, {user?.name?.split(' ')[0] ?? 'Usuário'} 👋
            </h1>
            <p style={{ color: '#505070', fontSize: '13px', marginTop: '4px' }}>
              Seu painel de vendas · {bots.length} bot{bots.length !== 1 ? 's' : ''} cadastrado{bots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <FlowSelect flows={flows} value={selectedFlow} onChange={setSelectedFlow} />
            <PeriodFilter value={period} onChange={setPeriod} />
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              style={{ padding: '9px 18px', fontSize: '12px' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Novo Bot
            </button>
          </div>
        </div>

        {/* Bot selector (limitado ao fluxo selecionado) */}
        {visibleBots.length > 1 && (
          <div style={{ marginTop: '16px' }}>
            <BotSelectorRow bots={visibleBots} selected={selectedBot} onSelect={setSelectedBot} />
          </div>
        )}
      </div>

      {/* ── No bots empty state ──────────────────────────────────── */}
      {bots.length === 0 && !loading && (
        <div className="card" style={{ padding: '64px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.1, fontWeight: 800, letterSpacing: '-2px', fontFamily: 'var(--font-mono, monospace)' }}>
            /start
          </div>
          <p style={{ color: '#606080', marginBottom: '24px', fontSize: '15px' }}>
            Nenhum bot cadastrado ainda.
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Criar meu primeiro bot
          </button>
        </div>
      )}

      {/* ── Metrics grid ─────────────────────────────────────────── */}
      {bots.length > 0 && (
        <>
          {/* Loading shimmer */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} className="card" style={{ height: '120px', animation: 'pulse 1.5s infinite' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.02), transparent)', animation: 'shimmer 1.5s infinite' }} />
                </div>
              ))}
            </div>
          )}

          {!loading && !s && (
            <div className="card" style={{ padding: '48px 40px', textAlign: 'center', color: '#505070', fontSize: '14px' }}>
              {selectedFlow !== 'all' ? 'Nenhum bot vinculado a este fluxo.' : 'Sem dados para o filtro selecionado.'}
            </div>
          )}

          {!loading && s && (
            <>
              {/* Row 1: 4 stat cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '14px',
                marginBottom: '14px',
              }}>
                <StatCard
                  label="RECEITA TOTAL"
                  value={fmt(s.revenue)}
                  sub={`${s.pixPaid} vendas aprovadas`}
                  accent
                  delay={1}
                />
                <ConversionGauge rate={s.conversionRate} />
                <StatCard
                  label="TICKET MÉDIO"
                  value={fmt(avgTicket)}
                  sub={`${s.startsPerSale} starts por venda`}
                  delay={3}
                />
                <StatCard
                  label="TOTAL DE STARTS"
                  value={fmtShort(s.totalStarts)}
                  sub={`${s.newLeads} novos leads`}
                  delay={4}
                />
              </div>

              {/* Row 2: PIX stats + Revenue chart + Activity */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 1fr',
                gap: '14px',
                marginBottom: '14px',
              }}>
                {/* PIX stats */}
                <PixStats pixGenerated={s.pixGenerated} pixPaid={s.pixPaid} />

                {/* Revenue chart */}
                <RevenueChart data={revenueData} />

                {/* Activity log */}
                <ActivityLog leads={leads} />
              </div>

              {/* Row 3: Breakdown cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px',
                marginBottom: '32px',
              }}>
                {/* Funil de leads */}
                <div className="card fade-up delay-4" style={{ padding: '22px 24px' }}>
                  <div className="label" style={{ marginBottom: '16px' }}>FUNIL DE LEADS</div>
                  {[
                    { label: 'Iniciados', val: metrics.statusBreakdown.started + metrics.statusBreakdown.pix_generated + metrics.statusBreakdown.paid, color: '#7878A0' },
                    { label: 'PIX Gerado', val: metrics.statusBreakdown.pix_generated + metrics.statusBreakdown.paid, color: '#9293C9' },
                    { label: 'Pagos', val: metrics.statusBreakdown.paid, color: '#6667AB' },
                  ].map(({ label, val, color }) => {
                    const total = metrics.statusBreakdown.started + metrics.statusBreakdown.pix_generated + metrics.statusBreakdown.paid;
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    return (
                      <div key={label} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '11px', color: '#606080', fontWeight: 600 }}>{label}</span>
                          <span className="mono" style={{ fontSize: '11px', color }}>
                            {fmtShort(val)} <span style={{ color: '#404060' }}>({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '99px', background: color,
                            width: `${pct}%`, transition: 'width 0.8s cubic-bezier(.22,.68,0,1.2)',
                            opacity: 0.7,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick stats */}
                <div className="card fade-up delay-4" style={{ padding: '22px 24px' }}>
                  <div className="label" style={{ marginBottom: '16px' }}>RESUMO DO PERÍODO</div>
                  {[
                    { k: 'Novos Leads',   v: fmtShort(s.newLeads) },
                    { k: 'PIX Gerados',   v: fmtShort(s.pixGenerated) },
                    { k: 'PIX Pagos',     v: fmtShort(s.pixPaid) },
                    { k: 'Receita',       v: fmt(s.revenue) },
                    { k: 'Starts / Venda', v: String(s.startsPerSale) },
                  ].map(({ k, v }) => (
                    <div key={k} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span style={{ fontSize: '12px', color: '#505070' }}>{k}</span>
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE9' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Bots status */}
                <div className="card fade-up delay-4" style={{ padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="label">BOTS</div>
                    <Link href="/dashboard/bots" style={{ fontSize: '11px', color: '#404060', textDecoration: 'none', fontWeight: 700 }}>
                      Ver todos →
                    </Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bots.map(b => (
                      <Link key={b.id} href={`/dashboard/bots/${b.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          transition: 'border-color 0.15s', cursor: 'pointer',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`dot ${b.status === 'active' ? 'dot-on' : 'dot-off'}`} />
                            <span style={{ fontSize: '12px', color: '#F0EEE9', fontWeight: 600 }}>
                              @{b.telegramUsername || b.telegramBotId}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
                            background: b.status === 'active' ? 'rgba(102,103,171,0.08)' : 'rgba(255,255,255,0.04)',
                            color: b.status === 'active' ? '#6667AB' : '#404060',
                          }}>
                            {b.status === 'active' ? 'ATIVO' : 'PAUSADO'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {showModal && (
        <CreateBotModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); botsAPI.list().then(r => { const d = r.data; setBots(Array.isArray(d) ? d : (d?.bots ?? [])); }); }}
        />
      )}
    </div>
  );
}
