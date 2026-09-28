'use client';

import { useEffect, useState } from 'react';
import '@/app/muqaranah.css';

interface Opinion {
  id: string;
  mazhab: string;
  status_hukum: string;
  dalil_text_arabic: string;
  wajah_dalalah: string;
  kitab_reference: string;
}

interface FiqhData {
  title: string;
  sub_topic: string;
  mazhab_opinions: Opinion[];
  tarjih_info: { tarjih_summary: string }[];
}

export default function MuqaranahPage() {
  const [data, setData] = useState<FiqhData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTurath, setShowTurath] = useState(false);

  useEffect(() => {
    fetch('/api/muqaranah?slug=menyentuh-wanita-ajnabi')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setErrorMsg(res.reason || res.error_details?.message || res.message || 'Gagal memuatkan data daripada Supabase.');
        }
      })
      .catch((err) => {
        setErrorMsg('Ralat rangkaian/server: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Memuatkan data Syariah...</div>;
  }

  if (errorMsg || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#DC2626' }}>
        <h3>⚠️ Ralat Memuatkan Data</h3>
        <p>{errorMsg || 'Data tidak ditemui.'}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header-panel">
        <div>
          <h1 style={{ color: 'var(--primary-emerald)' }}>{data.title}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sub-topik: {data.sub_topic}</p>
        </div>
        <button
          onClick={() => setShowTurath(!showTurath)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary-emerald)',
            background: showTurath ? 'var(--primary-emerald)' : 'transparent',
            color: showTurath ? '#fff' : 'var(--primary-emerald)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          📖 Mod Turath: {showTurath ? 'ON' : 'OFF'}
        </button>
      </header>

      <div className="mazhab-grid">
        {data.mazhab_opinions?.map((op) => (
          <article key={op.id} className="mazhab-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--primary-emerald)' }}>{op.mazhab}</span>
              <span className={`badge badge-${op.status_hukum.toLowerCase().replace(/\s+/g, '-')}`}>
                {op.status_hukum}
              </span>
            </div>

            <p className="text-arabic">{op.dalil_text_arabic}</p>

            {showTurath && <div className="turath-box">Rujukan: {op.kitab_reference}</div>}

            <div>
              <small style={{ fontWeight: 700, color: 'var(--text-muted)' }}>WAJAH DALALAH</small>
              <p style={{ fontSize: '0.9rem' }}>{op.wajah_dalalah}</p>
            </div>
          </article>
        ))}
      </div>

      {data.tarjih_info?.[0] && (
        <footer className="tarjih-banner">
          <h3 style={{ color: '#A7F3D0', marginBottom: '6px' }}>⚖️ Fatwa & Aplikasi Tempatan</h3>
          <p>{data.tarjih_info[0].tarjih_summary}</p>
        </footer>
      )}
    </div>
  );
}