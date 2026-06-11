'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { botsAPI, metricsAPI } from '@/lib/api';

/* ──────────────────────────────────────────────────────────────
   Shared helpers
────────────────────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.2px' }}>
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" style={{ display: 'block', marginBottom: '8px' }}>{label}</label>
      {children}
    </div>
  );
}

function Notice({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return <div className={type === 'ok' ? 'alert-ok' : 'alert-err'} style={{ marginBottom: '20px' }}>{text}</div>;
}

/* ──────────────────────────────────────────────────────────────
   Config Tab
────────────────────────────────────────────────────────────── */
function ConfigTab({ bot, botId, onUpdate }: { bot: any; botId: string; onUpdate: () => void }) {
  const [name, setName] = useState(bot.name || '');
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { setName(bot.name || ''); }, [bot]);

  const saveName = async () => {
    try { await botsAPI.update(botId, { name }); setNotice({ type: 'ok', text: 'Nome atualizado.' }); onUpdate(); }
    catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
  };

  return (
    <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {notice && <Notice type={notice.type} text={notice.text}/>}

      {/* Info card */}
      <div className="card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <SectionTitle>Token Telegram</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`dot ${bot.status === 'active' ? 'dot-on' : 'dot-off'}`}/>
            <span style={{ fontSize: '11px', fontWeight: 700, color: bot.status === 'active' ? '#BFFF00' : '#505070', letterSpacing: '0.06em' }}>
              {bot.status === 'active' ? 'ATIVO' : 'PAUSADO'}
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
          {[
            { label: 'USERNAME', val: `@${bot.telegramUsername}` },
            { label: 'TELEGRAM ID', val: bot.telegramBotId },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="label" style={{ marginBottom: '4px' }}>{label}</div>
              <div className="mono" style={{ fontSize: '13px', color: '#AAAACC' }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(191,255,0,0.06)', border: '1px solid rgba(191,255,0,0.15)',
          borderRadius: '8px', padding: '10px 12px',
        }}>
          <span className="dot dot-on"/>
          <span style={{ fontSize: '12px', color: '#9D9DBB', lineHeight: 1.4 }}>
            Webhook ativado automaticamente. O bot já está ouvindo mensagens e detecta canais onde for admin.
          </span>
        </div>
      </div>

      {/* Nome interno */}
      <Field label="NOME INTERNO (apelido)">
        <div style={{ display: 'flex', gap: '10px' }}>
          <input className="inp" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); }}
            placeholder="Ex: Bot de Vendas Principal" style={{ flex: 1 }}/>
          <button className="btn btn-primary" onClick={saveName} style={{ padding: '0 18px', flexShrink: 0 }}>
            Salvar
          </button>
        </div>
      </Field>

      {/* Fluxo vinculado */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div className="label" style={{ marginBottom: '10px' }}>FLUXO VINCULADO</div>
        {bot.flow ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{bot.flow.name}</div>
              <div style={{ fontSize: '12px', color: '#505070' }}>Mensagens, planos e entrega configurados aqui</div>
            </div>
            <Link href={`/dashboard/flows/${bot.flow.id}`} style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '7px 14px' }}>Editar →</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#505070' }}>
              Sem fluxo. Mensagens e planos são configurados em <strong style={{ color: '#7878A0' }}>Meus Fluxos</strong>.
            </div>
            <Link href="/dashboard/flows" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ fontSize: '11px', padding: '7px 14px', flexShrink: 0 }}>+ Criar Fluxo</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Leads Tab
