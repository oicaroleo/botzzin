'use client';

import { useState } from 'react';
import { botsAPI } from '@/lib/api';

interface Props { onClose: () => void; onSuccess: () => void; }

export default function CreateBotModal({ onClose, onSuccess }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await botsAPI.create(token.trim()); onSuccess(); }
    catch (err: any) { setError(err.response?.data?.error || 'Erro ao criar bot'); }
    finally { setLoading(false); }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div className="card fade-up" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.4px' }}>Adicionar Bot</h2>
            <p style={{ fontSize: '12px', color: '#505070', marginTop: '3px' }}>
              Cole o token do @BotFather
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', color: '#505070', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EEEEF8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#505070'; }}>
            ×
          </button>
        </div>

        {error && <div className="alert-err" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>TOKEN DO BOT</label>
            <input className="inp mono" type="password" value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl..."
              required/>
            <div style={{ fontSize: '11px', color: '#404060', marginTop: '8px', lineHeight: 1.5 }}>
              Obtenha o token do <strong style={{ color: '#606080' }}>@BotFather</strong> no Telegram.
              O token é armazenado com segurança.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, padding: '11px' }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !token.trim()} style={{ flex: 1, padding: '11px' }}>
              {loading ? 'Criando...' : 'Criar Bot →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
