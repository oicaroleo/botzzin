'use client';

import { useEffect, useState, useCallback } from 'react';
import { leadsAPI, botsAPI, flowAPI, downloadBlob } from '@/lib/api';

// ── Mapa de eventos da timeline ──────────────────────────────────────────────
const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  started:         { label: 'Deu /start',            color: '#7878A0', icon: '▶' },
  plan_selected:   { label: 'Escolheu o plano',      color: '#9293C9', icon: '◉' },
  pix_generated:   { label: 'Gerou o PIX',           color: '#9293C9', icon: '⬡' },
  paid:            { label: 'Pagamento confirmado',  color: '#6667AB', icon: '✓' },
  access_granted:  { label: 'Acesso liberado',       color: '#6667AB', icon: '🔓' },
  renewal_offered: { label: 'Oferta de renovação',   color: '#FFB020', icon: '⏳' },
  access_expired:  { label: 'Acesso expirou',        color: '#FF8042', icon: '⌛' },
  removed:         { label: 'Removido do canal',     color: '#FF3B4E', icon: '⤬' },
  blocked:         { label: 'Bloqueou o bot',        color: '#FF3B4E', icon: '⛔' },
  funnel_sent:     { label: 'Oferta de esteira',     color: '#9293C9', icon: '✦' },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  convertido: { label: 'Convertido', color: '#6667AB', bg: 'rgba(102,103,171,0.1)' },
  pendente:   { label: 'Pendente',   color: '#7878A0', bg: 'rgba(255,255,255,0.05)' },
  bloqueado:  { label: 'Bloqueado',  color: '#FF3B4E', bg: 'rgba(255,59,78,0.1)' },
};

