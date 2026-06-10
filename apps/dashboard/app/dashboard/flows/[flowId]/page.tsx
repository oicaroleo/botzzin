'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { flowAPI, botsAPI } from '@/lib/api';

type TabId = 'bots' | 'mensagens' | 'planos' | 'pagamentos' | 'upsell' | 'downsell' | 'extras';

const TABS: { id: TabId; label: string }[] = [
  { id: 'bots',       label: 'Bots' },
  { id: 'mensagens',  label: 'Boas-vindas' },
  { id: 'planos',     label: 'Planos' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'upsell',     label: 'Upsell' },
  { id: 'downsell',   label: 'Downsell' },
  { id: 'extras',     label: 'Order Bump' },
];

const CTA_ACTIONS = [
  { value: 'plans',    label: 'Ver planos',    hint: 'Mostra a lista de planos do fluxo' },
  { value: 'packs',    label: 'Packs',         hint: 'Entrega um link externo (campo abaixo)' },
  { value: 'external', label: 'Link externo',  hint: 'Abre uma URL (campo abaixo)' },
  { value: 'vip',      label: 'Acesso VIP',    hint: 'Bot gera convite do canal pelo tempo do plano padrão' },
  { value: 'message',  label: 'Mensagem',      hint: 'Responde com um texto (campo abaixo)' },
] as const;

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label" style={{ display: 'block', marginBottom: '8px' }}>{children as string}</label>;
}

function Notice({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return <div className={type === 'ok' ? 'alert-ok' : 'alert-err'} style={{ marginBottom: '16px' }}>{text}</div>;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button onClick={() => onChange(!on)} style={{
        width: '38px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
        background: on ? '#BFFF00' : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: '2px', left: on ? '19px' : '2px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: on ? '#06060E' : '#404060', transition: 'left 0.2s',
        }}/>
      </button>
      <span style={{ fontSize: '14px', fontWeight: 600, color: on ? '#EEEEF8' : '#606080' }}>{label}</span>
    </div>
  );
}

type Channel = { chatId: string; title: string | null; type: string };

