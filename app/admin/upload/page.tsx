'use client';

import { useState } from 'react';

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [tahun, setTahun] = useState('');
  const [negeri, setNegeri] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logDetails, setLogDetails] = useState<any | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Sila pilih fail PDF.'); return; }

    setIsUploading(true); 
    setError(null); 
    setStatusMessage('Sedang memproses dokumen (PDF ke Vektor)... Ini mungkin mengambil masa beberapa minit.'); 
    setLogDetails(null);

    const formData = new FormData();
    formData.append('file', file);
    if (tahun) formData.append('tahun', tahun);
    if (negeri) formData.append('negeri', negeri);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Gagal muat naik.');

      // LOGIK BAHARU: Semak sama ada data benar-benar masuk ke Supabase
      if (data.savedChunks === 0) {
        setError(`Fail berjaya dibaca (${data.totalChunks} bahagian dipotong), TETAPI 0 bahagian berjaya disimpan ke Supabase! Sila pastikan skrip SQL jadual 'fatwas' telah dijalankan di Dashboard Supabase.`);
        setStatusMessage(null);
      } else {
        setStatusMessage(`🎉 Berjaya! Fail "${data.fileName}" telah disimpan (${data.savedChunks}/${data.totalChunks} bahagian).`);
      }

      setLogDetails(data);
      setFile(null); 
      setTahun(''); 
      setNegeri('');
      
      const inputEl = document.getElementById('pdf-input') as HTMLInputElement;
      if (inputEl) inputEl.value = '';
    } catch (err: any) {
      setError(err.message);
      setStatusMessage(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        <header style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <h1 style={{ margin: 0, color: '#065f46', fontSize: '1.8rem' }}>Panel Admin: Muat Naik PDF Fatwa</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Sistem RAG ini akan mengekstrak muka surat demi muka surat dan menyimpannya bersama metadata.
          </p>
        </header>

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ border: '2px dashed #cbd5e1', padding: '24px', borderRadius: '12px', textAlign: 'center', background: '#f8fafc' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📄</span>
            <input id="pdf-input" type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>Institusi / Negeri (Pilihan)</label>
              <input type="text" value={negeri} onChange={(e)=>setNegeri(e.target.value)} placeholder="Cth: JAKIM / Mufti Selangor" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>Tahun Fatwa (Pilihan)</label>
              <input type="number" value={tahun} onChange={(e)=>setTahun(e.target.value)} placeholder="Cth: 2024" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px' }} />
            </div>
          </div>

          <button type="submit" disabled={isUploading || !file} style={{ padding: '14px', background: isUploading ? '#94a3b8' : '#065f46', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: isUploading || !file ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
            {isUploading ? 'Sedang Memproses & Mengekstrak Muka Surat...' : 'Muat Naik & Jana Vektor'}
          </button>
        </form>

        {/* Paparan Mesej Status */}
        {statusMessage && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            {statusMessage}
          </div>
        )}

        {/* Paparan Ralat */}
        {error && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#fef2f2', color: '#991b1b', borderRadius: '10px', border: '1px solid #fecaca', lineHeight: '1.5' }}>
            <strong>⚠️ Ralat atau Amaran:</strong> <br/>
            {error}
          </div>
        )}
        
        {/* Laporan Ringkasan */}
        {logDetails && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#f1f5f9', borderRadius: '10px', fontSize: '0.85rem', color: '#334155' }}>
            <strong>Ringkasan Penyuapan (Supabase):</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Jumlah bahagian dipotong (chunks): <strong>{logDetails.totalChunks}</strong></li>
              <li>Jumlah berjaya disimpan ke DB: <strong>{logDetails.savedChunks}</strong></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}