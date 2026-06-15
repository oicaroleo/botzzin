import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

// Tipografia estilo Apple: SF Pro / system stack (definida em globals.css).

export const metadata: Metadata = {
  title: 'BotZZIN — Automação de Vendas',
  description: 'Gerencie seus bots de vendas no Telegram',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
