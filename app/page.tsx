'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
    }}>

      {/* TAJUK & HEADER UTAMA */}
      <div style={{ paddingTop: '60px', textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255,255,255,0.05)',
          padding: '8px 20px',
          borderRadius: '30px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>✨</span>
          <span style={{ fontWeight: 800, fontSize: '2.0rem', color: '#f59e0b', letterSpacing: '1px' }}>AIMS-Pro</span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 650, margin: '0 0 16px 0', color: '#f8fafc' }}>
          Automated & Intelligent Marking System
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: '700px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
          Platform Gerbang Akademik Bersepadu untuk Pendaftaran Tajuk, Muat Naik Tugasan Pintar, Penilaian AI Rubrik, dan Penjana Laporan Markah Penilaian Berterusan.
        </p>
      </div>

      {/* KAD PORTAL (PELAJAR & PENSYARAH / ADMIN) */}
      <div style={{
        maxWidth: '1000px',
        width: '100%',
        margin: '40px auto',
        padding: '0 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '30px'
      }}>

        {/* KAD 1: PORTAL PELAJAR */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ background: '#065f46', padding: '24px', textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎓</div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Portal Pelajar</h2>
              <span style={{ display: 'inline-block', marginTop: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                🔓 Akses Terbuka (Tanpa Log Masuk)
              </span>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* PAUTAN 1: DIKEMASKINI */}
              <Link href="/pelajar/tugasan" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', background: '#f8fafc' }}>
                  <span>🎓 1. Pendaftaran Tajuk Tugasan</span>
                  <span>→</span>
                </div>
              </Link>

              {/* PAUTAN 2: DIKEMASKINI */}
              <Link href="/pelajar/dashboard" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', background: '#f8fafc' }}>
                  <span>📤 2. Muat Naik Tugasan & Video</span>
                  <span>→</span>
                </div>
              </Link>

              {/* PAUTAN 3: DIKEMASKINI */}
              <Link href="/pelajar/semakan" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', background: '#f8fafc' }}>
                  <span>🔍 3. Semakan Markah Pelajar</span>
                  <span>→</span>
                </div>
              </Link>

            </div>
          </div>
        </div>

        {/* KAD 2: PORTAL PENSYARAH & ADMIN (BERPUSAT) */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ background: '#c2410c', padding: '24px', textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👨‍🏫</div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Portal Pengguna & Staf</h2>
              <span style={{ display: 'inline-block', marginTop: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                🔒 Akses Terkawal (Log Masuk)
              </span>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '12px', color: '#92400e', fontSize: '0.85rem', lineHeight: '1.5', textAlign: 'center', marginBottom: '20px' }}>
                Urus tugasan kelas, cipta rubrik AI, semak cadangan penilaian automatik, dan cetak laporan induk markah (A4 PDF) bagi simpanan fail rasmi MQA.
              </div>
            </div>
          </div>

          <div style={{ padding: '0 24px 24px 24px' }}>
            {/* BUTANG LOG MASUK BERPUSAT */}
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%',
                padding: '16px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)'
              }}>
                🔑 Log Masuk / Papan Pemuka
              </button>
            </Link>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        © 2026 Hak Cipta Terpelihara. Akademi Pengajian Islam Kontemporari (ACIS), UiTM.
      </footer>

    </div>
  );
}