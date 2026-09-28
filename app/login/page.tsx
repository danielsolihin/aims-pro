'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LogMasukUtama() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Log masuk menggunakan Auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error("E-mel atau kata laluan tidak sah.");

      // 2. Semak 'role' dari jadual profiles
      if (authData.user) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', authData.user.id)
          .single();

        if (profileErr) {
          throw new Error("Profil pengguna tidak dijumpai dalam pangkalan data. Sila hubungi Superadmin.");
        }

        const userRole = profile.role?.toLowerCase().trim();

        // 3. Hala tuju (Routing)
        if (userRole === 'superadmin' || userRole === 'admin') {
          router.push('/admin/dashboard');
        } else if (userRole === 'lecturer' || userRole === 'pensyarah') {
          router.push('/pensyarah/dashboard'); 
        } else {
          throw new Error("Peranan (Role) akaun anda tidak sah.");
        }
      }
    } catch (error: any) {
      setErrorMsg(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23065f46' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
    }}>
      
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
        <Link 
          href="/" 
          style={{ 
            padding: '10px 18px', 
            background: '#fff', 
            color: '#334155', 
            borderRadius: '10px', 
            textDecoration: 'none', 
            fontWeight: 700, 
            fontSize: '0.9rem', 
            border: '1px solid #cbd5e1', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🏠 Kembali ke Halaman Utama
        </Link>
      </div>

      <div style={{ padding: '20px', width: '100%', maxWidth: '440px' }}>
        
        <div style={{ 
          background: '#fff', 
          borderRadius: '20px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          borderTop: '6px solid #d97706'
        }}>
          
          <div style={{ padding: '36px 32px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '6px' }}>🕌</div>
              <h1 style={{ color: '#065f46', margin: '0 0 6px 0', fontSize: '1.75rem', fontWeight: 800 }}>
                Portal Log Masuk
              </h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.88rem', fontWeight: 500 }}>
                Sistem Pengurusan Tugasan & AI
              </p>
            </div>

            {errorMsg && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', border: '1px solid #fecaca', textAlign: 'center', fontWeight: 600 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  E-mel Pengguna
                </label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="pensyarah@universiti.edu.my" 
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', outline: 'none', background: '#f8fafc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Kata Laluan
                </label>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', outline: 'none', background: '#f8fafc' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                style={{ 
                  marginTop: '6px', 
                  width: '100%', 
                  padding: '14px', 
                  background: '#065f46', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontWeight: 800, 
                  fontSize: '0.98rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(6, 95, 70, 0.3)',
                  transition: 'background 0.2s'
                }}
              >
                {isLoading ? '⏳ Menyemak...' : '🔒 Log Masuk'}
              </button>

            </form>

            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 6px 0' }}>
                Belum mempunyai akaun?
              </p>
              <Link 
                href="/pensyarah/daftar" 
                style={{ color: '#d97706', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block' }}
              >
                Daftar Sebagai Pensyarah Baru →
              </Link>
            </div>

          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 500, margin: 0 }}>
            Hanya staf akademik berdaftar & pentadbir dibenarkan mengakses portal ini.
          </p>
        </div>

      </div>
    </div>
  );
}