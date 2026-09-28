'use client';

import { useState } from 'react';
import '@/app/muqaranah.css';

interface MazhabCard {
  nama: 'Syafi\'i' | 'Hanafi' | 'Maliki' | 'Hanbali';
  hukum: string;
  statusType: 'danger' | 'success' | 'warning'; // Untuk warna badge
  dalilArab: string;
  rujukan: string;
  wajahDalalah: string;
}

interface FiqhMuqaranahData {
  tajuk: string;
  bidang: string;
  subTopik: string;
  modTurath: boolean;
  senaraiMazhab: MazhabCard[];
  fatwaMalaysia: string;
}

// Data sampel mengikut paparan grafik
const sampleData: FiqhMuqaranahData = {
  tajuk: 'Menyentuh Wanita Ajnabi Tanpa Lapik',
  bidang: 'Fiqh Ibadah',
  subTopik: 'Bersuci (Thaharah)',
  modTurath: true,
  senaraiMazhab: [
    {
      nama: "Syafi'i",
      hukum: 'Membatalkan',
      statusType: 'danger',
      dalilArab: 'أَوْ لَٰمَسْتُمُ النِّسَاءَ',
      rujukan: "Kitab Al-Majmu' Sharh al-Muhadhdhab (Jilid 2, m/s 34).",
      wajahDalalah: 'Lafaz Lamasatum diambil mengikut makna hakiki iaitu sentuhan kulit secara terus antara lelaki dan wanita ajnabi tanpa lapik.'
    },
    {
      nama: 'Hanafi',
      hukum: 'Tidak Membatalkan',
      statusType: 'success',
      dalilArab: 'أَوْ لَٰمَسْتُمُ النِّسَاءَ',
      rujukan: 'Kitab Al-Mabsut oleh Imam Al-Sarakhsi.',
      wajahDalalah: 'Lafaz Lamasatum difahami secara kinayah (kiasan) yang membawa maksud bersetubuh, bukannya sentuhan kulit biasa.'
    },
    {
      nama: 'Maliki',
      hukum: 'Bersyarat',
      statusType: 'warning',
      dalilArab: 'أَوْ لَٰمَسْتُمُ النِّسَاءَ',
      rujukan: 'Kitab Bidayat al-Mujtahid oleh Ibn Rushd.',
      wajahDalalah: 'Membatalkan wuduk sekiranya sentuhan tersebut disertai dengan niat atau kehadiran kenikmatan (*lazzah/syahwat*).'
    },
    {
      nama: 'Hanbali',
      hukum: 'Bersyarat',
      statusType: 'warning',
      dalilArab: 'أَوْ لَٰمَسْتُمُ النِّسَاءَ',
      rujukan: 'Kitab Al-Mughni oleh Ibn Qudamah.',
      wajahDalalah: 'Membatalkan wuduk jika sentuhan itu dilakukan dengan syahwat. Menggabungkan zahir ayat dengan athar para Sahabat.'
    }
  ],
  fatwaMalaysia: 'Pandangan rasmi yang diguna pakai ialah **Mazhab Syafi\'i**. Walau bagaimanapun, perlepasan (*rukhsah*) untuk berpindah mazhab (Hanafi/Hanbali) dibenarkan ketika situasi kesesakan (*haraj*) seperti Tawaf di Makkah.'
};

export default function MuqaranahPage() {
  const [data] = useState<FiqhMuqaranahData>(sampleData);
  const [modTurath, setModTurath] = useState(data.modTurath);

  const getBadgeStyle = (type: MazhabCard['statusType']) => {
    switch (type) {
      case 'danger':
        return { background: '#ffebee', color: '#d32f2f' };
      case 'success':
        return { background: '#e8f5e9', color: '#2e7d32' };
      case 'warning':
        return { background: '#fff3e0', color: '#e65100' };
      default:
        return { background: '#eee', color: '#333' };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      
      {/* Panel Tajuk Utama */}
      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', color: '#065f46', fontSize: '1.6rem', fontWeight: 700 }}>
            {data.tajuk}
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Bidang: <strong>{data.bidang}</strong> • Sub-topik: <strong>{data.subTopik}</strong>
          </p>
        </div>

        <button 
          onClick={() => setModTurath(!modTurath)}
          style={{
            background: modTurath ? '#064e3b' : '#94a3b8',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: '0.2s'
          }}
        >
          📖 Mod Turath: {modTurath ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Grid 4 Mazhab */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        {data.senaraiMazhab.map((m, idx) => {
          const badgeStyle = getBadgeStyle(m.statusType);
          return (
            <div key={idx} style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              {/* Header Card (Nama Mazhab & Status) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{m.nama}</h2>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  ...badgeStyle
                }}>
                  {m.hukum}
                </span>
              </div>

              {/* Dalil Utama (Teks Arab) */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                  DALIL UTAMA
                </span>
                <div style={{
                  background: '#f8fafc',
                  padding: '14px',
                  borderRadius: '8px',
                  borderRight: '4px solid #065f46',
                  fontSize: '1.8rem',
                  textAlign: 'right',
                  fontFamily: 'Traditional Arabic, Amiri, serif',
                  marginTop: '6px',
                  color: '#1e293b'
                }}>
                  {m.dalilArab}
                </div>
              </div>

              {/* Box Rujukan Kitab */}
              <div style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#713f12',
                lineHeight: 1.4
              }}>
                Rujukan: {m.rujukan}
              </div>

              {/* Wajah Al-Dalalah */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  WAJAH AL-DALALAH
                </span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
                  {m.wajahDalalah}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner Fatwa & Aplikasi Tempatan */}
      <div style={{
        background: '#064e3b',
        color: '#fff',
        padding: '20px 24px',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(6, 78, 59, 0.15)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚖️ Fatwa & Aplikasi Tempatan (Malaysia)
        </h3>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, opacity: 0.9 }}>
          {data.fatwaMalaysia}
        </p>
      </div>

    </div>
  );
}