'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (token) {
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    }
  }, [token, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Carregando...</p>
    </div>
  );
}
