'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PelajarDashboard() {
  const router = useRouter();
  
  const [matrixNo, setMatrixNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matrixNo.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      // Tarik data kumpulan berserta tugasan dan submission (kertas kerja) yang terpaut
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id, 
          matrix_no,
          student_groups (
            id, 
            group_name,
            assignments (
              id, 
              title, 
              kod_kursus, 
              nama_pensyarah,
              tarikh_akhir
            ),
            paper_submissions (id)
          )
        `)
        .eq('matrix_no', matrixNo.trim());

      if (error) throw error;

      // Bersihkan dan format data untuk paparan
      const formattedData = data
        ?.filter(item => item.student_groups && item.student_groups.assignments)
        .map(item => {
          const group = item.student_groups;
          return {
            groupId: group.id,
            groupName: group.group_name,
            assignmentId: group.assignments.id,
            title: group.assignments.title,
            kodKursus: group.assignments.kod_kursus,
            namaPensyarah: group.assignments.nama_pensyarah,
            tarikhAkhir: group.assignments.tarikh_akhir, // Tarikh akhir dari pensyarah
            hasSubmitted: group.paper_submissions && group.paper_submissions.length > 0 // Semak jika ada submission
          };
        }) || [];

      setAssignments(formattedData);
    } catch (err: any) {
      console.error("Gagal carian:", err.message);
      alert("Ralat semasa menyemak pangkalan data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi semak adakah tarikh sudah melepasi hari ini
  const checkIsExpired = (dateString: string | null) => {
    if (!dateString) return false; // Jika belum ditetapkan, anggap belum tamat
    const deadline = new Date(dateString);
    const now = new Date();
    return now > deadline;
  };

  // Fungsi format tarikh ke gaya Malaysia (Cth: 12 Oktober 2026)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Belum Ditetapkan";
    return new Date(dateString).toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* BUTANG KEMBALI KE HALAMAN UTAMA */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button 
            onClick={() => router.push('/')} 
            style={{ 
              background: '#fff', 
              border: '1px solid #cbd5e1', 
              padding: '10px 20px', 
              borderRadius: '10px', 
              color: '#334155', 
              fontWeight: 600, 
              fontSize: '0.95rem', 
              cursor: 'pointer', 
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🏠 Kembali ke Halaman Utama
          </button>
        </div>

        {/* BANNER UTAMA */}
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', padding: '40px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 25px rgba(6, 78, 59, 0.15)', position: 'relative', overflow: 'hidden' }}>
          <span style={{ border: '1px solid rgba(255,255,255,0.3)', padding: '6px 16px', borderRadius: '20px', color: '#a7f3d0', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px' }}>GERBANG PELAJAR</span>
          <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 800, margin: '20px 0 10px 0' }}>Semakan Tugasan & Penilaian</h1>
          <p style={{ color: '#ecfdf5', fontSize: '1.05rem', margin: 0, opacity: 0.9 }}>Masukkan nombor matrik anda untuk menyemak senarai tugasan rasmi.</p>
        </div>

        {/* KOTAK CARIAN */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#0f766e', marginBottom: '10px' }}>No. Matrik Universiti:</label>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: '250px' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🎓</span>
              <input 
                type="text" 
                value={matrixNo}
                onChange={(e) => setMatrixNo(e.target.value)}
                placeholder="Contoh: 202512345"
                required
                style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.1rem', outline: 'none', background: '#f8fafc', color: '#0f172a', fontWeight: 500 }}
              />
            </div>
            <button type="submit" disabled={isLoading} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLoading ? '⏳ Menyemak...' : '🔍 Semak Tugasan'}
            </button>
          </form>
        </div>

        {/* HASIL CARIAN */}
        {hasSearched && !isLoading && (
          <div style={{ marginTop: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              📄 Rekod Tugasan Ditemui <span style={{ color: '#059669' }}>({assignments.length})</span>
            </h3>

            {assignments.length === 0 ? (
              <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                Tiada rekod pendaftaran tugasan ditemui untuk nombor matrik <strong>{matrixNo}</strong>.<br/> Sila pastikan anda telah mendaftar kumpulan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {assignments.map((item, idx) => {
                  const isExpired = checkIsExpired(item.tarikhAkhir);

                  return (
                  <div key={idx} style={{ background: '#fff', borderRadius: '20px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ background: '#059669', height: '4px', width: '100%' }}></div>
                    <div style={{ padding: '24px' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>{item.kodKursus}</span>
                      <h2 style={{ margin: '16px 0 12px 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800, lineHeight: 1.4 }}>{item.title}</h2>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#475569', fontSize: '0.95rem', flexWrap: 'wrap' }}>
                        <div>👥 Kumpulan: <strong style={{ color: '#0f172a' }}>{item.groupName}</strong></div>
                        <div style={{ width: '1px', height: '16px', background: '#cbd5e1' }}></div>
                        <div>👨‍🏫 Pensyarah: <strong style={{ color: '#0f172a' }}>{item.namaPensyarah}</strong></div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: '#fff0f2', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⏰</div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>TARIKH AKHIR SERAHAN</div>
                            <div style={{ fontSize: '1rem', color: isExpired ? '#ef4444' : '#b45309', fontWeight: 700 }}>{formatDate(item.tarikhAkhir)}</div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {item.hasSubmitted ? (
                            <>
                              {/* BUTANG 1: TELAH DIHANTAR (DISABLED) */}
                              <button disabled style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ✅ Tugasan Telah Dihantar
                              </button>
                              
                              {/* BUTANG 2: KEMASKINI ATAU TAMAT TEMPOH */}
                              <button 
                                disabled={isExpired}
                                onClick={() => router.push(`/pelajar/tugasan/muat-naik?group_id=${item.groupId}`)} 
                                style={{ 
                                  background: isExpired ? '#f1f5f9' : '#3b82f6', 
                                  color: isExpired ? '#94a3b8' : '#fff', 
                                  border: isExpired ? '1px solid #e2e8f0' : 'none', 
                                  padding: '12px 20px', 
                                  borderRadius: '10px', 
                                  fontWeight: 700, 
                                  fontSize: '0.95rem', 
                                  cursor: isExpired ? 'not-allowed' : 'pointer', 
                                  boxShadow: isExpired ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.25)' 
                                }}
                              >
                                {isExpired ? '⏳ Tempoh Penghantaran Tamat' : '✏️ Kemaskini Tugasan'}
                              </button>
                            </>
                          ) : (
                            /* BUTANG JIKA BELUM HANTAR */
                            <button 
                              disabled={isExpired}
                              onClick={() => router.push(`/pelajar/tugasan/muat-naik?group_id=${item.groupId}`)} 
                              style={{ 
                                background: isExpired ? '#f1f5f9' : '#059669', 
                                color: isExpired ? '#94a3b8' : '#fff', 
                                border: isExpired ? '1px solid #e2e8f0' : 'none', 
                                padding: '12px 24px', 
                                borderRadius: '10px', 
                                fontWeight: 700, 
                                fontSize: '0.95rem', 
                                cursor: isExpired ? 'not-allowed' : 'pointer', 
                                boxShadow: isExpired ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.2)' 
                              }}
                            >
                              {isExpired ? '⏳ Tempoh Penghantaran Tamat' : '📤 Buka Portal Muat Naik'}
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}