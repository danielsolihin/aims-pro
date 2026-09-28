'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PensyarahLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Senarai laluan awam (Public Routes) yang TIDAK perlukan login
  const publicRoutes = ['/pensyarah/login', '/pensyarah/daftar'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Jika tiada sesi login DAN bukan berada di halaman awam, tendang ke login
      if (!session && !isPublicRoute) {
        router.push('/pensyarah/login');
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();

    // Dengar jika pengguna log keluar (Sign Out)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/pensyarah/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router, isPublicRoute]);

  // Halang render kandungan rahsia selagi belum disahkan
  if (isAuthenticated === null && !isPublicRoute) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>
        🔐 Mengesahkan sekuriti portal...
      </div>
    );
  }

  return <>{children}</>;
}