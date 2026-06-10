'use client';

import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      minHeight: '100vh',
    }}>
      <Sidebar />
      <main style={{
        padding: '36px 40px',
        minWidth: 0,
        overflowX: 'hidden',
      }}>
        {children}
      </main>
    </div>
  );
}