────────────────────────────────────────────────────────────── */
function LeadsTab({ botId }: { botId: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metricsAPI.leads(botId, { limit: 50 })
      .then(r => setLeads(r.data.leads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [botId]);

  if (loading) return <div style={{ color: '#505070', padding: '40px', textAlign: 'center' }}>Carregando leads...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <SectionTitle>Leads</SectionTitle>
        <span className="mono" style={{ fontSize: '11px', color: '#404060', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '20px' }}>
          {leads.length}
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: '#505070' }}>
          Quando alguém iniciar o bot com /start, aparecerá aqui.
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                {['Lead', 'Telegram ID', 'PIX gerados', 'Status', 'Cadastro'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.firstName || lead.telegramUsername || '—'}</td>
                  <td><span className="mono" style={{ color: '#505070' }}>{lead.telegramUserId}</span></td>
                  <td><span className="mono">{lead.pixCount ?? 0}</span></td>
                  <td>
                    {lead.paidAt ? (
                      <span style={{
                        fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
                        background: 'rgba(191,255,0,0.1)', color: '#BFFF00',
                        padding: '3px 8px', borderRadius: '20px',
                      }}>PAGO</span>
                    ) : (
                      <span style={{
                        fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
                        background: 'rgba(255,255,255,0.05)', color: '#505070',
                        padding: '3px 8px', borderRadius: '20px',
                      }}>PENDENTE</span>
                    )}
                  </td>
                  <td style={{ color: '#505070' }}>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Metrics Tab
────────────────────────────────────────────────────────────── */
function MetricsTab({ botId }: { botId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metricsAPI.summary(botId, 30).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [botId]);

  if (loading) return <div style={{ color: '#505070', padding: '40px', textAlign: 'center' }}>Carregando métricas...</div>;
  if (!data) return <div style={{ color: '#FF3B4E', padding: '40px', textAlign: 'center' }}>Erro ao carregar dados.</div>;

  // Compatível com a estrutura { summary: {...} } ou flat
  const s = data.summary ?? data;
  const stats = [
    { label: 'TOTAL DE LEADS',  val: s.totalLeads   ?? 0, fmt: String },
    { label: 'NOVOS NO PERÍODO',val: s.newLeads      ?? 0, fmt: String },
    { label: 'PIX PAGOS',       val: s.pixPaid       ?? s.paidLeads ?? 0, fmt: String },
    { label: 'RECEITA',         val: s.revenue       ?? s.totalRevenue ?? 0, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
    { label: 'CONVERSÃO',       val: s.conversionRate ?? 0, fmt: (v: number) => `${v.toFixed(1)}%` },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <SectionTitle>Métricas — últimos 30 dias</SectionTitle>
        <Link href={`/dashboard/bots/${botId}/metrics`} style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '12px', color: '#BFFF00', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
            Ver análise completa →
          </span>
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {stats.map(({ label, val, fmt }) => (
          <div key={label} className="card" style={{ padding: '20px' }}>
            <div className="label" style={{ marginBottom: '10px' }}>{label}</div>
            <div className="mono" style={{ fontSize: '28px', fontWeight: 600, color: '#BFFF00', letterSpacing: '-0.5px' }}>
              {fmt(val)}
            </div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      {data.statusBreakdown && (
        <div style={{ marginTop: '8px' }}>
          <SectionTitle>Status dos Leads</SectionTitle>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'Iniciados',     val: data.statusBreakdown.started       ?? 0, col: '#505070' },
              { label: 'PIX Gerados',   val: data.statusBreakdown.pix_generated ?? 0, col: '#00E5FF' },
              { label: 'Pagos',         val: data.statusBreakdown.paid          ?? 0, col: '#BFFF00' },
            ].map(({ label, val, col }) => (
              <div key={label} className="card" style={{ padding: '16px 20px', minWidth: '120px' }}>
                <div className="label" style={{ marginBottom: '8px' }}>{label}</div>
                <div className="mono" style={{ fontSize: '26px', fontWeight: 600, color: col }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Gateway Tab → redireciona para configuração de conta
────────────────────────────────────────────────────────────── */

function GatewayTab(_: { botId: string }) {
  return (
    <div style={{ maxWidth: '480px' }}>
      <SectionTitle>Gateway de Pagamento PIX</SectionTitle>
      <p style={{ color: '#606080', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
        Os gateways são configurados em nível de conta e funcionam em todos os seus bots automaticamente, com suporte a fallback e A/B testing.
      </p>
      <Link href="/dashboard/gateways" style={{ textDecoration: 'none' }}>
        <div className="card card-hover" style={{ padding: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(191,255,0,0.1)', border: '1px solid rgba(191,255,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#BFFF00', fontWeight: 800 }}>$</div>
            <div>
              <div style={{ fontWeight: 700 }}>Configurar Gateways PIX</div>
              <div style={{ fontSize: '12px', color: '#505070' }}>Fallback automático, A/B testing e inteligência da plataforma</div>
            </div>
          </div>
          <span style={{ color: '#BFFF00', fontSize: '18px' }}>→</span>
        </div>
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Page
────────────────────────────────────────────────────────────── */
type TabId = 'config' | 'leads' | 'metrics' | 'gateway';
const TABS: { id: TabId; label: string }[] = [
  { id: 'config',  label: 'Configuração' },
  { id: 'leads',   label: 'Leads' },
  { id: 'metrics', label: 'Métricas' },
  { id: 'gateway', label: 'Gateway PIX' },
];

export default function BotPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.botId as string;

  const [bot,     setBot]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<TabId>('config');

  useEffect(() => { load(); }, [botId]);

  const load = async () => {
    try {
      const b = await botsAPI.get(botId);
      setBot(b.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: '#505070' }}>Carregando...</div>;
  if (!bot) return <div style={{ textAlign: 'center', padding: '80px', color: '#FF3B4E' }}>Bot não encontrado</div>;

  return (
    <div className="fade-up">
      {/* Back + header */}
      <button onClick={() => router.push('/dashboard')}
        style={{ background: 'none', border: 'none', color: '#505070', cursor: 'pointer', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '20px', padding: 0, display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#BFFF00'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#505070'; }}>
        ← VOLTAR
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
        <div style={{
          width: '48px', height: '48px',
          background: 'linear-gradient(135deg, rgba(191,255,0,0.2), rgba(0,229,255,0.06))',
          border: '1px solid rgba(191,255,0,0.25)',
          borderRadius: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 800, color: '#BFFF00',
          flexShrink: 0,
        }}>
          {(bot.telegramUsername || 'B').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.6px', marginBottom: '4px' }}>
            @{bot.telegramUsername}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`dot ${bot.status === 'active' ? 'dot-on' : 'dot-off'}`}/>
            <span className="mono" style={{ fontSize: '11px', color: '#505070' }}>{bot.telegramBotId}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '2px', marginBottom: '28px',
        background: '#0A0A18', padding: '4px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.05)',
        width: 'fit-content',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: '7px', fontSize: '12px',
              fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'inherit', letterSpacing: '0.02em',
              background: tab === t.id ? '#BFFF00' : 'transparent',
              color: tab === t.id ? '#06060E' : '#505070',
            }}
            onMouseEnter={e => { if (tab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = '#AAAACC'; }}
            onMouseLeave={e => { if (tab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = '#505070'; }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'config'  && <ConfigTab  bot={bot} botId={botId} onUpdate={load}/>}
      {tab === 'leads'   && <LeadsTab   botId={botId}/>}
      {tab === 'metrics' && <MetricsTab botId={botId}/>}
      {tab === 'gateway' && <GatewayTab botId={botId}/>}
    </div>
  );
}
