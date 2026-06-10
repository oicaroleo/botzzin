'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, password, name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '40px', height: '40px', background: 'var(--lime)', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: '800', color: '#08080F',
            }}>B</div>
            <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>BotZZIN</span>
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Crie sua conta e comece a vender</p>
        </div>

        <div className="card" style={{ padding: '36px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px', letterSpacing: '-0.5px', textAlign: 'center' }}>
            Criar conta
          </h1>

          {error && (
            <div style={{
              background: 'rgba(255,68,85,0.1)', border: '1px solid rgba(255,68,85,0.3)',
              borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
              color: 'var(--red)', fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.05em' }}>
                SEU NOME
              </label>
              <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="João Silva" required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.05em' }}>
                EMAIL
              </label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@email.com" required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.05em' }}>
                SENHA
              </label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" minLength={8} required />
            </div>

            <button className="btn-lime" type="submit" disabled={loading} style={{ marginTop: '8px', padding: '13px' }}>
              {loading ? 'Criando conta...' : 'Criar conta grátis →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-2)', marginTop: '24px', fontSize: '14px' }}>
            Já tem conta?{' '}
            <Link href="/auth/login" style={{ color: 'var(--lime)', fontWeight: '700', textDecoration: 'none' }}>
              Entrar
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', marginTop: '20px' }}>
          Ao criar uma conta você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
