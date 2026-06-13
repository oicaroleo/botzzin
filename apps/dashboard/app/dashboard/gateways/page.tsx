'use client';

import { useEffect, useState } from 'react';
import { gatewayAPI } from '@/lib/api';

interface GatewayConfig {
  id: string; provider: string; apiKey: string; displayName: string | null;
  priority: number; isActive: boolean; pixGenerated: number; pixPaid: number;
}
interface Settings { abTestEnabled: boolean; platformIntelligenceEnabled: boolean; }
interface PlatformStat { provider: string; pixGenerated: number; pixPaid: number; }

const PROVIDERS = [
  { value: 'pushinpay', label: 'PushinPay' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'pagseguro', label: 'PagSeguro' },
  { value: 'asaas', label: 'Asaas' },
];

function convRate(gen: number, paid: number) {
  return gen > 0 ? ((paid / gen) * 100).toFixed(1) + '%' : '—';
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#606080', lineHeight: 1.5 }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!on)} style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
        background: on ? '#6667AB' : 'rgba(255,255,255,0.08)', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: '3px', left: on ? '22px' : '3px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: on ? '#06060E' : '#404060',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}/>
      </button>
    </div>
  );
}

export default function GatewaysPage() {
  const [gateways, setGateways]       = useState<GatewayConfig[]>([]);
  const [settings, setSettings]       = useState<Settings>({ abTestEnabled: false, platformIntelligenceEnabled: false });
  const [platformStats, setPlatform]  = useState<PlatformStat[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [notice, setNotice]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Form
  const [provider, setProvider]         = useState('pushinpay');
  const [apiKey, setApiKey]             = useState('');
  const [displayName, setDisplayName]   = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await gatewayAPI.list();
      setGateways(r.data.gateways || []);
      setSettings(r.data.settings || { abTestEnabled: false, platformIntelligenceEnabled: false });
      setPlatform(r.data.platformStats || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addGateway = async () => {
    if (!apiKey.trim()) return;
    setSaving(true); setNotice(null);
    try {
      await gatewayAPI.add({ provider, apiKey: apiKey.trim(), displayName: displayName.trim() || undefined });
      setShowAdd(false); setApiKey(''); setDisplayName(''); setProvider('pushinpay');
      setNotice({ type: 'ok', text: 'Gateway adicionado!' });
      await load();
    } catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
    finally { setSaving(false); }
  };

  const removeGateway = async (id: string) => {
    if (!confirm('Remover este gateway?')) return;
    try { await gatewayAPI.remove(id); await load(); }
    catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
  };

  const toggleGateway = async (gw: GatewayConfig) => {
    try { await gatewayAPI.update(gw.id, { isActive: !gw.isActive }); await load(); }
    catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
  };

  const moveUp = async (gw: GatewayConfig) => {
    const sorted = [...gateways].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(g => g.id === gw.id);
    if (idx === 0) return;
    const other = sorted[idx - 1];
    await Promise.all([
      gatewayAPI.update(gw.id, { priority: other.priority }),
      gatewayAPI.update(other.id, { priority: gw.priority }),
    ]);
    await load();
  };

  const moveDown = async (gw: GatewayConfig) => {
    const sorted = [...gateways].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(g => g.id === gw.id);
    if (idx === sorted.length - 1) return;
    const other = sorted[idx + 1];
    await Promise.all([
      gatewayAPI.update(gw.id, { priority: other.priority }),
      gatewayAPI.update(other.id, { priority: gw.priority }),
    ]);
    await load();
  };

  const updateSetting = async (key: keyof Settings, val: boolean) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    try { await gatewayAPI.updateSettings({ [key]: val }); }
    catch (e: any) {
      setSettings(settings); // rollback
      setNotice({ type: 'err', text: e.response?.data?.error || 'Erro ao salvar' });
    }
  };

  const sorted = [...gateways].sort((a, b) => a.priority - b.priority);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#505070' }}>Carregando...</div>;

  return (
    <div className="fade-up" style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '4px' }}>Gateways PIX</h1>
        <p style={{ color: '#606080', fontSize: '14px' }}>Configure seus gateways de pagamento. O sistema usa fallback automático em caso de falha.</p>
      </div>

      {notice && (
        <div className={notice.type === 'ok' ? 'alert-ok' : 'alert-err'} style={{ marginBottom: '20px' }}>
          {notice.text}
        </div>
      )}

      {/* Gateway list */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700 }}>
          Gateways Cadastrados
          <span className="mono" style={{ color: '#404060', fontSize: '12px', marginLeft: '8px' }}>({gateways.length})</span>
        </h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 14px', fontSize: '12px' }}>
          {showAdd ? '✕ Cancelar' : '+ Adicionar Gateway'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: '22px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '8px' }}>PROVEDOR</label>
                <select className="inp" value={provider} onChange={e => setProvider(e.target.value)}
                  style={{ appearance: 'none', cursor: 'pointer' }}>
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '8px' }}>NOME (opcional)</label>
                <input className="inp" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ex: Principal, Backup 1..." />
              </div>
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>API KEY</label>
              <input className="inp mono" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Cole sua API Key aqui..." />
            </div>
            <button className="btn btn-primary" onClick={addGateway} disabled={saving || !apiKey.trim()}
              style={{ padding: '11px', width: '100%' }}>
              {saving ? 'Adicionando...' : 'Adicionar Gateway'}
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: '#505070' }}>
          Nenhum gateway configurado. Adicione um acima para começar a receber PIX.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
          {sorted.map((gw, idx) => (
            <div key={gw.id} className="card" style={{
              padding: '16px 18px',
              borderLeft: `3px solid ${idx === 0 ? '#6667AB' : idx === 1 ? '#9293C9' : '#404060'}`,
              opacity: gw.isActive ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Priority badge */}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                    background: idx === 0 ? 'rgba(102,103,171,0.12)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 800, color: idx === 0 ? '#6667AB' : '#505070',
                  }}>
                    {idx === 0 ? '1°' : `${idx + 1}°`}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      {gw.displayName || PROVIDERS.find(p => p.value === gw.provider)?.label || gw.provider}
                    </div>
                    <div style={{ fontSize: '11px', color: '#505070', marginTop: '1px' }}>
                      {PROVIDERS.find(p => p.value === gw.provider)?.label || gw.provider}
                      {idx === 0 && <span style={{ color: '#6667AB', marginLeft: '6px', fontWeight: 700 }}>· PRIMÁRIO</span>}
                      {idx > 0 && <span style={{ color: '#606080', marginLeft: '6px' }}>· FALLBACK {idx}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Stats */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#404060' }}>CONVERSÃO</div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: gw.pixPaid > 0 ? '#6667AB' : '#505070' }}>
                      {convRate(gw.pixGenerated, gw.pixPaid)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#404060' }}>PIX / PAGOS</div>
                    <div className="mono" style={{ fontSize: '14px' }}>
                      {gw.pixGenerated} / {gw.pixPaid}
                    </div>
                  </div>

                  {/* Reorder */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button onClick={() => moveUp(gw)} disabled={idx === 0}
                      style={{ background: 'none', border: 'none', color: idx === 0 ? '#303050' : '#606080', cursor: idx === 0 ? 'default' : 'pointer', lineHeight: 1, padding: '2px 4px', fontSize: '12px' }}>▲</button>
                    <button onClick={() => moveDown(gw)} disabled={idx === sorted.length - 1}
                      style={{ background: 'none', border: 'none', color: idx === sorted.length - 1 ? '#303050' : '#606080', cursor: idx === sorted.length - 1 ? 'default' : 'pointer', lineHeight: 1, padding: '2px 4px', fontSize: '12px' }}>▼</button>
                  </div>

                  {/* Toggle */}
                  <button onClick={() => toggleGateway(gw)}
                    style={{
                      padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: 'none',
                      background: gw.isActive ? 'rgba(102,103,171,0.1)' : 'rgba(255,255,255,0.05)',
                      color: gw.isActive ? '#6667AB' : '#505070',
                    }}>
                    {gw.isActive ? 'ATIVO' : 'PAUSADO'}
                  </button>

                  <button onClick={() => removeGateway(gw.id)}
                    style={{ background: 'none', border: 'none', color: '#404060', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B4E'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#404060'; }}>
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Smart Routing */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>Roteamento Inteligente</div>
          <div style={{ fontSize: '12px', color: '#505070' }}>Configure como o sistema distribui e escolhe gateways automaticamente.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Toggle
            on={settings.abTestEnabled}
            onChange={v => updateSetting('abTestEnabled', v)}
            label="Teste A/B de Gateways"
            desc="Distribui os PIX gerados entre os gateways ativos em round-robin e mede qual tem maior taxa de conversão (PIX pago / PIX gerado). Os dados aparecem na coluna CONVERSÃO acima."
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
            <Toggle
              on={settings.platformIntelligenceEnabled}
              onChange={v => updateSetting('platformIntelligenceEnabled', v)}
              label="Inteligência da Plataforma"
              desc="Usa dados agregados de TODOS os usuários do BotZZIN para identificar qual gateway está convertendo mais no mercado. Se ativo, o sistema reordena automaticamente seus gateways priorizando o de maior conversão global."
            />
          </div>
        </div>
      </div>

      {/* Platform stats */}
      {platformStats.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>Dados Globais da Plataforma</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...platformStats].sort((a, b) =>
              (b.pixGenerated > 0 ? b.pixPaid / b.pixGenerated : 0) -
              (a.pixGenerated > 0 ? a.pixPaid / a.pixGenerated : 0)
            ).map((s, i) => (
              <div key={s.provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {i === 0 && <span style={{ fontSize: '10px', background: 'rgba(102,103,171,0.1)', color: '#6667AB', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>MELHOR</span>}
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {PROVIDERS.find(p => p.value === s.provider)?.label || s.provider}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <span className="mono" style={{ fontSize: '13px', color: '#505070' }}>
                    {s.pixGenerated.toLocaleString('pt-BR')} PIX gerados
                  </span>
                  <span className="mono" style={{ fontSize: '13px', color: '#6667AB', fontWeight: 700 }}>
                    {convRate(s.pixGenerated, s.pixPaid)} conv.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
