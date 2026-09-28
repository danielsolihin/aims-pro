'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function PensyarahLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.session) {
        router.push('/pensyarah/dashboard');
      }
    } catch (err: any) {
      setErrorMsg('Log masuk gagal: Sila semak semula e-mel dan kata laluan anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f8fafc',
      /* Corak Vektor Geometri Islamik (Bintang 8 Bucu - Rub el Hizb) */
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23065f46' stroke-width='1.5' stroke-opacity='0.12'%3E%3Crect x='22' y='22' width='36' height='36' /%3E%3Crect x='22' y='22' width='36' height='36' transform='rotate(45 40 40)' /%3E%3Ccircle cx='40' cy='40' r='8' /%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '80px 80px',
      fontFamily: 'system-ui, sans-serif' 
    }}>
      
      {/* BUTANG KEMBALI KE UTAMA */}
      <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
        <Link href="/" style={{ padding: '10px 18px', background: '#fff', color: '#0f172a', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          ⬅ Kembali ke Utama
        </Link>
      </div>

      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        background: '#fff', 
        padding: '40px', 
        borderRadius: '16px', 
        boxShadow: '0 15px 35px rgba(6, 95, 70, 0.1)', 
        border: '1px solid #e2e8f0',
        borderTop: '6px solid #d97706', /* Aksen Warna Emas */
        position: 'relative',
        zIndex: 10
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🕌</div>
          <h1 style={{ color: '#065f46', fontSize: '1.8rem', margin: '0 0 8px 0', fontWeight: 800 }}>Portal Pensyarah</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Sistem Pengurusan Tugasan & AI</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px' }}>E-mel Pengguna</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
              placeholder="pensyarah@universiti.edu.my" 
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc', transition: 'border-color 0.2s' }} 
              onFocus={(e) => e.target.style.borderColor = '#065f46'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px' }}>Kata Laluan</label>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc', transition: 'border-color 0.2s' }} 
              onFocus={(e) => e.target.style.borderColor = '#065f46'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          {errorMsg && (
            <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca', textAlign: 'center' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button 
            type="submit" disabled={isLoading} 
            style={{ marginTop: '10px', padding: '16px', background: isLoading ? '#94a3b8' : '#065f46', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1.05rem', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => { if(!isLoading) e.currentTarget.style.background = '#047857' }}
            onMouseOut={(e) => { if(!isLoading) e.currentTarget.style.background = '#065f46' }}
          >
            {isLoading ? 'Mengesahkan...' : '🔒 Log Masuk'}
          </button>
        </form>

        {/* LINK PENDAFTARAN PENSYARAH */}
        <div style={{ marginTop: '24px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b' }}>Belum mempunyai akaun?</p>
          <Link href="/pensyarah/daftar" style={{ color: '#d97706', fontWeight: 800, textDecoration: 'none', fontSize: '0.95rem' }}>
            Daftar Sebagai Pensyarah Baru ➔
          </Link>
        </div>
      </div>
      
      <div style={{ marginTop: '24px', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, zIndex: 10, textAlign: 'center' }}>
        Hanya staf akademik berdaftar dibenarkan mengakses portal ini.
      </div>
    </div>
  );
}