'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flowAPI, botsAPI } from '@/lib/api';

interface Flow {
  id: string; name: string; description: string | null; isActive: boolean;
  deliveryType: string; channelId: string | null;
  downsellEnabled: boolean; upsellEnabled: boolean; orderbumpEnabled: boolean;
  bots: { bot: { id: string; telegramUsername: string; status: string } }[];
  _count: { plans: number };
}

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await flowAPI.list();
      setFlows(r.data.flows || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const r = await flowAPI.create({ name: name.trim() });
      router.push(`/dashboard/flows/${r.data.id}`);
    } catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro ao criar fluxo' }); }
    finally { setCreating(false); }
  };

  const deleteFlow = async (id: string) => {
    if (!confirm('Deletar este fluxo? Todos os planos serão removidos.')) return;
    try { await flowAPI.remove(id); await load(); }
    catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#505070' }}>Carregando...</div>;

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '4px' }}>Meus Fluxos</h1>
          <p style={{ color: '#606080', fontSize: '14px', maxWidth: '500px', lineHeight: 1.5 }}>
            Um fluxo define as mensagens, planos e entrega dos seus bots. Vários bots podem usar o mesmo fluxo.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)} style={{ padding: '10px 18px', flexShrink: 0 }}>
          {showCreate ? '✕ Cancelar' : '+ Novo Fluxo'}
        </button>
      </div>

      {notice && <div className={notice.type === 'ok' ? 'alert-ok' : 'alert-err'} style={{ marginBottom: '20px' }}>{notice.text}</div>}

      {showCreate && (
        <div className="card" style={{ padding: '22px', marginBottom: '20px', maxWidth: '480px' }}>
          <label className="label" style={{ display: 'block', marginBottom: '8px' }}>NOME DO FLUXO</label>
          <input className="inp" value={name} onChange={e => setName(e.target.value)}
            placeholder="Ex: Fluxo Principal, Lançamento Curso X..." onKeyDown={e => { if (e.key === 'Enter') create(); }} />
          <button className="btn btn-primary" onClick={create} disabled={creating || !name.trim()}
            style={{ marginTop: '12px', width: '100%', padding: '11px' }}>
            {creating ? 'Criando...' : 'Criar e Configurar →'}
          </button>
        </div>
      )}

      {flows.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', opacity: 0.1, fontWeight: 800, marginBottom: '16px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-2px' }}>
            FLOW
          </div>
          <p style={{ color: '#606080', marginBottom: '24px', fontSize: '15px' }}>
            Nenhum fluxo criado ainda. Um fluxo define o comportamento completo do seu bot.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Criar meu primeiro fluxo</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {flows.map(flow => (
            <div key={flow.id} className="card card-hover" style={{ padding: '20px' }}
              onClick={() => router.push(`/dashboard/flows/${flow.id}`)}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '3px' }}>{flow.name}</div>
                  {flow.description && <div style={{ fontSize: '12px', color: '#505070' }}>{flow.description}</div>}
                </div>
                <div style={{
                  fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '20px',
                  background: flow.isActive ? 'rgba(191,255,0,0.1)' : 'rgba(255,255,255,0.04)',
                  color: flow.isActive ? '#BFFF00' : '#505070',
                }}>{flow.isActive ? 'ATIVO' : 'PAUSADO'}</div>
              </div>

              {/* Bots */}
              <div style={{ marginBottom: '14px' }}>
                <div className="label" style={{ marginBottom: '6px' }}>BOTS USANDO ESTE FLUXO</div>
                {flow.bots.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#404060' }}>Nenhum bot vinculado</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {flow.bots.map(fb => (
                      <span key={fb.bot.id} style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)', color: '#7878A0',
                      }}>@{fb.bot.telegramUsername}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                <div>
                  <div className="label" style={{ marginBottom: '3px' }}>PLANOS</div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 600 }}>{flow._count?.plans || 0}</div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: '3px' }}>ENTREGA</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#7878A0', marginTop: '2px' }}>
                    {flow.deliveryType === 'channel' ? 'Canal' : flow.deliveryType === 'group' ? 'Grupo' : 'Direto'}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: '3px' }}>EXTRAS</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    {flow.downsellEnabled   && <span style={{ fontSize: '10px', background: 'rgba(0,229,255,0.1)', color: '#00E5FF', padding: '1px 5px', borderRadius: '3px' }}>DS</span>}
                    {flow.upsellEnabled     && <span style={{ fontSize: '10px', background: 'rgba(191,255,0,0.1)', color: '#BFFF00', padding: '1px 5px', borderRadius: '3px' }}>US</span>}
                    {flow.orderbumpEnabled  && <span style={{ fontSize: '10px', background: 'rgba(255,100,100,0.1)', color: '#FF6464', padding: '1px 5px', borderRadius: '3px' }}>OB</span>}
                    {!flow.downsellEnabled && !flow.upsellEnabled && !flow.orderbumpEnabled && <span style={{ fontSize: '11px', color: '#404060' }}>—</span>}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', fontSize: '11px', color: 'rgba(191,255,0,0.5)', fontWeight: 700, letterSpacing: '0.05em' }}>
                EDITAR FLUXO →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
