'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(email, password); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: '#07070E',
      fontFamily: 'var(--font-syne, Syne), sans-serif',
    }}>
      {/* ── Left: form panel ────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: '480px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 52px',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '34px', height: '34px', background: '#BFFF00', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '16px', color: '#06060E',
            }}>B</div>
            <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.4px' }}>BotZZIN</span>
          </div>
          <div style={{ fontSize: '11px', color: '#404060', fontWeight: 600, letterSpacing: '0.1em' }}>
            AUTOMAÇÃO · TELEGRAM · PIX
          </div>
        </div>

        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '6px' }}>
          Entrar na plataforma
        </h1>
        <p style={{ color: '#606080', fontSize: '14px', marginBottom: '36px' }}>
          Acesse seu painel de controle
        </p>

        {error && (
          <div className="alert-err" style={{ marginBottom: '20px' }}>{error}</div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>EMAIL</label>
            <input className="inp" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required/>
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>SENHA</label>
            <input className="inp" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ marginTop: '8px', padding: '13px', fontSize: '14px', width: '100%' }}>
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#606080', marginTop: '28px', fontSize: '14px' }}>
          Não tem conta?{' '}
          <Link href="/auth/signup" style={{ color: '#BFFF00', fontWeight: 700, textDecoration: 'none' }}>
            Criar conta grátis
          </Link>
        </p>
      </div>

      {/* ── Right: decorative panel ──────────────────────────── */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 80% at 60% 50%, rgba(191,255,0,0.04) 0%, transparent 70%)',
      }}>
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(191,255,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(191,255,0,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}/>

        {/* Centered content */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '60px',
        }}>
          <div style={{ width: '100%', maxWidth: '340px' }}>
            {/* Stats cards floating */}
            {[
              { label: 'Receita este mês', val: 'R$ 24.680', col: '#BFFF00', delay: '0s' },
              { label: 'Leads convertidos', val: '1.247', col: '#00E5FF', delay: '0.1s' },
              { label: 'Taxa de conversão', val: '18,3%', col: '#BFFF00', delay: '0.2s' },
            ].map(({ label, val, col, delay }, i) => (
              <div key={i} style={{
                background: 'rgba(13,13,28,0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '18px 22px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '10px',
                transform: `translateX(${i === 1 ? 20 : 0}px)`,
                animation: `fadeUp 0.5s ${delay} both`,
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#505070', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '6px' }}>
                    {label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '22px', fontWeight: 600, color: col }}>
                    {val}
                  </div>
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col, boxShadow: `0 0 10px ${col}` }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
