'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  {
    href: '/dashboard',
    label: 'Visão Geral',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".7"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".7"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".7"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".7"/></svg>,
  },
  {
    href: '/dashboard/bots',
    label: 'Meus Bots',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="9" r="1" fill="currentColor"/><circle cx="9.5" cy="9" r="1" fill="currentColor"/><path d="M1 7.5h1M13 7.5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  },
  {
    href: '/dashboard/flows',
    label: 'Meus Fluxos',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="2.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="12.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="12.5" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 7.5h3l2-4h1.5M4 7.5h3l2 4h1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    href: '/dashboard/leads',
    label: 'Leads',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 13c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 2.2a2.5 2.5 0 010 4.6M11.5 13c0-1.6-.7-3-1.8-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".6"/></svg>,
  },
  {
    href: '/dashboard/gateways',
    label: 'Gateways PIX',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h13" stroke="currentColor" strokeWidth="1.3"/><rect x="3" y="8.5" width="3" height="1.5" rx=".5" fill="currentColor" opacity=".7"/></svg>,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';

  return (
    <aside style={{
      background: '#0C0C10',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: '#6667AB',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '16px', color: '#06060E',
            fontFamily: 'var(--font-syne, Syne), sans-serif',
            flexShrink: 0,
          }}>B</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.3px', lineHeight: 1.1 }}>BotZZIN</div>
            <div style={{ fontSize: '10px', color: '#404060', fontWeight: 600, letterSpacing: '0.08em' }}>PAINEL</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#303050', padding: '4px 10px 8px' }}>
          NAVEGAÇÃO
        </div>
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '9px 12px', borderRadius: '9px',
                background: active ? 'rgba(102,103,171,0.1)' : 'transparent',
                color: active ? '#6667AB' : '#606080',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                transition: 'all 0.15s',
                borderLeft: active ? '2px solid #6667AB' : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLDivElement).style.color = '#AAAACC';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  (e.currentTarget as HTMLDivElement).style.color = '#606080';
                }
              }}>
                <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
                {label}
                {active && (
                  <span style={{
                    marginLeft: 'auto', width: '4px', height: '4px',
                    borderRadius: '50%', background: '#6667AB',
                    boxShadow: '0 0 6px #6667AB',
                  }}/>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '10px 12px', borderRadius: '9px',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(102,103,171,0.2), rgba(146,147,201,0.1))',
            border: '1px solid rgba(102,103,171,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 800, color: '#6667AB', flexShrink: 0,
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'Usuário'}
            </div>
            <div style={{ fontSize: '10px', color: '#404060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button onClick={logout} style={{
          width: '100%', padding: '8px 12px', marginTop: '4px',
          background: 'transparent', border: 'none', borderRadius: '8px',
          color: '#303050', fontSize: '12px', cursor: 'pointer',
          textAlign: 'left', transition: 'color 0.15s', fontFamily: 'inherit',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B4E'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#303050'; }}>
          Sair da conta →
        </button>
      </div>
    </aside>
  );
}
