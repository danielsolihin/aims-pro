'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function DaftarPensyarah() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const router = useRouter();

  // KOD RAHSIA FAKULTI
  const KOD_FAKULTI_SEBENAR = "ACIS-PENSYARAH-2026";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. SEMAKAN KESELAMATAN (Otomatiskan tukar huruf besar & buang jarak ruang)
    if (secretCode.trim().toUpperCase() !== KOD_FAKULTI_SEBENAR) {
      setErrorMsg('⛔ Kod Rahsia Fakulti tidak sah! Akses pendaftaran ditolak.');
      setIsLoading(false);
      return;
    }

    try {
      // 2. Daftar ke Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'lecturer'
          }
        }
      });

      if (authError) throw authError;

      // 3. SIMPAN PROFIL PENSYARAH KE JADUAL 'profiles'
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              role: 'lecturer'
            }
          ]);

        if (profileError) {
          console.error('Ralat simpan profil:', profileError.message);
          throw new Error('Akaun dicipta tetapi gagal menyimpan profil: ' + profileError.message);
        }
      }

      setSuccessMsg('Pendaftaran berjaya! Akaun anda telah disahkan.');
      
      // Bawa ke halaman login berpusat (/login) selepas 2 saat
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mendaftar. Sila cuba lagi.');
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
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23065f46' stroke-width='1.5' stroke-opacity='0.12'%3E%3Crect x='22' y='22' width='36' height='36' /%3E%3Crect x='22' y='22' width='36' height='36' transform='rotate(45 40 40)' /%3E%3Ccircle cx='40' cy='40' r='8' /%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '80px 80px',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px'
    }}>
      
      <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
        <Link href="/login" style={{ padding: '10px 18px', background: '#fff', color: '#0f172a', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          ⬅ Kembali ke Log Masuk
        </Link>
      </div>

      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        background: '#fff', 
        padding: '32px 40px', 
        borderRadius: '16px', 
        boxShadow: '0 15px 35px rgba(6, 95, 70, 0.1)', 
        border: '1px solid #e2e8f0',
        borderTop: '6px solid #065f46',
        position: 'relative',
        zIndex: 10
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '4px' }}>📝</div>
          <h1 style={{ color: '#065f46', fontSize: '1.6rem', margin: '0 0 8px 0', fontWeight: 800 }}>Daftar Akaun Pensyarah</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Sila masukkan maklumat rasmi anda.</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}>Nama Penuh (Beserta Gelaran)</label>
            <input 
              type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} 
              placeholder="Cth: Dr. Ahmad Bin Ali" 
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}>E-mel Rasmi</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
              placeholder="nama@universiti.edu.my" 
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}>Kata Laluan Baru</label>
            <input 
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} 
              placeholder="Minimum 6 aksara" 
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }} 
            />
          </div>

          {/* KOTAK KOD RAHSIA FAKULTI */}
          <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde047', marginTop: '8px' }}>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>
              🔐 Kod Pengesahan Fakulti
            </label>
            <input 
              type="text" required value={secretCode} onChange={(e) => setSecretCode(e.target.value.toUpperCase())} 
              placeholder="Masukkan kod rahsia pendaftaran..." 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #fbbf24', fontSize: '0.95rem', fontWeight: 700, color: '#92400e', textAlign: 'center', textTransform: 'uppercase' }} 
            />
            <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#b45309', textAlign: 'center' }}>
              *Dapatkan kod ini daripada pihak admin atau ketua jabatan anda.
            </p>
          </div>

          {errorMsg && <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca', textAlign: 'center' }}>{errorMsg}</div>}
          {successMsg && <div style={{ padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #a7f3d0', textAlign: 'center' }}>🎉 {successMsg}</div>}

          <button 
            type="submit" disabled={isLoading} 
            style={{ marginTop: '10px', padding: '16px', background: isLoading ? '#94a3b8' : '#065f46', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1.05rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? 'Mendaftarkan Akaun...' : 'Daftar Akaun Pensyarah'}
          </button>
        </form>

      </div>
    </div>
  );
}