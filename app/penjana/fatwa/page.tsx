'use client';

import { useState, useEffect } from 'react';
import '@/app/muqaranah.css';

// --- KOMPONEN KAD MUQARANAH ---
function PaparanMuqaranah({ 
  data, 
  modCarian, 
  onBookmark, 
  isBookmarked,
  onPreviewPDF
}: { 
  data: any; 
  modCarian: string;
  onBookmark: (data: any) => void;
  isBookmarked: boolean;
  onPreviewPDF: (filename: string) => void;
}) {
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'danger': return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case 'success': return { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' };
      case 'warning': return { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' };
      default: return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const senaraiRujukan: string[] = data.sumberRujukan || data.sumber_rujukan || [];

  // Ekstrak nama fail .pdf daripada teks rujukan
  const ekstrakNamaFailPDF = (sumber: string) => {
    const match = sumber.match(/([a-zA-Z0-9_\-\s\.\(\)]+?\.pdf)/i);
    if (match) {
      return match[1].replace(/.*Dokumen:\s*/i, '').trim();
    }
    return null;
  };

  // FUNGSI CETAK KE PDF
  const cetakKePDF = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fatwa: ${data.tajuk}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.6; }
              .header { border-bottom: 2px solid #065f46; padding-bottom: 12px; margin-bottom: 24px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
              .card { border: 1px solid #cbd5e1; padding: 16px; border-radius: 10px; background: #fff; }
              .arab { font-size: 1.5rem; text-align: right; background: #f8fafc; padding: 12px; border-right: 4px solid #065f46; margin: 12px 0; border-radius: 6px; }
              .fatwa-msia { background: #ecfdf5; padding: 18px; border-radius: 12px; margin-top: 24px; border: 1px solid #a7f3d0;}
              .rujukan-pdf { background: #f8fafc; padding: 16px; border-radius: 10px; margin-top: 20px; border: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: #065f46; margin: 0 0 8px 0; font-size: 1.8rem;">${data.tajuk}</h1>
              <p style="margin:0; color:#64748b;"><strong>Bidang:</strong> ${data.bidang} | <strong>Sub-topik:</strong> ${data.subTopik}</p>
            </div>
            
            <h3 style="color:#0f172a; margin-bottom: 12px;">Analisis Perbandingan 4 Mazhab</h3>
            <div class="grid">
              ${data.senaraiMazhab ? data.senaraiMazhab.map((m: any) => `
                <div class="card">
                  <h4 style="margin:0 0 10px 0; color:#0f172a;">Mazhab ${m.nama} — <span style="color:#065f46;">${m.hukum}</span></h4>${m.dalilArab ? `<div class="arab">${m.dalilArab}</div>` : ''}
                  <p style="font-size: 0.9rem; color:#334155; margin-bottom:8px;"><strong>Hujah:</strong> ${m.wajahDalalah}</p>
                  <p style="font-size: 0.8rem; color: #64748b; margin:0;"><strong>Rujukan:</strong> ${m.rujukan}</p>
                </div>
              `).join('') : ''}
            </div>

            <div class="fatwa-msia">
              <h3 style="margin:0 0 8px 0; color:#065f46;">⚖️ Fatwa Malaysia & Antarabangsa</h3>
              <p style="margin:0; color:#1e293b;">${data.fatwaMalaysia}</p>
            </div>

            ${senaraiRujukan && senaraiRujukan.length > 0 ? `
              <div class="rujukan-pdf">
                <h3 style="margin:0 0 8px 0; color: #065f46;">📚 Dokumen & Sumber Rujukan</h3>
                <ul style="margin:0; padding-left:20px;">
                  ${senaraiRujukan.map((s: string) => `<li style="margin-bottom:4px;">${s}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div style={{ background: '#ffffff', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', width: '100%', color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      
      {/* Header Kad + Butang Tindakan */}
      <div style={{ marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0', color: '#065f46', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.3 }}>{data.tajuk}</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            Bidang: <strong style={{ color: '#334155' }}>{data.bidang}</strong> • Sub-topik: <strong style={{ color: '#334155' }}>{data.subTopik}</strong>
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button 
            onClick={() => onBookmark(data)} 
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              background: isBookmarked ? '#fef3c7' : '#fff', 
              color: isBookmarked ? '#b45309' : '#475569', 
              cursor: 'pointer', 
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: '0.2s'
            }}
          >
            {isBookmarked ? '⭐ Tersimpan' : '☆ Simpan'}
          </button>
          <button 
            onClick={cetakKePDF} 
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: 'none', 
              background: '#0f172a', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: '0.2s'
            }}
          >
            🖨️ Cetak PDF
          </button>
        </div>
      </div>

      {/* Grid Mazhab */}
      {data.senaraiMazhab && data.senaraiMazhab.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
          {data.senaraiMazhab.map((m: any, idx: number) => (
            <div key={idx} style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>{m.nama}</h3>
                  <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, ...getBadgeStyle(m.statusType) }}>
                    {m.hukum}
                  </span>
                </div>
                
                {m.dalilArab && (
                  <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '10px', borderRight: '4px solid #065f46', fontSize: '1.35rem', textAlign: 'right', fontFamily: 'Traditional Arabic, Amiri, Scheherazade, serif', marginBottom: '12px', color: '#064e3b', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    {m.dalilArab}
                  </div>
                )}

                <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.55, marginBottom: '12px' }}>
                  {m.wajahDalalah}
                </p>
              </div>

              {m.rujukan && (
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', color: '#713f12', marginTop: 'auto' }}>
                  <strong>Rujukan:</strong> {m.rujukan}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Kotak Fatwa Malaysia */}
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', color: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 4px 10px rgba(6, 78, 59, 0.15)' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {modCarian === 'strict_pdf' ? '📄 Huraian Dokumen PDF' : '⚖️ Fatwa Malaysia & Antarabangsa'}
        </h4>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, opacity: 0.95, fontWeight: 400 }}>{data.fatwaMalaysia}</p>
      </div>

      {/* DOKUMEN & PAUTAN RUJUKAN INTERNET */}
      {senaraiRujukan.length > 0 && (
        <div style={{ marginTop: '16px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px 16px', borderRadius: '12px', fontSize: '0.82rem', color: '#065f46' }}>
          <strong style={{ display: 'block', marginBottom: '10px', fontSize: '0.88rem', color: '#064e3b' }}>
            📚 Sumber Rujukan & Pautan Rasmi:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {senaraiRujukan.map((sumber, i) => {
              // Pengesahan jenis pautan (URL, Fail PDF, atau Teks Carian)
              const urlMatch = sumber.match(/(https?:\/\/[^\s]+)/i);
              const directUrl = urlMatch ? urlMatch[0] : null;
              const fileName = ekstrakNamaFailPDF(sumber);

              return (
                <li key={i} style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '6px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                  <span style={{ color: '#047857', flex: 1, wordBreak: 'break-word' }}>
                    {sumber.replace(/(https?:\/\/[^\s]+)/gi, '').trim() || sumber}
                  </span>
                  
                  {directUrl ? (
                    <a 
                      href={directUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '4px 10px', 
                        background: '#2563eb', 
                        color: '#fff', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      🌐 Buka Pautan Web ↗
                    </a>
                  ) : fileName ? (
                    <button 
                      onClick={() => onPreviewPDF(fileName)} 
                      style={{ 
                        padding: '4px 10px', 
                        background: '#047857', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      🔍 Buka Fail PDF
                    </button>
                  ) : (
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent(sumber + ' fatwa')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '4px 8px', 
                        background: '#f1f5f9', 
                        color: '#475569', 
                        borderRadius: '6px', 
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      🔍 Semak di Google ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- KOMPONEN UTAMA CHAT ---
export default function FatwaChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [teks, setTeks] = useState('');
  
  // DEFAULT MOD: Set kepada 'online' (Fatwa Global & Malaysia)
  const [modCarian, setModCarian] = useState<'online' | 'strict_pdf'>('online');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pdfPreviewFile, setPdfPreviewFile] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('myMuqaranBookmarks');
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);

  const toggleBookmark = (data: any) => {
    let updatedBookmarks = [...bookmarks];
    const index = updatedBookmarks.findIndex((b) => b.tajuk === data.tajuk);
    
    if (index !== -1) {
      updatedBookmarks.splice(index, 1);
    } else {
      updatedBookmarks.push(data);
    }
    
    setBookmarks(updatedBookmarks);
    localStorage.setItem('myMuqaranBookmarks', JSON.stringify(updatedBookmarks));
  };

  const hantarSoalan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teks.trim()) return;

    const soalanPengguna = teks;
    const sejarahPerbualan = [...messages, { role: 'user', content: soalanPengguna }];
    
    setMessages(sejarahPerbualan);
    setTeks(''); setIsLoading(true); setError(null); setShowBookmarks(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: sejarahPerbualan, modCarian }),
      });

      if (!response.ok) throw new Error(await response.text() || `Ralat pelayan: ${response.status}`);

      const data = await response.text();
      setMessages([...sejarahPerbualan, { role: 'assistant', content: data }]);
    } catch (err: any) {
      setError(err.message || 'Sambungan terputus.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content: string, role: string) => {
    if (role === 'user') return <div style={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>{content}</div>;

    try {
      const parsedData = JSON.parse(content);
      if (parsedData.tajuk) {
        const isBookmarked = bookmarks.some((b) => b.tajuk === parsedData.tajuk);
        return (
          <PaparanMuqaranah 
            data={parsedData} 
            modCarian={modCarian} 
            onBookmark={toggleBookmark} 
            isBookmarked={isBookmarked}
            onPreviewPDF={(file) => setPdfPreviewFile(file)}
          />
        );
      }
    } catch (e) {
      // Abaikan ralat JSON
    }
    return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
  };

  return (
    <div className="container" style={{ maxWidth: '1040px', margin: '0 auto', padding: '20px 16px', position: 'relative' }}>
      
      {/* HEADER & MENU TOGGLE */}
      <header className="header-panel" style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ color: '#065f46', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Enjin Carian Fatwa AI (RAG & Muqaranah)</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Sistem Perbandingan 4 Mazhab & Dokumen Fatwa Tempatan.</p>
          </div>

          {/* KEMASKINI 1: BUTANG TERSIMPAN DINITISKAN */}
          <button 
            onClick={() => setShowBookmarks(!showBookmarks)}
            style={{ 
              padding: '6px 14px', 
              background: '#f59e0b', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.25)',
              transition: '0.2s'
            }}
          >
            ⭐ {bookmarks.length} Tersimpan
          </button>
        </div>

        {/* MOD SELECTOR TABS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={() => setModCarian('online')}
            style={{ 
              padding: '8px 18px', 
              borderRadius: '10px', 
              border: '1px solid #065f46', 
              background: modCarian === 'online' ? '#065f46' : '#fff', 
              color: modCarian === 'online' ? '#fff' : '#065f46', 
              fontWeight: 700, 
              fontSize: '0.85rem', 
              cursor: 'pointer',
              transition: '0.2s',
              boxShadow: modCarian === 'online' ? '0 2px 6px rgba(6, 95, 70, 0.2)' : 'none'
            }}
          >
            🌐 Fatwa Global & Malaysia
          </button>

          <button 
            type="button" 
            onClick={() => setModCarian('strict_pdf')}
            style={{ 
              padding: '8px 18px', 
              borderRadius: '10px', 
              border: '1px solid #065f46', 
              background: modCarian === 'strict_pdf' ? '#065f46' : '#fff', 
              color: modCarian === 'strict_pdf' ? '#fff' : '#065f46', 
              fontWeight: 700, 
              fontSize: '0.85rem', 
              cursor: 'pointer',
              transition: '0.2s',
              boxShadow: modCarian === 'strict_pdf' ? '0 2px 6px rgba(6, 95, 70, 0.2)' : 'none'
            }}
          >
            📚 Turath PDF Upload
          </button>
        </div>
      </header>

      {/* RUANG PERBUALAN MAIN CHAT */}
      <div style={{ 
        background: '#f8fafc', 
        borderRadius: '18px', 
        padding: '24px', 
        minHeight: '55vh', 
        maxHeight: '65vh', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '18px', 
        border: '1px solid #e2e8f0', 
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' 
      }}>
        
        {showBookmarks ? (
          <div>
            <h2 style={{ color: '#065f46', borderBottom: '2px solid #a7f3d0', paddingBottom: '10px', margin: '0 0 16px 0', fontSize: '1.25rem' }}>
              ⭐ Senarai Fatwa Disimpan
            </h2>
            {bookmarks.length === 0 ? <p style={{ color: '#64748b' }}>Tiada fatwa yang disimpan setakat ini.</p> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {bookmarks.map((b, idx) => (
                <PaparanMuqaranah key={idx} data={b} modCarian={modCarian} onBookmark={toggleBookmark} isBookmarked={true} onPreviewPDF={(file) => setPdfPreviewFile(file)} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.length === 0 && !error ? (
              <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto', padding: '40px 20px' }}>
                <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '12px' }}>
                  {modCarian === 'online' ? '🌐' : '📚'}
                </span>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
                  {modCarian === 'online' 
                    ? 'Mod Fatwa Global & Malaysia Aktif: Taip soalan fiqh anda di bawah...' 
                    : 'Mod PDF Upload Aktif: Carian terhad kepada pangkalan data dokumen yang dimuat naik.'}
                </p>
              </div>
            ) : (
              messages.map((m, index) => (
                <div key={index} style={{ 
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', 
                  background: m.role === 'user' ? '#065f46' : 'transparent', 
                  color: m.role === 'user' ? '#fff' : '#1e293b', 
                  padding: m.role === 'user' ? '12px 20px' : '0', 
                  borderRadius: m.role === 'user' ? '18px 18px 2px 18px' : '0', 
                  maxWidth: m.role === 'user' ? '75%' : '100%', 
                  width: m.role === 'assistant' ? '100%' : 'auto', 
                  lineHeight: 1.6,
                  boxShadow: m.role === 'user' ? '0 2px 6px rgba(6, 95, 70, 0.15)' : 'none'
                }}>
                  {m.role === 'user' && <strong style={{ fontSize: '0.8rem', opacity: 0.85, display: 'block', marginBottom: '4px' }}>👤 Anda</strong>}
                  {renderMessageContent(m.content, m.role)}
                </div>
              ))
            )}
            {isLoading && <div style={{ alignSelf: 'flex-start', color: '#047857', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🔍 Sedang menganalisis hukum 4 Mazhab dan Fatwa...</div>}
            {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '14px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center', fontSize: '0.9rem' }}>⚠️ {error}</div>}
          </>
        )}
      </div>

      {/* KOTAK INPUT BORANG */}
      {!showBookmarks && (
        <form onSubmit={hantarSoalan} style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
          <input 
            value={teks} 
            onChange={(e) => setTeks(e.target.value)} 
            placeholder={modCarian === 'online' ? "Tanya isu Fiqh (Cth: Hukum jual emas online / Hukum Forex?)" : "Tanya isu khusus dalam dokumen PDF..."} 
            style={{ 
              flex: 1, 
              padding: '16px 20px', 
              borderRadius: '14px', 
              border: '1px solid #cbd5e1', 
              outline: 'none', 
              fontSize: '1rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              transition: '0.2s'
            }} 
          />
          <button 
            type="submit" 
            disabled={isLoading} 
            style={{ 
              padding: '0 28px', 
              borderRadius: '14px', 
              background: isLoading ? '#94a3b8' : '#065f46', 
              color: '#fff', 
              border: 'none', 
              fontWeight: 700, 
              fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(6, 95, 70, 0.2)',
              transition: '0.2s'
            }}
          >
            {isLoading ? 'Menjana...' : 'Tanya'}
          </button>
        </form>
      )}

      {/* MODAL PRATONTON FULL PDF */}
      {pdfPreviewFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.1rem' }}>📄 Pratonton Dokumen: {pdfPreviewFile}</h3>
            <button onClick={() => setPdfPreviewFile(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Tutup ✕</button>
          </div>
          <div style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             <iframe src={`/pdfs/${pdfPreviewFile}`} style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#f1f5f9' }} title="PDF Preview" />
          </div>
        </div>
      )}

    </div>
  );
}