'use client';

import { useEffect, useState } from 'react';
import { botsAPI } from '@/lib/api';
import Link from 'next/link';
import CreateBotModal from '@/components/CreateBotModal';

interface Bot {
  id: string;
  telegramUsername: string;
  telegramBotId: string;
  status: string;
  _count?: { leads: number; plans: number };
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await botsAPI.list();
      setBots(res.data.bots || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '4px' }}>Meus Bots</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Gerencie todos os seus bots do Telegram</p>
        </div>
        <button className="btn-lime" onClick={() => setShowModal(true)} style={{ padding: '10px 20px' }}>
          + Novo Bot
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-2)' }}>Carregando...</div>
      ) : bots.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>⬡</div>
          <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>Nenhum bot cadastrado ainda.</p>
          <button className="btn-lime" onClick={() => setShowModal(true)}>Criar meu primeiro bot</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bots.map(bot => (
            <Link key={bot.id} href={`/dashboard/bots/${bot.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                padding: '18px 22px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-accent)';
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px', height: '42px', background: 'var(--lime-dim)',
                    border: '1px solid var(--border-accent)', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', color: 'var(--lime)', fontWeight: '700',
                  }}>
                    {(bot.telegramUsername || 'B').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>@{bot.telegramUsername}</div>
                    <div className="mono" style={{ fontSize: '12px', color: 'var(--text-3)' }}>{bot.telegramBotId}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: '600' }}>{bot._count?.leads || 0}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>leads</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: '600' }}>{bot._count?.plans || 0}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>planos</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={bot.status === 'active' ? 'dot-green' : 'dot-gray'}></span>
                    <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{bot.status === 'active' ? 'Ativo' : 'Pausado'}</span>
                  </div>
                  <span style={{ color: 'var(--text-3)', fontSize: '18px' }}>›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <CreateBotModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