const fmtMoney = (v: number) => `R$ ${(v ?? 0).toFixed(2)}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: '16px 18px', flex: 1, minWidth: '120px' }}>
      <div style={{ fontSize: '11px', color: '#505070', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <div className="mono" style={{ fontSize: '24px', fontWeight: 700, color }}>{value.toLocaleString('pt-BR')}</div>
    </div>
  );
}

function CopyChip({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="mono" title="Copiar"
      style={{ background: 'rgba(146,147,201,0.06)', border: '1px solid rgba(146,147,201,0.2)', borderRadius: '6px',
        color: done ? '#6667AB' : '#9293C9', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit',
        maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'middle' }}>
      {done ? '✓ copiado' : text}
    </button>
  );
}

// ── Drawer de detalhe (timeline + pagamentos) ────────────────────────────────
function LeadDrawer({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok'|'err'; text: string }|null>(null);

  useEffect(() => {
    setLoading(true);
    leadsAPI.get(leadId).then(r => setLead(r.data)).catch(() => setLead(null)).finally(() => setLoading(false));
  }, [leadId]);

  const resend = async () => {
    setBusy('resend'); setMsg(null);
    try { await leadsAPI.resendAccess(leadId); setMsg({ type: 'ok', text: 'Acesso reenviado ao lead no Telegram.' }); }
    catch (e: any) { setMsg({ type: 'err', text: e.response?.data?.error || 'Falha ao reenviar' }); }
    finally { setBusy(''); }
  };

  const downloadPdf = async () => {
    setBusy('pdf'); setMsg(null);
    try {
      const r = await leadsAPI.downloadReport(leadId);
      downloadBlob(r.data, `lead-${lead?.telegramUsername || lead?.telegramUserId}.pdf`);
    } catch (e: any) { setMsg({ type: 'err', text: 'Falha ao gerar PDF' }); }
    finally { setBusy(''); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '440px', maxWidth: '92vw', height: '100%', overflowY: 'auto',
        background: '#0C0C10', borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800 }}>Detalhe do Lead</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#606080', fontSize: '22px', cursor: 'pointer' }}>×</button>
        </div>

        {loading ? <div style={{ color: '#505070' }}>Carregando...</div> : !lead ? <div style={{ color: '#FF3B4E' }}>Lead não encontrado</div> : (
          <>
            {/* Identidade */}
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>
                {lead.firstName || 'Sem nome'} {lead.telegramUsername && <span style={{ color: '#9293C9', fontWeight: 600 }}>@{lead.telegramUsername}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', fontSize: '12px', color: '#7878A0' }}>
                <div>Telegram ID: <CopyChip text={lead.telegramUserId}/></div>
                <div>Lead ID: <CopyChip text={lead.id}/></div>
                <div>Bot: <span style={{ color: '#AAAACC' }}>@{lead.bot?.telegramUsername}</span></div>
              </div>
            </div>

            {/* Pagamentos + E2E */}
            <div style={{ marginBottom: '18px' }}>
              <div className="label" style={{ marginBottom: '8px' }}>PAGAMENTOS</div>
              {lead.payments?.length ? lead.payments.map((p: any) => (
                <div key={p.id} className="card" style={{ padding: '12px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: p.status === 'paid' ? '#6667AB' : '#7878A0' }}>{fmtMoney(p.amount)}</span>
                    <span style={{ fontSize: '11px', color: '#505070' }}>{p.plan?.name} · {p.status}</span>
                  </div>
                  {p.endToEndId
                    ? <div style={{ fontSize: '11px', color: '#505070' }}>E2E: <CopyChip text={p.endToEndId}/></div>
                    : p.gatewayTxId && <div style={{ fontSize: '11px', color: '#505070' }}>Tx: <CopyChip text={p.gatewayTxId}/></div>}
                </div>
              )) : <div style={{ fontSize: '12px', color: '#505070' }}>Nenhum pagamento.</div>}
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '18px' }}>
              <div className="label" style={{ marginBottom: '10px' }}>HISTÓRICO</div>
              {lead.events?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {lead.events.map((ev: any, i: number) => {
                    const m = EVENT_META[ev.type] || { label: ev.type, color: '#7878A0', icon: '•' };
                    return (
                      <div key={ev.id} style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: m.color + '22', color: m.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>{m.icon}</div>
                          {i < lead.events.length - 1 && <div style={{ width: '1px', flex: 1, minHeight: '14px', background: 'rgba(255,255,255,0.08)' }}/>}
                        </div>
                        <div style={{ paddingBottom: '12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: m.color }}>{m.label}</div>
                          <div style={{ fontSize: '11px', color: '#505070' }}>{fmtDate(ev.createdAt)}</div>
                          {ev.meta?.planName && <div style={{ fontSize: '11px', color: '#7878A0' }}>{ev.meta.planName}{ev.meta.days ? ` · ${ev.meta.days} dias` : ''}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{ fontSize: '12px', color: '#505070' }}>Sem eventos registrados.</div>}
            </div>

            {/* Ações */}
            <div className="label" style={{ marginBottom: '8px' }}>AÇÕES</div>
            {msg && <div className={msg.type === 'ok' ? 'alert-ok' : 'alert-err'} style={{ marginBottom: '10px', fontSize: '12px' }}>{msg.text}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button onClick={resend} disabled={!!busy || !lead.paidAt} title={lead.paidAt ? '' : 'Sem pagamento confirmado'}
                style={{ padding: '8px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                  border: '1px solid rgba(102,103,171,0.25)', background: 'rgba(102,103,171,0.1)', color: lead.paidAt ? '#6667AB' : '#404060',
                  cursor: (busy || !lead.paidAt) ? 'not-allowed' : 'pointer' }}>
                {busy === 'resend' ? 'Reenviando...' : '↗ Reenviar acesso'}
              </button>
              <button onClick={downloadPdf} disabled={!!busy}
                style={{ padding: '8px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                  border: '1px solid rgba(146,147,201,0.25)', background: 'rgba(146,147,201,0.08)', color: '#9293C9', cursor: busy ? 'not-allowed' : 'pointer' }}>
                {busy === 'pdf' ? 'Gerando...' : '⬇ Relatório (PDF)'}
              </button>
              <button disabled title="Em breve" style={{ padding: '8px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#404060', cursor: 'not-allowed' }}>
                Abrir chat <span style={{ fontSize: '9px' }}>· em breve</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [bots, setBots] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, converted: 0, blocked: 0, pending: 0 });
  const [leads, setLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  // Filtros
  const [botId, setBotId] = useState('');
  const [flowId, setFlowId] = useState('');
  const [status, setStatus] = useState('');
  const [days, setDays] = useState('30');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    botsAPI.list().then(r => setBots(Array.isArray(r.data) ? r.data : (r.data?.bots ?? []))).catch(() => {});
    flowAPI.list().then(r => setFlows(r.data?.flows ?? [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = { page, pageSize: 25 };
    if (botId) params.botId = botId;
    if (flowId) params.flowId = flowId;
    if (status) params.status = status;
    if (days) params.days = days;
    if (search.trim()) params.search = search.trim();
    try {
      const [s, l] = await Promise.all([leadsAPI.summary(params), leadsAPI.list(params)]);
      setSummary(s.data);
      setLeads(l.data.leads);
      setPagination(l.data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [botId, flowId, status, days, search, page]);

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    if (!confirm('Exportar os leads filtrados em CSV?\n\n⚠️ Disparos para esses contatos por outro bot podem violar os termos do Telegram e levar ao BANIMENTO da conta/bot. Use com responsabilidade.')) return;
    setExporting(true);
    try {
      const params: any = {};
      if (botId) params.botId = botId;
      if (flowId) params.flowId = flowId;
      if (status) params.status = status;
      if (days) params.days = days;
      if (search.trim()) params.search = search.trim();
      const r = await leadsAPI.exportCsv(params);
      downloadBlob(r.data, `leads-${new Date().toISOString().slice(0,10)}.csv`);
    } catch (e) { alert('Falha ao exportar'); }
    finally { setExporting(false); }
  };

  useEffect(() => { load(); }, [load]);
  // reset page ao mudar filtros
  useEffect(() => { setPage(1); }, [botId, flowId, status, days, search]);

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '4px' }}>Leads</h1>
          <p style={{ color: '#606080', fontSize: '14px' }}>Todos os leads da sua conta — controle de acesso, histórico e busca por código de pagamento (defesa MED).</p>
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn btn-ghost"
          style={{ padding: '9px 16px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {exporting ? 'Exportando...' : '⬇ Exportar CSV'}
        </button>
      </div>

      {/* Totais */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <StatCard label="TOTAL" value={summary.total} color="#F0EEE9"/>
        <StatCard label="CONVERTIDOS" value={summary.converted} color="#6667AB"/>
        <StatCard label="PENDENTES" value={summary.pending} color="#9293C9"/>
        <StatCard label="BLOQUEADOS" value={summary.blocked} color="#FF3B4E"/>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '14px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="inp" value={botId} onChange={e => setBotId(e.target.value)} style={{ width: 'auto', minWidth: '140px', cursor: 'pointer' }}>
          <option value="">Todos os bots</option>
          {bots.map(b => <option key={b.id} value={b.id}>@{b.telegramUsername}</option>)}
        </select>
        <select className="inp" value={flowId} onChange={e => setFlowId(e.target.value)} style={{ width: 'auto', minWidth: '140px', cursor: 'pointer' }}>
          <option value="">Todos os fluxos</option>
          {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="inp" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="">Todos status</option>
          <option value="convertido">Convertidos</option>
          <option value="pendente">Pendentes</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
        <select className="inp" value={days} onChange={e => setDays(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="90">90 dias</option>
          <option value="3650">Tudo</option>
        </select>
        <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por @user, ID ou código E2E..." style={{ flex: 1, minWidth: '200px' }}/>
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.2fr 0.9fr', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#505070', fontWeight: 700, letterSpacing: '0.05em' }}>
          <div>LEAD</div><div>BOT</div><div>STATUS</div><div>ÚLTIMO PAGTO</div><div>START</div>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#505070' }}>Carregando...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#505070' }}>Nenhum lead encontrado.</div>
        ) : leads.map(l => {
          const badge = STATUS_BADGE[l.status] || STATUS_BADGE.pendente;
          return (
            <div key={l.id} onClick={() => setSelected(l.id)} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.2fr 0.9fr',
              padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px', cursor: 'pointer', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.firstName || 'Sem nome'}</div>
                <div className="mono" style={{ fontSize: '11px', color: '#505070' }}>{l.telegramUsername ? `@${l.telegramUsername}` : l.telegramUserId}</div>
              </div>
              <div style={{ color: '#7878A0', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{l.bot?.telegramUsername}</div>
              <div><span style={{ fontSize: '11px', fontWeight: 700, color: badge.color, background: badge.bg, padding: '3px 9px', borderRadius: '20px' }}>{badge.label}</span></div>
              <div className="mono" style={{ fontSize: '12px', color: l.lastPayment ? '#6667AB' : '#404060' }}>{l.lastPayment ? fmtMoney(l.lastPayment.amount) : '—'}</div>
              <div style={{ fontSize: '11px', color: '#505070' }}>{fmtDate(l.createdAt)}</div>
            </div>
          );
        })}
      </div>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', fontSize: '12px' }}>← Anterior</button>
          <span style={{ fontSize: '12px', color: '#606080' }}>Página {pagination.page} de {pagination.totalPages} · {pagination.total} leads</span>
          <button className="btn btn-ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', fontSize: '12px' }}>Próxima →</button>
        </div>
      )}

      {selected && <LeadDrawer leadId={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}