// Seletor de canal/grupo: usa os canais auto-detectados (bot é admin) +
// opção de colar ID manual como fallback.
function ChannelPicker({ channels, value, onChange, placeholder }: {
  channels: Channel[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const known = channels.some(c => c.chatId === value);
  const [manual, setManual] = useState(!!value && !known);

  if (manual) {
    return (
      <div>
        <input className="inp mono" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '-1001234567890'}/>
        {channels.length > 0 && (
          <button onClick={() => { setManual(false); onChange(''); }}
            style={{ background: 'none', border: 'none', color: '#00E5FF', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: '6px 0 0', fontFamily: 'inherit' }}>
            ← escolher canal detectado
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <select className="inp" value={value} onChange={e => {
        if (e.target.value === '__manual__') { setManual(true); onChange(''); }
        else onChange(e.target.value);
      }} style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
        <option value="">{channels.length ? 'Selecione um canal/grupo…' : 'Nenhum canal detectado'}</option>
        {channels.map(c => (
          <option key={c.chatId} value={c.chatId}>{c.title || c.chatId} ({c.type})</option>
        ))}
        <option value="__manual__">+ Colar ID manualmente…</option>
      </select>
      <div style={{ fontSize: '10px', color: '#404060', marginTop: '6px' }}>
        Detectamos automaticamente os canais/grupos onde o(s) bot(s) do fluxo são admin. Adicione o bot como admin para ele aparecer aqui.
      </div>
    </div>
  );
}

// ── Boas-vindas Tab (mensagem /start + botões CTA — mesma etapa) ──────────────
interface CtaButton { label: string; action: string; value: string; }

function MensagensTab({ flow, flowId, onUpdate }: { flow: any; flowId: string; onUpdate: () => void }) {
  const [welcome, setWelcome] = useState(flow.welcomeMessage || '');
  const [welcomeMedia, setWelcomeMedia] = useState<any[]>(Array.isArray(flow.welcomeMediaFileIds) ? flow.welcomeMediaFileIds : []);

  // CTA (faz parte da mesma etapa: quando o lead dá /start)
  const [ctaOn, setCtaOn] = useState(!!flow.ctaEnabled);
  const [buttons, setButtons] = useState<CtaButton[]>(
    Array.isArray(flow.ctaButtons) && flow.ctaButtons.length
      ? flow.ctaButtons.map((b: any) => ({ label: b.label || '', action: b.action || 'plans', value: b.value || '' }))
      : [{ label: 'VER PLANOS', action: 'plans', value: '' }]
  );

  const [loading, setLoading] = useState(false);
  const [notice,  setNotice]  = useState<{ type: 'ok'|'err'; text: string }|null>(null);

  const setBtn = (i: number, patch: Partial<CtaButton>) =>
    setButtons(bs => bs.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const addBtn = () => setButtons(bs => [...bs, { label: '', action: 'plans', value: '' }]);
  const delBtn = (i: number) => setButtons(bs => bs.filter((_, idx) => idx !== i));

  const needsValue = (a: string) => a === 'packs' || a === 'external' || a === 'message';
  const valuePlaceholder = (a: string) => a === 'message' ? 'Texto da resposta…' : 'https://…';

  const save = async () => {
    setLoading(true); setNotice(null);
    try {
      const clean = buttons.filter(b => b.label.trim());
      await flowAPI.update(flowId, {
        welcomeMessage: welcome,
        welcomeMediaFileIds: welcomeMedia,
        ctaEnabled: ctaOn,
        ctaButtons: ctaOn ? clean : [],
      });
      setNotice({ type: 'ok', text: 'Boas-vindas salvas!' }); onUpdate();
    } catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {notice && <Notice type={notice.type} text={notice.text}/>}

      <div>
        <Label>MENSAGEM DE BOAS-VINDAS (/start)</Label>
        <textarea className="inp" value={welcome} onChange={e => setWelcome(e.target.value)} rows={4}
          placeholder="Olá {nome}! Bem-vindo..." style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
        <div style={{ fontSize: '11px', color: '#404060', marginTop: '6px' }}>Use {'{nome}'} para o nome do usuário</div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <MediaSlots flowId={flowId} fileIds={welcomeMedia} onChange={setWelcomeMedia}/>
      </div>

      {/* Botões CTA — exibidos junto da boas-vindas (mesma etapa /start) */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '12px' }}><Toggle on={ctaOn} onChange={setCtaOn} label="Botões customizados (CTA)"/></div>
        <p style={{ fontSize: '12px', color: '#505070', lineHeight: 1.55, margin: 0 }}>
          {ctaOn
            ? 'Na boas-vindas o lead vê os botões abaixo. Cada botão segue o fluxo conforme a ação escolhida.'
            : 'Desativado: fluxo padrão — boas-vindas → planos → gerar PIX. Ative para configurar seus próprios botões (ex.: PLANOS, PACKS).'}
        </p>

        {ctaOn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {buttons.map((b, i) => {
              const act = CTA_ACTIONS.find(a => a.value === b.action);
              return (
                <div key={i} className="card" style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="label">BOTÃO {i + 1}</span>
                    {buttons.length > 1 && (
                      <button onClick={() => delBtn(i)} style={{ background: 'none', border: 'none', color: '#404060', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B4E'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#404060'; }}>×</button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <Label>TEXTO DO BOTÃO</Label>
                      <input className="inp" value={b.label} onChange={e => setBtn(i, { label: e.target.value })} placeholder="Ex: VER PLANOS"/>
                    </div>
                    <div>
                      <Label>AÇÃO</Label>
                      <select className="inp" value={b.action} onChange={e => setBtn(i, { action: e.target.value })}
                        style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
                        {CTA_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {act && <div style={{ fontSize: '11px', color: '#404060', marginTop: '8px' }}>{act.hint}</div>}
                  {needsValue(b.action) && (
                    <div style={{ marginTop: '10px' }}>
                      <Label>{b.action === 'message' ? 'MENSAGEM' : 'LINK'}</Label>
                      <input className={b.action === 'message' ? 'inp' : 'inp mono'} value={b.value}
                        onChange={e => setBtn(i, { value: e.target.value })} placeholder={valuePlaceholder(b.action)}/>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addBtn} className="btn" style={{ padding: '10px', border: '1px dashed rgba(255,255,255,0.12)', background: 'transparent', color: '#7878A0', fontWeight: 700 }}>
              + Adicionar botão
            </button>
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={save} disabled={loading} style={{ padding: '12px', width: '100%' }}>
        {loading ? 'Salvando...' : 'Salvar Boas-vindas'}
      </button>
    </div>
  );
}

// ── Planos Tab ────────────────────────────────────────────────────────────────
// Editor de entregável por plano (usa entrega padrão ou sobrescreve)
function PlanDelivery({ plan, flow, flowId, channels, onUpdate }: { plan: any; flow: any; flowId: string; channels: Channel[]; onUpdate: () => void }) {
  const [open,    setOpen]    = useState(false);
  const [useDef,  setUseDef]  = useState(plan.useDefaultDelivery ?? true);
  const [type,    setType]    = useState(plan.deliveryType  || flow.deliveryType || 'channel');
  const [channel, setChannel] = useState(plan.deliveryType ? (plan.deliveryValue || '') : '');
  const [value,   setValue]   = useState(plan.deliveryValue || '');
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const isChan = type === 'channel' || type === 'group';
      await flowAPI.updatePlan(flowId, plan.id, {
        useDefaultDelivery: useDef,
        deliveryType:  useDef ? null : type,
        deliveryValue: useDef ? null : (isChan ? channel : value) || null,
      });
      setOpen(false); onUpdate();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };

  const defLabel = DELIVERY_TYPES.find(d => d.value === flow.deliveryType)?.label || 'Canal';

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '12px', paddingTop: '10px' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: '#505070',
      }}>
        <span style={{ color: useDef ? '#505070' : '#00E5FF' }}>
          {useDef ? `Entrega: padrão (${defLabel})` : `Entrega própria: ${DELIVERY_TYPES.find(d => d.value === type)?.label}`}
        </span>
        <span style={{ color: '#404060' }}>{open ? '▲' : '▼ editar'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Toggle on={!useDef} onChange={v => setUseDef(!v)} label="Usar entregável próprio deste plano"/>
          {!useDef && (
            <DeliveryFields type={type} channel={channel} value={value} onType={setType} onChannel={setChannel} onValue={setValue} channels={channels}/>
          )}
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '9px', fontSize: '12px' }}>
            {saving ? 'Salvando...' : 'Salvar entregável'}
          </button>
        </div>
      )}
    </div>
  );
}

function PlanosTab({ flow, flowId, channels, onUpdate }: { flow: any; flowId: string; channels: Channel[]; onUpdate: () => void }) {
  const plans = flow.plans || [];
  const [open,  setOpen]  = useState(false);
  const [name,  setName]  = useState('');
  const [price, setPrice] = useState('');
  const [days,  setDays]  = useState('30');
  const [desc,  setDesc]  = useState('');
  const [emoji, setEmoji] = useState('💎');
  const [saving, setSaving] = useState(false);
  const [err,   setErr]   = useState('');

  // Variação de preço (nível do fluxo)
  const [varOn,  setVarOn]  = useState(!!flow.priceVariationEnabled);
  const [varMin, setVarMin] = useState(flow.priceVariationMin != null ? String(flow.priceVariationMin) : '0.04');
  const [varMax, setVarMax] = useState(flow.priceVariationMax != null ? String(flow.priceVariationMax) : '1.00');
  const [varSaving, setVarSaving] = useState(false);

  const saveVariation = async () => {
    setVarSaving(true);
    try {
      await flowAPI.update(flowId, {
        priceVariationEnabled: varOn,
        priceVariationMin: varOn ? (parseFloat(varMin) || 0) : null,
        priceVariationMax: varOn ? (parseFloat(varMax) || 0) : null,
      });
      onUpdate();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
    finally { setVarSaving(false); }
  };

  const create = async () => {
    setSaving(true); setErr('');
    try {
      await flowAPI.createPlan(flowId, { name, price: parseFloat(price), days: parseInt(days), description: desc, emoji });
      setOpen(false); setName(''); setPrice(''); setDays('30'); setDesc(''); setEmoji('💎');
      onUpdate();
    } catch (e: any) { setErr(e.response?.data?.error || 'Erro ao criar plano'); }
    finally { setSaving(false); }
  };

  const del = async (planId: string) => {
    if (!confirm('Deletar este plano?')) return;
    try { await flowAPI.deletePlan(flowId, planId); onUpdate(); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
  };

  const setDefault = async (planId: string) => {
    try { await flowAPI.setDefaultPlan(flowId, planId); onUpdate(); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Entregável padrão do fluxo (antes era a aba "Entrega") */}
      <DefaultDeliveryCard flow={flow} flowId={flowId} channels={channels} onUpdate={onUpdate}/>

      {/* Variação de preço (anti-fraude) */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}><Toggle on={varOn} onChange={setVarOn} label="Variação de preço — preço único por cliente (anti-fraude)"/></div>
        <p style={{ fontSize: '12px', color: '#505070', lineHeight: 1.55, margin: '0 0 14px' }}>
          Soma um valor aleatório à faixa abaixo em cada preço, deixando o valor único por lead. O <strong style={{ color: '#7878A0' }}>mesmo lead sempre vê o mesmo preço</strong>.
        </p>
        {varOn && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <div><Label>VARIAÇÃO MÍN (R$)</Label><input className="inp mono" type="number" step="0.01" value={varMin} onChange={e => setVarMin(e.target.value)} style={{ width: '120px' }} placeholder="0.04"/></div>
            <div><Label>VARIAÇÃO MÁX (R$)</Label><input className="inp mono" type="number" step="0.01" value={varMax} onChange={e => setVarMax(e.target.value)} style={{ width: '120px' }} placeholder="1.00"/></div>
            <span style={{ fontSize: '11px', color: '#404060', paddingBottom: '11px' }}>
              ex.: R$ 29,90 → R$ {(29.90 + (parseFloat(varMin) || 0)).toFixed(2)}–{(29.90 + (parseFloat(varMax) || 0)).toFixed(2)}
            </span>
          </div>
        )}
        <button className="btn btn-primary" onClick={saveVariation} disabled={varSaving} style={{ padding: '9px 14px', fontSize: '12px', marginTop: '14px' }}>
          {varSaving ? 'Salvando...' : 'Salvar variação'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '14px' }}>
          Planos <span className="mono" style={{ color: '#404060', fontSize: '12px' }}>({plans.length})</span>
        </h3>
        <button className="btn btn-primary" onClick={() => setOpen(!open)} style={{ padding: '8px 14px', fontSize: '12px' }}>
          {open ? '✕' : '+ Novo Plano'}
        </button>
      </div>

      {open && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          {err && <div className="alert-err" style={{ marginBottom: '12px' }}>{err}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
              <div><Label>NOME DO PLANO</Label><input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Plano Mensal"/></div>
              <div><Label>EMOJI</Label><input className="inp" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width: '60px', textAlign: 'center', fontSize: '18px' }}/></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><Label>PREÇO (R$)</Label><input className="inp mono" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="29.90"/></div>
              <div><Label>DURAÇÃO (dias)</Label><input className="inp mono" type="number" value={days} onChange={e => setDays(e.target.value)}/></div>
            </div>
            <div><Label>DESCRIÇÃO (opcional)</Label><input className="inp" value={desc} onChange={e => setDesc(e.target.value)} placeholder="O que o lead recebe..."/></div>
            <div style={{ fontSize: '11px', color: '#404060' }}>O entregável (padrão ou próprio) é configurado no card do plano após criar.</div>
            <button className="btn btn-primary" onClick={create} disabled={saving || !name || !price} style={{ padding: '11px' }}>
              {saving ? 'Criando...' : 'Criar Plano'}
            </button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#505070' }}>
          Nenhum plano criado. Crie um plano para que os usuários possam pagar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {plans.map((p: any) => (
            <div key={p.id} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {p.name}
                      {p.isDefault && <span style={{ fontSize: '9px', background: 'rgba(191,255,0,0.1)', color: '#BFFF00', padding: '2px 6px', borderRadius: '3px', fontWeight: 800 }}>PADRÃO</span>}
                    </div>
                    {p.description && <div style={{ fontSize: '12px', color: '#505070', marginTop: '1px' }}>{p.description}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ color: '#BFFF00', fontWeight: 700, fontSize: '16px' }}>R$ {p.price.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#404060' }}>{p.days} dias</div>
                  </div>
                  {!p.isDefault && (
                    <button onClick={() => setDefault(p.id)}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(191,255,0,0.2)', background: 'transparent', color: '#BFFF00', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                      padrão
                    </button>
                  )}
                  <button onClick={() => del(p.id)}
                    style={{ background: 'none', border: 'none', color: '#404060', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B4E'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#404060'; }}>×</button>
                </div>
              </div>
              <PlanDelivery plan={p} flow={flow} flowId={flowId} channels={channels} onUpdate={onUpdate}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entrega Tab ───────────────────────────────────────────────────────────────
const DELIVERY_TYPES = [
  { value: 'channel', label: 'Canal' },
  { value: 'group',   label: 'Grupo' },
  { value: 'link',    label: 'Link' },
  { value: 'message', label: 'Mensagem' },
];

// Editor de entrega reutilizável (entrega padrão do fluxo e entregável por plano)
function DeliveryFields({ type, channel, value, onType, onChannel, onValue, channels = [] }: {
  type: string; channel: string; value: string;
  onType: (v: string) => void; onChannel: (v: string) => void; onValue: (v: string) => void;
  channels?: Channel[];
}) {
  return (
    <>
      <div>
        <Label>TIPO DE ENTREGA</Label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {DELIVERY_TYPES.map(opt => (
            <button key={opt.value} onClick={() => onType(opt.value)} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
              background: type === opt.value ? '#BFFF00' : 'rgba(255,255,255,0.05)',
              color: type === opt.value ? '#06060E' : '#606080', transition: 'all 0.15s',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>
      {(type === 'channel' || type === 'group') && (
        <div>
          <Label>{type === 'channel' ? 'CANAL' : 'GRUPO'}</Label>
          <ChannelPicker channels={channels} value={channel} onChange={onChannel}/>
          <div style={{ fontSize: '11px', color: '#404060', marginTop: '6px' }}>
            O bot gera o link de convite com o tempo do plano. Adicione o bot como administrador antes de usar.
          </div>
        </div>
      )}
      {type === 'link' && (
        <div>
          <Label>LINK DE ACESSO</Label>
          <input className="inp mono" value={value} onChange={e => onValue(e.target.value)} placeholder="https://…"/>
        </div>
      )}
      {type === 'message' && (
        <div>
          <Label>MENSAGEM DE ENTREGA</Label>
          <textarea className="inp" value={value} onChange={e => onValue(e.target.value)} rows={3}
            placeholder="Aqui está seu acesso…" style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
        </div>
      )}
    </>
  );
}

// Card de entrega padrão do fluxo — usado dentro da aba Planos.
function DefaultDeliveryCard({ flow, flowId, channels, onUpdate }: { flow: any; flowId: string; channels: Channel[]; onUpdate: () => void }) {
  const [type,    setType]    = useState(flow.deliveryType || 'channel');
  const [channel, setChannel] = useState(flow.channelId     || '');
  const [value,   setValue]   = useState(flow.deliveryValue || '');
  const [loading, setLoading] = useState(false);
  const [ok,      setOk]      = useState(false);

  const save = async () => {
    setLoading(true); setOk(false);
    try {
      await flowAPI.update(flowId, {
        deliveryType: type,
        channelId: (type === 'channel' || type === 'group') ? (channel || null) : null,
        deliveryValue: (type === 'link' || type === 'message') ? (value || null) : null,
      });
      setOk(true); onUpdate(); setTimeout(() => setOk(false), 1500);
    } catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '14px' }}>Entregável padrão</h3>
        {ok && <span style={{ fontSize: '11px', color: '#BFFF00', fontWeight: 700 }}>✓ salvo</span>}
      </div>
      <p style={{ color: '#505070', fontSize: '12px', margin: '0 0 16px', lineHeight: 1.55 }}>
        Entrega <strong style={{ color: '#7878A0' }}>padrão</strong> do fluxo (canal/grupo, link ou mensagem).
        Cada plano usa esta entrega por padrão, mas pode ter um entregável próprio no card do plano.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <DeliveryFields type={type} channel={channel} value={value} onType={setType} onChannel={setChannel} onValue={setValue} channels={channels}/>
        <button className="btn btn-primary" onClick={save} disabled={loading} style={{ padding: '9px 14px', fontSize: '12px', alignSelf: 'flex-start' }}>
          {loading ? 'Salvando...' : 'Salvar entregável padrão'}
        </button>
      </div>
    </div>
  );
}

// ── Bots Tab (1ª etapa: bots + cache de mídia + redirecionador + mini-dashboard) ──
function fmtMoney(n: number) {
  return `R$ ${(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: '16px 18px', flex: 1, minWidth: 0 }}>
      <div className="label" style={{ marginBottom: '8px' }}>{label}</div>
      <div className="mono" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', color: accent ? '#BFFF00' : '#EEEEF8' }}>
        {value}
      </div>
    </div>
  );
}

function BotsTab({ flow, flowId, channels, onUpdate }: { flow: any; flowId: string; channels: Channel[]; onUpdate: () => void }) {
  const [allBots, setAllBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cache de mídia + distribuição + redirecionador
  const [cacheId,  setCacheId]  = useState(flow.mediaCacheChatId || '');
  const [random,   setRandom]   = useState(!!flow.randomDistribution);
  const [slug,     setSlug]     = useState(flow.redirectSlug || '');
  const [domain,   setDomain]   = useState(flow.redirectDomain || '');
  const [savingCfg, setSavingCfg] = useState(false);
  const [notice,   setNotice]   = useState<{ type: 'ok'|'err'; text: string }|null>(null);

  useEffect(() => {
    botsAPI.list().then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.bots ?? []);
      setAllBots(all);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const assignedIds = new Set(flow.bots?.map((fb: any) => fb.bot.id) ?? []);
  const assignedCount = flow.bots?.length ?? 0;
  const stats = flow.stats || { botCount: assignedCount, leadCount: 0, revenue: 0 };

  const assign = async (botId: string) => {
    try { await flowAPI.assignBot(flowId, botId); onUpdate(); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
  };
  const remove = async (botId: string) => {
    try { await flowAPI.removeBot(flowId, botId); onUpdate(); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
  };

  const saveCfg = async () => {
    setSavingCfg(true); setNotice(null);
    try {
      await flowAPI.update(flowId, {
        mediaCacheChatId: cacheId.trim() || null,
        randomDistribution: random,
        redirectSlug: slug.trim() || null,
        redirectDomain: domain.trim() || null,
      });
      setNotice({ type: 'ok', text: 'Configuração salva!' }); onUpdate();
    } catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
    finally { setSavingCfg(false); }
  };

  const redirectBase = domain.trim() ? domain.trim().replace(/\/+$/, '') : 'botzzin.com';
  const redirectUrl = slug.trim() ? `${redirectBase}/redc_${slug.trim()}` : `${redirectBase}/redc_…`;

  if (loading) return <div style={{ color: '#505070' }}>Carregando bots...</div>;

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {notice && <Notice type={notice.type} text={notice.text}/>}

      {/* Mini-dashboard resumida */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <StatPill label="BOTS NO FLUXO"   value={String(stats.botCount)} />
        <StatPill label="LEADS NO FLUXO"  value={stats.leadCount.toLocaleString('pt-BR')} />
        <StatPill label="RECEITA"         value={fmtMoney(stats.revenue)} accent />
      </div>

      {/* Bots do fluxo */}
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
          Bots deste fluxo <span className="mono" style={{ color: '#404060', fontSize: '12px' }}>({assignedCount})</span>
        </h3>
        <p style={{ color: '#606080', fontSize: '12px', marginBottom: '14px', lineHeight: 1.5 }}>
          Selecione quais bots usarão este fluxo. Cada bot só pode estar em um fluxo por vez.
        </p>
        {allBots.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#505070' }}>
            Nenhum bot cadastrado. Vá em "Meus Bots" para adicionar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allBots.map((bot: any) => {
              const inThisFlow = assignedIds.has(bot.id);
              return (
                <div key={bot.id} className="card" style={{
                  padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderColor: inThisFlow ? 'rgba(191,255,0,0.2)' : 'rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      background: inThisFlow ? 'rgba(191,255,0,0.12)' : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 800, color: inThisFlow ? '#BFFF00' : '#606080',
                    }}>{(bot.telegramUsername || 'B').charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>@{bot.telegramUsername}</div>
                      <div className="mono" style={{ fontSize: '11px', color: '#404060' }}>{bot.telegramBotId}</div>
                    </div>
                  </div>
                  <button onClick={() => inThisFlow ? remove(bot.id) : assign(bot.id)} style={{
                    padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: inThisFlow ? 'rgba(255,59,78,0.1)' : 'rgba(191,255,0,0.1)',
                    color: inThisFlow ? '#FF3B4E' : '#BFFF00',
                  }}>
                    {inThisFlow ? 'Remover' : 'Adicionar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cache de mídia */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
          Cache de mídia <span style={{ fontSize: '10px', fontWeight: 800, color: '#FF3B4E', background: 'rgba(255,59,78,0.1)', padding: '2px 7px', borderRadius: '20px', marginLeft: '6px' }}>OBRIGATÓRIO</span>
        </h3>
        <p style={{ fontSize: '12px', color: '#505070', margin: '6px 0 14px', lineHeight: 1.55 }}>
          Canal/grupo onde os bots deste fluxo são <strong style={{ color: '#7878A0' }}>administradores</strong>. As mídias de prévia
          (foto/vídeo/áudio da boas-vindas, downsell, upsell, packs…) ficam armazenadas aqui, no seu próprio Telegram.
        </p>
        <Label>CANAL/GRUPO DE CACHE</Label>
        <ChannelPicker channels={channels} value={cacheId} onChange={setCacheId}/>
        <div style={{ fontSize: '11px', color: '#404060', marginTop: '8px', lineHeight: 1.5 }}>
          Crie um canal/grupo privado e adicione o(s) bot(s) acima como <strong style={{ color: '#606080' }}>admin</strong> — ele aparece na lista automaticamente.
          {!cacheId.trim() && <span style={{ color: '#FF3B4E', display: 'block', marginTop: '4px' }}>⚠ Sem cache de mídia configurado, mídias de prévia não funcionam.</span>}
        </div>
      </div>

      {/* Redirecionador + distribuição */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
          Link redirecionador <span style={{ fontSize: '10px', fontWeight: 800, color: '#00E5FF', background: 'rgba(0,229,255,0.1)', padding: '2px 7px', borderRadius: '20px', marginLeft: '6px' }}>BETA</span>
        </h3>
        <p style={{ fontSize: '12px', color: '#505070', margin: '6px 0 16px', lineHeight: 1.55 }}>
          Em vez de divulgar <span className="mono" style={{ color: '#606080' }}>t.me/seubot</span>, compartilhe um link redirecionador
          que distribui os leads aleatoriamente entre os bots configurados. Pode usar o domínio do sistema ou o seu próprio.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <Toggle on={random} onChange={setRandom} label="Distribuir leads aleatoriamente entre os bots"/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <Label>SLUG DO LINK</Label>
            <input className="inp mono" value={slug} onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="fjahdla"/>
          </div>
          <div>
            <Label>DOMÍNIO PRÓPRIO (opcional)</Label>
            <input className="inp mono" value={domain} onChange={e => setDomain(e.target.value)} placeholder="botzzin.com"/>
          </div>
        </div>

        <div style={{
          background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '8px',
          padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        }}>
          <span className="mono" style={{ fontSize: '13px', color: '#00E5FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {redirectUrl}
          </span>
          <button
            onClick={() => { if (slug.trim()) navigator.clipboard?.writeText(`https://${redirectUrl}`); }}
            disabled={!slug.trim()}
            style={{
              fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', border: 'none',
              cursor: slug.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, fontFamily: 'inherit',
              background: slug.trim() ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: slug.trim() ? '#00E5FF' : '#404060',
            }}>Copiar</button>
        </div>
      </div>

      <button className="btn btn-primary" onClick={saveCfg} disabled={savingCfg} style={{ padding: '12px', width: '100%' }}>
        {savingCfg ? 'Salvando...' : 'Salvar configuração de bots'}
      </button>
    </div>
  );
}

// ── Esteira (Upsell / Downsell) — sequência completa ──────────────────────────
// Seletor de entrega reutilizável (default = herda da entrega global da esteira).
function StepDelivery({ delType, delChan, delVal, set, globalLabel, channels = [] }: {
  delType: string; delChan: string; delVal: string;
  set: (patch: { delType?: string; delChan?: string; delVal?: string }) => void;
  globalLabel: string; channels?: Channel[];
}) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
      <Label>ENTREGA PERSONALIZADA (opcional)</Label>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: delType ? '10px' : 0 }}>
        <button onClick={() => set({ delType: '' })} style={{
          padding: '7px 13px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
          background: delType === '' ? '#BFFF00' : 'rgba(255,255,255,0.05)', color: delType === '' ? '#06060E' : '#606080',
        }}>{globalLabel}</button>
        {DELIVERY_TYPES.map(opt => (
          <button key={opt.value} onClick={() => set({ delType: opt.value })} style={{
            padding: '7px 13px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
            background: delType === opt.value ? '#BFFF00' : 'rgba(255,255,255,0.05)', color: delType === opt.value ? '#06060E' : '#606080',
          }}>{opt.label}</button>
        ))}
      </div>
      {(delType === 'channel' || delType === 'group') && (
        <ChannelPicker channels={channels} value={delChan} onChange={v => set({ delChan: v })}/>
      )}
      {delType === 'link' && <input className="inp mono" value={delVal} onChange={e => set({ delVal: e.target.value })} placeholder="https://…"/>}
      {delType === 'message' && (
        <textarea className="inp" value={delVal} onChange={e => set({ delVal: e.target.value })} rows={2}
          placeholder="Aqui está seu acesso…" style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
      )}
    </div>
  );
}

// Passo individual (sequência): mídias, timing, desconto, mensagem, planos, botões, entrega.
function StepCard({ step, idx, plans, flowId, channels, onUpdate }: {
  step: any; idx: number; plans: any[]; flowId: string; channels: Channel[]; onUpdate: () => void;
}) {
  const [timing,  setTiming]  = useState<string>(step.sendTiming || 'delay');
  const [delay,   setDelay]   = useState(String(step.delayMins ?? 60));
  const [discKind, setDiscKind] = useState<string>(step.discountType || 'percent');
  const [discVal, setDiscVal] = useState(step.discountValue != null ? String(step.discountValue) : '');
  const [msg,     setMsg]     = useState(step.message || '');
  const [planIds, setPlanIds] = useState<string[]>(Array.isArray(step.planIds) ? step.planIds : (step.planId ? [step.planId] : []));
  const [accept,  setAccept]  = useState(step.acceptLabel || '✅ Quero essa oferta!');
  const [reject,  setReject]  = useState(step.rejectLabel || '❌ Não tenho interesse');
  const [hideRej, setHideRej] = useState(!!step.hideReject);
  const [del0,    setDel0]    = useState({
    delType: step.deliveryType || '',
    delChan: step.deliveryType === 'channel' || step.deliveryType === 'group' ? (step.deliveryValue || '') : '',
    delVal:  step.deliveryType === 'link' || step.deliveryType === 'message' ? (step.deliveryValue || '') : '',
  });
  const [media,   setMedia]   = useState<any[]>(Array.isArray(step.mediaFileIds) ? step.mediaFileIds : []);
  const [saving,  setSaving]  = useState(false);

  const togglePlan = (id: string) => setPlanIds(ps => ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]);
  const discounted = (price: number) => {
    const v = parseFloat(discVal) || 0;
    if (!v) return price;
    return discKind === 'percent' ? Math.max(0, price * (1 - v / 100)) : Math.max(0, price - v);
  };

  const save = async () => {
    setSaving(true);
    try {
      const isChan = del0.delType === 'channel' || del0.delType === 'group';
      await flowAPI.updateStep(flowId, step.id, {
        sendTiming: timing,
        delayMins: timing === 'immediate' ? 0 : (parseInt(delay) || 0),
        discountType: discVal ? discKind : null,
        discountValue: discVal ? parseFloat(discVal) : null,
        message: msg,
        planIds,
        planId: planIds[0] || null, // back-compat
        acceptLabel: accept || null,
        rejectLabel: reject || null,
        hideReject: hideRej,
        mediaFileIds: media,
        deliveryType: del0.delType || null,
        deliveryValue: del0.delType ? (isChan ? del0.delChan : del0.delVal) || null : null,
      });
      onUpdate();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm('Remover esta sequência?')) return;
    try { await flowAPI.deleteStep(flowId, step.id); onUpdate(); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
  };

  return (
    <div className="card" style={{ padding: '18px', borderColor: 'rgba(0,229,255,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span className="label" style={{ color: '#00E5FF' }}>SEQUÊNCIA {idx + 1}</span>
        <button onClick={del} style={{ background: 'none', border: 'none', color: '#404060', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B4E'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#404060'; }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <MediaSlots flowId={flowId} fileIds={media} onChange={setMedia}/>

        {/* timing + desconto */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <Label>ENVIAR</Label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['immediate','Imediato'],['delay','Com delay']].map(([v,l]) => (
                <button key={v} onClick={() => setTiming(v)} style={{
                  padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                  background: timing === v ? '#BFFF00' : 'rgba(255,255,255,0.05)', color: timing === v ? '#06060E' : '#606080',
                }}>{l}</button>
              ))}
            </div>
          </div>
          {timing === 'delay' && (
            <div><Label>APÓS (min)</Label><input className="inp mono" type="number" value={delay} onChange={e => setDelay(e.target.value)} style={{ width: '110px' }}/></div>
          )}
          <div>
            <Label>DESCONTO</Label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select className="inp" value={discKind} onChange={e => setDiscKind(e.target.value)} style={{ width: '70px', fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="percent">%</option>
                <option value="value">R$</option>
              </select>
              <input className="inp mono" type="number" step="0.01" value={discVal} onChange={e => setDiscVal(e.target.value)} placeholder="0" style={{ width: '90px' }}/>
            </div>
          </div>
        </div>

        <div>
          <Label>MENSAGEM *</Label>
          <textarea className="inp" value={msg} onChange={e => setMsg(e.target.value)} rows={3} maxLength={4000}
            placeholder="Parabéns pela compra! Temos uma oferta especial…" style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
          <div style={{ fontSize: '10px', color: '#404060', marginTop: '4px', textAlign: 'right' }}>{msg.length}/4000</div>
        </div>

        {/* planos da oferta (multi) */}
        <div>
          <Label>PLANOS DA OFERTA {discVal ? `(com ${discKind === 'percent' ? `${discVal}%` : `R$ ${discVal}`} off)` : ''}</Label>
          {plans.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#505070' }}>Crie planos na aba Planos para oferecê-los aqui.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {plans.map(p => {
                const on = planIds.includes(p.id);
                const dp = discounted(p.price);
                return (
                  <label key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '9px 12px', borderRadius: '8px',
                    border: `1px solid ${on ? 'rgba(191,255,0,0.25)' : 'rgba(255,255,255,0.06)'}`, background: on ? 'rgba(191,255,0,0.05)' : 'transparent',
                  }}>
                    <input type="checkbox" checked={on} onChange={() => togglePlan(p.id)} style={{ accentColor: '#BFFF00', width: '16px', height: '16px', cursor: 'pointer' }}/>
                    <span style={{ fontSize: '13px', color: '#EEEEF8', flex: 1 }}>{p.emoji} {p.name}</span>
                    {discVal ? (
                      <span className="mono" style={{ fontSize: '12px' }}>
                        <span style={{ color: '#404060', textDecoration: 'line-through', marginRight: '6px' }}>R$ {p.price.toFixed(2)}</span>
                        <span style={{ color: '#BFFF00' }}>R$ {dp.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span className="mono" style={{ fontSize: '12px', color: '#BFFF00' }}>R$ {p.price.toFixed(2)}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* botões aceitar/recusar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><Label>BOTÃO ACEITAR</Label><input className="inp" value={accept} onChange={e => setAccept(e.target.value)} maxLength={30}/></div>
          <div><Label>BOTÃO RECUSAR</Label><input className="inp" value={reject} onChange={e => setReject(e.target.value)} maxLength={30} disabled={hideRej} style={{ opacity: hideRej ? 0.4 : 1 }}/></div>
        </div>
        <Toggle on={hideRej} onChange={setHideRej} label="Esconder botão de recusar"/>

        <StepDelivery delType={del0.delType} delChan={del0.delChan} delVal={del0.delVal} channels={channels}
          set={patch => setDel0(d => ({ ...d, ...patch }))} globalLabel="Usar entrega da esteira (global)"/>

        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '9px', width: '100%' }}>
          {saving ? 'Salvando...' : 'Salvar sequência'}
        </button>
      </div>
    </div>
  );
}

function FunnelEditor({ flow, flowId, kind, channels, onUpdate }: {
  flow: any; flowId: string; kind: 'upsell' | 'downsell'; channels: Channel[]; onUpdate: () => void;
}) {
  const isUp = kind === 'upsell';
  const plans: any[] = flow.plans || [];
  const steps: any[] = (flow.funnelSteps || []).filter((s: any) => s.kind === kind);

  const [enabled, setEnabled] = useState(isUp ? !!flow.upsellEnabled : !!flow.downsellEnabled);
  const [startDelay, setStartDelay] = useState(String(isUp ? (flow.upsellDelayMins ?? 60) : (flow.downsellDelayMins ?? 30)));
  const [rule, setRule] = useState(isUp ? (flow.upsellAdvanceRule || 'onlyIfPaid') : (flow.downsellAdvanceRule || 'always'));
  const [trigger, setTrigger] = useState(flow.downsellTrigger || 'both');

  // entrega global da esteira
  const gType = isUp ? (flow.upsellDeliveryType || '') : (flow.downsellDeliveryType || '');
  const gVal  = isUp ? (flow.upsellDeliveryValue || '') : (flow.downsellDeliveryValue || '');
  const [delType, setDelType] = useState<string>(gType);
  const [delChan, setDelChan] = useState(gType === 'channel' || gType === 'group' ? gVal : '');
  const [delVal,  setDelVal]  = useState(gType === 'link' || gType === 'message' ? gVal : '');

  const [savingCfg, setSavingCfg] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok'|'err'; text: string }|null>(null);
  const [addingSave, setAddingSave] = useState(false);

  const saveCfg = async () => {
    setSavingCfg(true); setNotice(null);
    try {
      const isChan = delType === 'channel' || delType === 'group';
      const delivery = delType
        ? { [isUp ? 'upsellDeliveryType' : 'downsellDeliveryType']: delType,
            [isUp ? 'upsellDeliveryValue' : 'downsellDeliveryValue']: (isChan ? delChan : delVal) || null }
        : { [isUp ? 'upsellDeliveryType' : 'downsellDeliveryType']: null,
            [isUp ? 'upsellDeliveryValue' : 'downsellDeliveryValue']: null };
      const payload: any = isUp
        ? { upsellEnabled: enabled, upsellDelayMins: parseInt(startDelay) || 0, upsellAdvanceRule: rule, ...delivery }
        : { downsellEnabled: enabled, downsellDelayMins: parseInt(startDelay) || 0, downsellAdvanceRule: rule,
            downsellTrigger: trigger, ...delivery };
      await flowAPI.update(flowId, payload);
      setNotice({ type: 'ok', text: 'Configuração salva!' }); onUpdate();
    } catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
    finally { setSavingCfg(false); }
  };

  const addStep = async () => {
    setAddingSave(true);
    try {
      await flowAPI.createStep(flowId, { kind, delayMins: 60, message: 'Oferta especial para você...' });
      onUpdate();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
    finally { setAddingSave(false); }
  };

  return (
    <div style={{ maxWidth: '620px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {notice && <Notice type={notice.type} text={notice.text}/>}

      {/* Config geral da esteira */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '10px' }}><Toggle on={enabled} onChange={setEnabled} label={isUp ? 'Esteira de Upsell' : 'Esteira de Downsell'}/></div>
        <p style={{ fontSize: '12px', color: '#505070', lineHeight: 1.55, margin: '0 0 16px' }}>
          {isUp
            ? 'Leads que tiveram compra confirmada recebem novas ofertas em sequência (até 20).'
            : 'Leads que não compraram (geraram PIX e não pagaram, ou deram start e não pagaram) recebem a esteira (até 20 sequências).'}
        </p>
        {enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <Label>{isUp ? 'INICIAR APÓS PAGAMENTO (min)' : 'INICIAR APÓS GATILHO (min)'}</Label>
              <input className="inp mono" type="number" value={startDelay} onChange={e => setStartDelay(e.target.value)} style={{ width: '140px' }}/>
            </div>

            {!isUp && (
              <div>
                <Label>GATILHO</Label>
                <select className="inp" value={trigger} onChange={e => setTrigger(e.target.value)} style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="both">PIX não pago OU start sem pagar</option>
                  <option value="pix_unpaid">Só quem gerou PIX e não pagou</option>
                  <option value="start_unpaid">Só quem deu start e não pagou</option>
                </select>
              </div>
            )}

            <div>
              <Label>REGRA DE AVANÇO ENTRE SEQUÊNCIAS</Label>
              <select className="inp" value={rule} onChange={e => setRule(e.target.value)} style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="onlyIfPaid">Só recebe a próxima se PAGAR a anterior</option>
                <option value="always">Recebe a próxima mesmo sem responder / se recusar</option>
              </select>
            </div>

            {/* entrega global da esteira */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
              <Label>ENTREGA DO {isUp ? 'UPSELL' : 'DOWNSELL'} (global)</Label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: delType ? '10px' : 0 }}>
                <button onClick={() => setDelType('')} style={{
                  padding: '7px 13px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                  background: delType === '' ? '#BFFF00' : 'rgba(255,255,255,0.05)', color: delType === '' ? '#06060E' : '#606080',
                }}>Mesma do fluxo principal</button>
                {DELIVERY_TYPES.map(opt => (
                  <button key={opt.value} onClick={() => setDelType(opt.value)} style={{
                    padding: '7px 13px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                    background: delType === opt.value ? '#BFFF00' : 'rgba(255,255,255,0.05)', color: delType === opt.value ? '#06060E' : '#606080',
                  }}>{opt.label}</button>
                ))}
              </div>
              {(delType === 'channel' || delType === 'group') && (
                <ChannelPicker channels={channels} value={delChan} onChange={setDelChan}/>
              )}
              {delType === 'link' && <input className="inp mono" value={delVal} onChange={e => setDelVal(e.target.value)} placeholder="https://…"/>}
              {delType === 'message' && (
                <textarea className="inp" value={delVal} onChange={e => setDelVal(e.target.value)} rows={2}
                  placeholder="Aqui está seu acesso…" style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
              )}
            </div>

            <button className="btn btn-primary" onClick={saveCfg} disabled={savingCfg} style={{ padding: '9px 14px', fontSize: '12px', alignSelf: 'flex-start' }}>
              {savingCfg ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>
        )}
      </div>

      {/* Sequências */}
      {enabled && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '14px' }}>
              Sequências de {isUp ? 'Upsell' : 'Downsell'} <span className="mono" style={{ color: '#404060', fontSize: '12px' }}>({steps.length}/20)</span>
            </h3>
          </div>

          {steps.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#505070', fontSize: '13px', marginBottom: '12px' }}>
              Nenhuma sequência ainda. Adicione a 1ª.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
              {steps.map((s, i) => (
                <StepCard key={s.id} step={s} idx={i} plans={plans} flowId={flowId} channels={channels} onUpdate={onUpdate}/>
              ))}
            </div>
          )}

          {steps.length < 20 && (
            <button onClick={addStep} disabled={addingSave} className="btn"
              style={{ padding: '11px', width: '100%', border: '1px dashed rgba(255,255,255,0.12)', background: 'transparent', color: '#7878A0', fontWeight: 700 }}>
              {addingSave ? 'Adicionando...' : '+ Adicionar Sequência'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Order Bump Tab (multi-contexto) ───────────────────────────────────────────
const OB_CONTEXTS = [
  { key: 'main',     label: 'Fluxo principal', hint: 'Ao escolher um plano no fluxo padrão' },
  { key: 'upsell',   label: 'Upsell',          hint: 'Ao aceitar uma oferta de upsell' },
  { key: 'downsell', label: 'Downsell',        hint: 'Ao aceitar uma oferta de downsell' },
  { key: 'pack',     label: 'Packs',           hint: 'Ao escolher um pack' },
];

// Slots de mídia (até 3) — upload real: envia ao canal de cache e guarda o file_id.
const mediaIcon = (t: string) => t === 'photo' ? '🖼' : t === 'video' ? '🎬' : t === 'audio' ? '🎵' : '📄';
const normMedia = (m: any) => typeof m === 'string' ? { fileId: m, type: 'document' } : m;

function MediaSlots({ flowId, fileIds, onChange }: {
  flowId: string; fileIds: any[]; onChange: (ids: any[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const items = (Array.isArray(fileIds) ? fileIds : []).map(normMedia);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file || items.length >= 3) return;
    setUploading(true); setErr('');
    try {
      const r = await flowAPI.uploadMedia(flowId, file);
      onChange([...items, r.data]);
    } catch (e: any) { setErr(e.response?.data?.error || 'Falha no upload'); }
    finally { setUploading(false); }
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <Label>MÍDIAS (até 3)</Label>
      <input ref={inputRef} type="file" accept="image/*,video/*,audio/*" style={{ display: 'none' }} onChange={onFile}/>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {items.map((m, i) => (
          <div key={i} style={{
            width: '64px', height: '64px', borderRadius: '8px', border: '1px solid rgba(191,255,0,0.3)', position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#BFFF00', fontSize: '22px',
          }} title={m.fileId}>
            {mediaIcon(m.type)}<span style={{ fontSize: '8px', color: '#7878A0' }}>{m.type}</span>
            <button onClick={() => remove(i)} style={{
              position: 'absolute', top: '-7px', right: '-7px', width: '18px', height: '18px', borderRadius: '50%', border: 'none',
              background: '#FF3B4E', color: '#fff', cursor: 'pointer', fontSize: '12px', lineHeight: '18px', padding: 0,
            }}>×</button>
          </div>
        ))}
        {items.length < 3 && (
          <button onClick={() => inputRef.current?.click()} disabled={uploading} style={{
            width: '64px', height: '64px', borderRadius: '8px', border: '2px dashed rgba(255,255,255,0.12)', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#606080', fontSize: '20px', cursor: uploading ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}>{uploading ? '…' : '＋'}<span style={{ fontSize: '8px' }}>{uploading ? 'enviando' : 'mídia'}</span></button>
        )}
      </div>
      {err && <div style={{ fontSize: '10px', color: '#FF3B4E', marginTop: '6px' }}>{err}</div>}
      <div style={{ fontSize: '10px', color: '#404060', marginTop: '6px' }}>Opcional — foto/vídeo/áudio, armazenado no canal de cache de mídia (aba Bots).</div>
    </div>
  );
}

function OrderBumpCard({ ctx, bump, plans, flowId, channels, onUpdate }: {
  ctx: { key: string; label: string; hint: string }; bump: any; plans: any[]; flowId: string; channels: Channel[]; onUpdate: () => void;
}) {
  const [enabled, setEnabled] = useState(!!bump?.enabled);
  const [name,    setName]    = useState(bump?.name || '');
  const [price,   setPrice]   = useState(bump?.price != null ? String(bump.price) : '');
  const [message, setMessage] = useState(bump?.message || '');
  const [accept,  setAccept]  = useState(bump?.acceptLabel || '✅ ADICIONAR');
  const [reject,  setReject]  = useState(bump?.rejectLabel || '❌ NÃO QUERO');
  const [hideRej, setHideRej] = useState(!!bump?.hideReject);
  const [cta,     setCta]     = useState(bump?.ctaMessage || '');
  const [planId,  setPlanId]  = useState(bump?.offerPlanId || '');

  // Entrega: '' = mesmo do fluxo principal
  const [delType, setDelType]   = useState<string>(bump?.deliveryType || '');
  const [delChan, setDelChan]   = useState(bump?.deliveryType === 'channel' || bump?.deliveryType === 'group' ? (bump?.deliveryValue || '') : '');
  const [delVal,  setDelVal]    = useState(bump?.deliveryType === 'link' || bump?.deliveryType === 'message' ? (bump?.deliveryValue || '') : '');

  const [saving,  setSaving]  = useState(false);
  const [ok,      setOk]      = useState(false);
  const [media,   setMedia]   = useState<any[]>(Array.isArray(bump?.mediaFileIds) ? bump.mediaFileIds : []);

  const save = async () => {
    setSaving(true); setOk(false);
    try {
      const isChan = delType === 'channel' || delType === 'group';
      await flowAPI.saveOrderBump(flowId, ctx.key, {
        enabled,
        name: name || null,
        price: price ? parseFloat(price) : null,
        message: message || null,
        acceptLabel: accept || null,
        rejectLabel: reject || null,
        hideReject: hideRej,
        ctaMessage: cta || null,
        offerPlanId: planId || null,
        mediaFileIds: media,
        deliveryType: delType || null,
        deliveryValue: delType ? (isChan ? delChan : delVal) || null : null,
      });
      setOk(true); onUpdate(); setTimeout(() => setOk(false), 1500);
    } catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <Toggle on={enabled} onChange={setEnabled} label={ctx.label}/>
        {ok && <span style={{ fontSize: '11px', color: '#BFFF00', fontWeight: 700 }}>✓ salvo</span>}
      </div>
      <p style={{ fontSize: '11px', color: '#404060', margin: '0 0 14px' }}>{ctx.hint} — exibido antes de gerar o PIX.</p>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
            <div><Label>NOME DO PRODUTO</Label><input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Acesso ao grupo exclusivo"/></div>
            <div><Label>PREÇO (R$)</Label><input className="inp mono" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"/></div>
          </div>

          <div>
            <Label>DESCRIÇÃO / MENSAGEM</Label>
            <textarea className="inp" value={message} onChange={e => setMessage(e.target.value)} rows={3} maxLength={4000}
              placeholder="Descrição do produto adicional…" style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
            <div style={{ fontSize: '10px', color: '#404060', marginTop: '4px', textAlign: 'right' }}>{message.length}/4000</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><Label>BOTÃO ACEITAR</Label><input className="inp" value={accept} onChange={e => setAccept(e.target.value)} maxLength={30} placeholder="✅ ADICIONAR"/></div>
            <div><Label>BOTÃO RECUSAR</Label><input className="inp" value={reject} onChange={e => setReject(e.target.value)} maxLength={30} placeholder="❌ NÃO QUERO" disabled={hideRej} style={{ opacity: hideRej ? 0.4 : 1 }}/></div>
          </div>
          <Toggle on={hideRej} onChange={setHideRej} label="Esconder botão de recusar"/>

          <div><Label>MENSAGEM CTA (opcional)</Label><input className="inp" value={cta} onChange={e => setCta(e.target.value)} placeholder="Ex: 👇 CLIQUE EM ADICIONAR ANTES QUE SAIA DO AR"/></div>

          <MediaSlots flowId={flowId} fileIds={media} onChange={setMedia}/>

          <div>
            <Label>PLANO VINCULADO (opcional)</Label>
            <select className="inp" value={planId} onChange={e => setPlanId(e.target.value)} style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
              <option value="">Sem plano vinculado</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name} — R$ {p.price.toFixed(2)}</option>)}
            </select>
          </div>

          {/* Entrega do order bump */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
            <Label>ENTREGA DO ORDER BUMP</Label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: delType ? '12px' : 0 }}>
              <button onClick={() => setDelType('')} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                background: delType === '' ? '#BFFF00' : 'rgba(255,255,255,0.05)', color: delType === '' ? '#06060E' : '#606080',
              }}>Mesmo do fluxo principal</button>
              {DELIVERY_TYPES.map(opt => (
                <button key={opt.value} onClick={() => setDelType(opt.value)} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                  background: delType === opt.value ? '#BFFF00' : 'rgba(255,255,255,0.05)', color: delType === opt.value ? '#06060E' : '#606080',
                }}>{opt.label}</button>
              ))}
            </div>
            {(delType === 'channel' || delType === 'group') && (
              <ChannelPicker channels={channels} value={delChan} onChange={setDelChan}/>
            )}
            {delType === 'link' && <input className="inp mono" value={delVal} onChange={e => setDelVal(e.target.value)} placeholder="https://…"/>}
            {delType === 'message' && (
              <textarea className="inp" value={delVal} onChange={e => setDelVal(e.target.value)} rows={2}
                placeholder="Aqui está seu acesso…" style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
            )}
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '9px 14px', fontSize: '12px', marginTop: '14px' }}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
}

function ExtrasTab({ flow, flowId, channels, onUpdate }: { flow: any; flowId: string; channels: Channel[]; onUpdate: () => void }) {
  const plans: any[] = flow.plans || [];
  const bumps: any[] = flow.orderBumps || [];
  const byCtx = (key: string) => bumps.find(b => b.context === key);

  // "Aplicar Order Bump Inicial também em" (flags no Flow)
  const [applyUp,   setApplyUp]   = useState(!!flow.obApplyUpsell);
  const [applyDown, setApplyDown] = useState(!!flow.obApplyDownsell);
  const [applyPack, setApplyPack] = useState(!!flow.obApplyPack);
  const [savingApply, setSavingApply] = useState(false);
  const [ok, setOk] = useState(false);

  const saveApply = async () => {
    setSavingApply(true); setOk(false);
    try {
      await flowAPI.update(flowId, { obApplyUpsell: applyUp, obApplyDownsell: applyDown, obApplyPack: applyPack });
      setOk(true); onUpdate(); setTimeout(() => setOk(false), 1500);
    } catch (e: any) { alert(e.response?.data?.error || 'Erro'); }
    finally { setSavingApply(false); }
  };

  const ckbox = (on: boolean, set: (v: boolean) => void, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: on ? '#EEEEF8' : '#7878A0' }}>
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} style={{ accentColor: '#BFFF00', width: '16px', height: '16px', cursor: 'pointer' }}/>
      {label}
    </label>
  );

  return (
    <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#606080', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
        Order Bump é uma oferta extra exibida quando o lead escolhe o produto, <strong style={{ color: '#7878A0' }}>antes de gerar o PIX</strong>.
        Configure o valor, nome, texto, botões, mídia e entrega por contexto — fluxo principal, upsell, downsell e packs.
      </p>

      {/* Aplicar o do fluxo inicial nos demais contextos */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontWeight: 700, fontSize: '14px' }}>Aplicar Order Bump Inicial também em</h3>
          {ok && <span style={{ fontSize: '11px', color: '#BFFF00', fontWeight: 700 }}>✓ salvo</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ckbox(applyUp,   setApplyUp,   'Upsell')}
          {ckbox(applyDown, setApplyDown, 'Downsell')}
          {ckbox(applyPack, setApplyPack, 'Packs')}
        </div>
        <p style={{ fontSize: '11px', color: '#404060', margin: '10px 0 0' }}>
          Marcando, o Order Bump do <strong style={{ color: '#606080' }}>Fluxo principal</strong> é reusado nesses contextos (ignora a config própria deles).
        </p>
        <button className="btn btn-primary" onClick={saveApply} disabled={savingApply} style={{ padding: '9px 14px', fontSize: '12px', marginTop: '14px' }}>
          {savingApply ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {OB_CONTEXTS.map(ctx => (
        <OrderBumpCard key={ctx.key} ctx={ctx} bump={byCtx(ctx.key)} plans={plans} flowId={flowId} channels={channels} onUpdate={onUpdate}/>
      ))}
    </div>
  );
}

// ── Pagamentos Tab ────────────────────────────────────────────────────────────
interface PayCfg {
  view: 'gerado' | 'aprovado';
  layout: 'padrao' | 'compacto';
  confirmPlan: boolean;
  pixText: string;
  buttonsBeforeMsg: string;
  pixSameMessage: boolean;
  beforeCodeMsg: string;
  btnStatusLabel: string;
  btnCopyLabel: string;
  socialProof: boolean;
  qrDisplay: 'message' | 'separate' | 'none';
  pixFormat: 'mono' | 'plain';
  approvedText: string;
  approvedBtnLabel: string;
}

const DEFAULT_PAYCFG: PayCfg = {
  view: 'gerado',
  layout: 'padrao',
  confirmPlan: false,
  pixText: '✅ <b>Como realizar o pagamento:</b>\n\n1. Abra o app do seu banco.\n2. Selecione "Pagar" ou "PIX".\n3. Escolha "PIX Copia e Cola".\n4. Cole a chave abaixo e finalize com segurança.',
  buttonsBeforeMsg: 'Após efetuar o pagamento, clique no botão abaixo ⤵️',
  pixSameMessage: false,
  beforeCodeMsg: 'Copie o código abaixo:',
  btnStatusLabel: '✅ Verificar Status',
  btnCopyLabel: '📋 Copiar Código',
  socialProof: false,
  qrDisplay: 'message',
  pixFormat: 'mono',
  approvedText: '✅ <b>Pagamento Aprovado!</b>\n\nParabéns {nome}! Seu acesso ao plano {plano} foi liberado. 🎉',
  approvedBtnLabel: '🔓 Acessar Conteúdo',
};

const PIX_VARS = ['{nome}', '{plano}', '{valor}', '{qr_code}', '{saudacao}', '{uf}'];
const PIX_TOOLS: { tag: string; label: string; wrap: [string, string] }[] = [
  { tag: 'b', label: 'B',  wrap: ['<b>', '</b>'] },
  { tag: 'i', label: 'I',  wrap: ['<i>', '</i>'] },
  { tag: 'u', label: 'U',  wrap: ['<u>', '</u>'] },
  { tag: 's', label: 'S',  wrap: ['<s>', '</s>'] },
  { tag: 'code', label: '</>', wrap: ['<code>', '</code>'] },
  { tag: 'spoiler', label: '▩', wrap: ['<tg-spoiler>', '</tg-spoiler>'] },
];

// renderiza tags HTML do Telegram para o preview
function renderTg(text: string) {
  return text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;(\/?)(b|i|u|s|code)&gt;/g, '<$1$2>')
    .replace(/&lt;(\/?)tg-spoiler&gt;/g, '<$1span style="background:#3a3a4a;border-radius:3px">')
    .replace(/\n/g, '<br/>');
}

function PaymentsTab({ flow, flowId, onUpdate }: { flow: any; flowId: string; onUpdate: () => void }) {
  const init: PayCfg = { ...DEFAULT_PAYCFG, ...(flow.paymentConfig || {}) };
  const [cfg, setCfg] = useState<PayCfg>(init);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok'|'err'; text: string }|null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<PayCfg>) => setCfg(c => ({ ...c, ...patch }));

  const insertAtCursor = (before: string, after = '') => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const val = cfg.pixText;
    const next = val.slice(0, s) + before + val.slice(s, e) + after + val.slice(e);
    set({ pixText: next });
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + before.length + (e - s) + after.length; });
  };

  const save = async () => {
    setLoading(true); setNotice(null);
    try {
      await flowAPI.update(flowId, { paymentConfig: cfg });
      setNotice({ type: 'ok', text: 'Pagamento salvo!' }); onUpdate();
    } catch (e: any) { setNotice({ type: 'err', text: e.response?.data?.error || 'Erro' }); }
    finally { setLoading(false); }
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
    background: active ? 'rgba(0,229,255,0.14)' : 'transparent', color: active ? '#00E5FF' : '#505070', transition: 'all 0.15s',
  });

  // Bubble do preview
  const Bubble = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '6px' }}>
      <div style={{ maxWidth: '88%', borderRadius: '12px', background: '#1e2c3a', padding: '8px 11px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: '24px', alignItems: 'start' }}>
      {/* ─── Editor ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
        {notice && <Notice type={notice.type} text={notice.text}/>}

        {/* sub-view + layout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px', padding: '3px' }}>
            <button style={pillBtn(cfg.view === 'gerado')}   onClick={() => set({ view: 'gerado' })}>Pagamento Gerado</button>
            <button style={pillBtn(cfg.view === 'aprovado')} onClick={() => set({ view: 'aprovado' })}>Pagamento Aprovado</button>
          </div>
          {cfg.view === 'gerado' && (
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px', padding: '3px' }}>
              <button style={pillBtn(cfg.layout === 'padrao')}   onClick={() => set({ layout: 'padrao' })}>Padrão</button>
              <button style={pillBtn(cfg.layout === 'compacto')} onClick={() => set({ layout: 'compacto' })}>Compacto</button>
            </div>
          )}
        </div>

        {cfg.view === 'aprovado' ? (
          <div className="card" style={{ padding: '18px' }}>
            <Label>MENSAGEM DE PAGAMENTO APROVADO</Label>
            <textarea className="inp" value={cfg.approvedText} onChange={e => set({ approvedText: e.target.value })} rows={4}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
            <div style={{ marginTop: '12px' }}>
              <Label>TEXTO DO BOTÃO DE ACESSO</Label>
              <input className="inp" value={cfg.approvedBtnLabel} onChange={e => set({ approvedBtnLabel: e.target.value })}/>
            </div>
          </div>
        ) : (
          <>
            {/* Confirmação do plano */}
            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#EEEEF8' }}>Confirmação do plano</div>
                <div style={{ fontSize: '11px', color: '#404060' }}>Mostra os detalhes antes de gerar o PIX</div>
              </div>
              <Toggle on={cfg.confirmPlan} onChange={v => set({ confirmPlan: v })} label=""/>
            </div>

            {/* Texto do PIX */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#EEEEF8' }}>Texto do PIX</span>
              </div>

              {/* mídias (até 3) */}
              <Label>MÍDIAS (até 3)</Label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: '64px', height: '64px', borderRadius: '8px', border: '2px dashed rgba(255,255,255,0.1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#404060', fontSize: '20px', cursor: 'not-allowed', opacity: i === 0 ? 1 : 0.4,
                  }} title="Upload disponível em breve">＋<span style={{ fontSize: '8px' }}>mídia</span></div>
                ))}
              </div>

              {/* toolbar */}
              <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {PIX_TOOLS.map(t => (
                  <button key={t.tag} onClick={() => insertAtCursor(t.wrap[0], t.wrap[1])} title={t.tag}
                    style={{ width: '30px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.04)', color: '#7878A0', fontSize: '12px', fontWeight: 800, fontFamily: 'inherit' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <textarea ref={taRef} className="inp" value={cfg.pixText} onChange={e => set({ pixText: e.target.value })} rows={6}
                maxLength={4000} style={{ resize: 'vertical', fontFamily: 'inherit' }}/>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {PIX_VARS.map(v => (
                    <button key={v} onClick={() => insertAtCursor(v)} className="mono"
                      style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(0,229,255,0.2)',
                        background: 'rgba(0,229,255,0.06)', color: '#00E5FF', cursor: 'pointer', fontFamily: 'inherit' }}>{v}</button>
                  ))}
                </div>
                <span style={{ fontSize: '10px', color: '#404060' }}>{cfg.pixText.length}/4000</span>
              </div>
            </div>

            {/* Botões & CTA */}
            <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EEEEF8' }}>Botões & CTA</span>
              <div><Label>MENSAGEM ANTES DOS BOTÕES</Label>
                <input className="inp" value={cfg.buttonsBeforeMsg} onChange={e => set({ buttonsBeforeMsg: e.target.value })}/></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#EEEEF8' }}>Código PIX na mesma mensagem</div>
                  <div style={{ fontSize: '11px', color: '#404060' }}>Se off, o PIX vai em mensagem separada</div>
                </div>
                <Toggle on={cfg.pixSameMessage} onChange={v => set({ pixSameMessage: v })} label=""/>
              </div>
              <div><Label>MENSAGEM ANTES DO CÓDIGO PIX</Label>
                <input className="inp" value={cfg.beforeCodeMsg} onChange={e => set({ beforeCodeMsg: e.target.value })}/></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><Label>BOTÃO — VERIFICAR STATUS</Label><input className="inp" value={cfg.btnStatusLabel} onChange={e => set({ btnStatusLabel: e.target.value })}/></div>
                <div><Label>BOTÃO — COPIAR CÓDIGO</Label><input className="inp" value={cfg.btnCopyLabel} onChange={e => set({ btnCopyLabel: e.target.value })}/></div>
              </div>
            </div>

            {/* Prova social + Config PIX */}
            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#EEEEF8' }}>Prova social</div>
                <div style={{ fontSize: '11px', color: '#404060' }}>Mensagem aleatória após PIX gerado</div>
              </div>
              <Toggle on={cfg.socialProof} onChange={v => set({ socialProof: v })} label=""/>
            </div>

            <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EEEEF8' }}>Configurações do PIX</span>
              <div><Label>EXIBIÇÃO DO QR CODE</Label>
                <select className="inp" value={cfg.qrDisplay} onChange={e => set({ qrDisplay: e.target.value as PayCfg['qrDisplay'] })} style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="message">Na mensagem (imagem enviada junto)</option>
                  <option value="separate">Em mensagem separada</option>
                  <option value="none">Não enviar QR Code</option>
                </select></div>
              <div><Label>FORMATO DO CÓDIGO PIX</Label>
                <select className="inp" value={cfg.pixFormat} onChange={e => set({ pixFormat: e.target.value as PayCfg['pixFormat'] })} style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="mono">`Código` (monoespaçado — copiável ao clicar)</option>
                  <option value="plain">Texto normal</option>
                </select></div>
            </div>
          </>
        )}

        <button className="btn btn-primary" onClick={save} disabled={loading} style={{ padding: '12px', width: '100%' }}>
          {loading ? 'Salvando...' : 'Salvar configuração de pagamento'}
        </button>
      </div>

      {/* ─── Preview Telegram ─── */}
      <div style={{ position: 'sticky', top: '16px' }}>
        <div className="label" style={{ marginBottom: '8px' }}>PREVIEW DO TELEGRAM</div>
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0e1621' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: '#1a2332', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#00E5FF,#BFFF00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#06060E' }}>S</div>
            <div><div style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>Seu Bot</div><div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>bot</div></div>
          </div>
          <div style={{ padding: '12px', minHeight: '260px' }}>
            {cfg.view === 'aprovado' ? (
              <Bubble>
                <span dangerouslySetInnerHTML={{ __html: renderTg(cfg.approvedText) }} />
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '6px', textAlign: 'center', color: '#64b5ef', fontWeight: 600 }}>{cfg.approvedBtnLabel}</div>
              </Bubble>
            ) : (
              <>
                {cfg.qrDisplay !== 'none' && (
                  <Bubble>
                    <div style={{ width: '120px', height: '120px', background: '#fff', borderRadius: '8px', margin: '2px auto', display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gridTemplateRows: 'repeat(8,1fr)', padding: '8px', gap: '1px' }}>
                      {Array.from({ length: 64 }).map((_, i) => <div key={i} style={{ background: (i * 7 + (i % 5)) % 3 === 0 ? '#000' : 'transparent' }} />)}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Escaneie o QR Code para pagar</div>
                  </Bubble>
                )}
                <Bubble><span dangerouslySetInnerHTML={{ __html: renderTg(cfg.pixText) }} /></Bubble>
                {!cfg.pixSameMessage && <Bubble>{cfg.beforeCodeMsg}</Bubble>}
                <Bubble>
                  <span className="mono" style={{ fontSize: '10px', color: cfg.pixFormat === 'mono' ? '#BFFF00' : 'rgba(255,255,255,0.75)', wordBreak: 'break-all' }}>
                    00020101021226940014br.gov.bcb.pix2572qrcode.exemplo…5204000053039865802BR
                  </span>
                </Bubble>
                <Bubble>
                  <div>{cfg.buttonsBeforeMsg}</div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px' }}>
                    <div style={{ padding: '7px 0', textAlign: 'center', color: '#64b5ef', fontWeight: 600 }}>{cfg.btnStatusLabel}</div>
                    {cfg.btnCopyLabel && <div style={{ padding: '7px 0', textAlign: 'center', color: '#64b5ef', fontWeight: 600, borderTop: '1px solid rgba(255,255,255,0.08)' }}>{cfg.btnCopyLabel}</div>}
                  </div>
                </Bubble>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FlowDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const flowId  = params.flowId as string;
  const [flow,  setFlow]  = useState<any>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,   setTab]   = useState<TabId>('bots');

  useEffect(() => { load(); }, [flowId]);

  const load = async () => {
    try {
      const r = await flowAPI.get(flowId); setFlow(r.data);
      flowAPI.channels(flowId).then(c => setChannels(c.data?.channels ?? [])).catch(() => {});
    }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#505070' }}>Carregando...</div>;
  if (!flow)   return <div style={{ padding: '60px', textAlign: 'center', color: '#FF3B4E' }}>Fluxo não encontrado</div>;

  return (
    <div className="fade-up">
      <button onClick={() => router.push('/dashboard/flows')}
        style={{ background: 'none', border: 'none', color: '#505070', cursor: 'pointer', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '20px', padding: 0, fontFamily: 'inherit' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#BFFF00'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#505070'; }}>
        ← VOLTAR
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.6px', marginBottom: '4px' }}>{flow.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '20px',
            background: flow.isActive ? 'rgba(191,255,0,0.1)' : 'rgba(255,255,255,0.04)',
            color: flow.isActive ? '#BFFF00' : '#505070',
          }}>{flow.isActive ? 'ATIVO' : 'PAUSADO'}</span>
          <span style={{ fontSize: '12px', color: '#404060' }}>
            {flow.bots?.length || 0} bot(s) · {flow.plans?.length || 0} plano(s)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '2px', marginBottom: '28px', flexWrap: 'wrap',
        background: '#0A0A18', padding: '4px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: tab === t.id ? '#BFFF00' : 'transparent',
            color: tab === t.id ? '#06060E' : '#505070',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mensagens' && <MensagensTab flow={flow} flowId={flowId} onUpdate={load}/>}
      {tab === 'planos'    && <PlanosTab    flow={flow} flowId={flowId} channels={channels} onUpdate={load}/>}
      {tab === 'bots'      && <BotsTab      flow={flow} flowId={flowId} channels={channels} onUpdate={load}/>}
      {tab === 'pagamentos'&& <PaymentsTab  flow={flow} flowId={flowId} onUpdate={load}/>}
      {tab === 'upsell'    && <FunnelEditor flow={flow} flowId={flowId} channels={channels} kind="upsell"   onUpdate={load}/>}
      {tab === 'downsell'  && <FunnelEditor flow={flow} flowId={flowId} channels={channels} kind="downsell" onUpdate={load}/>}
      {tab === 'extras'    && <ExtrasTab    flow={flow} flowId={flowId} channels={channels} onUpdate={load}/>}
    </div>
  );
}
