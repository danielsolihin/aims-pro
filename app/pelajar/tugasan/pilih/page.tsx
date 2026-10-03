'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function PilihTajukContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const course = searchParams.get('course');
  const studentClass = searchParams.get('class');

  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [lockedStatus, setLockedStatus] = useState<Record<string, string>>({});
  
  const [activeTab, setActiveTab] = useState<'KERTAS_KERJA' | 'KAJIAN_KES'>('KERTAS_KERJA');

  useEffect(() => {
    if (course && studentClass) {
      fetchTopics();
    }
  }, [course, studentClass]);

  const fetchTopics = async () => {
    setIsLoading(true);
    try {
      const { data: assignData, error: assignErr } = await supabase
        .from('assignments')
        .select('*')
        .eq('kod_kursus', course)
        .eq('kumpulan_pelajar', studentClass);
        
      if (assignErr) throw assignErr;
      
      const fetchedAssignments = assignData || [];
      setAssignments(fetchedAssignments);

      if (fetchedAssignments.length > 0) {
        const assignIds = fetchedAssignments.map(a => a.id);
        const { data: groupsData, error: groupsErr } = await supabase
          .from('student_groups')
          .select('assignment_id, group_name')
          .in('assignment_id', assignIds);
          
        if (groupsErr) throw groupsErr;

        const locked: Record<string, string> = {};
        groupsData?.forEach(g => {
          locked[g.assignment_id] = g.group_name;
        });
        setLockedStatus(locked);
      }
    } catch (err: any) {
      console.error(err);
      alert("Gagal memuat turun senarai tajuk. Sila pastikan sambungan internet anda stabil.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (assignmentId: string) => {
    router.push(`/pelajar/tugasan/info?assignment_id=${assignmentId}`);
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (activeTab === 'KERTAS_KERJA') {
      return assignment.jenis_tugasan === 'KERTAS_KERJA' || !assignment.jenis_tugasan;
    } else {
      return assignment.jenis_tugasan === 'KAJIAN_KES';
    }
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ color: '#0ea5e9', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>Langkah 3</div>
          <h1 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '2rem', fontWeight: 700 }}>Pilih Tajuk Tugasan</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>
            Sila pilih kategori dan klik pada tajuk yang berstatus <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', margin: '0 4px' }}></span> Masih Kosong.
          </p>
        </div>
        
        <button 
          onClick={() => router.push('/')} 
          style={{ 
            background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', color: '#334155', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }}
        >
          🏠 Kembali ke Halaman Utama
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('KERTAS_KERJA')}
          style={{
            padding: '12px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: activeTab === 'KERTAS_KERJA' ? '#0ea5e9' : '#f1f5f9',
            color: activeTab === 'KERTAS_KERJA' ? '#fff' : '#64748b',
          }}
        >
          📑 Kertas Kerja
        </button>
        <button 
          onClick={() => setActiveTab('KAJIAN_KES')}
          style={{
            padding: '12px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: activeTab === 'KAJIAN_KES' ? '#8b5cf6' : '#f1f5f9',
            color: activeTab === 'KAJIAN_KES' ? '#fff' : '#64748b',
          }}
        >
          🔍 Kajian Kes / Review
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>⏳ Memuatkan senarai tajuk...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAssignments.length === 0 ? (
            <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '1.05rem' }}>
              Tiada tajuk untuk kategori <strong>{activeTab === 'KERTAS_KERJA' ? 'Kertas Kerja' : 'Kajian Kes'}</strong> ditemui. Sila semak tab di sebelah atau hubungi pensyarah anda.
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const isLocked = !!lockedStatus[assignment.id];
              const ownerGroup = lockedStatus[assignment.id];
              
              const isKajianKes = assignment.jenis_tugasan === 'KAJIAN_KES';
              
              // LOGIK DIPERKETATKAN: Parse terus ke Number dan guna fallback nilai 0
              const markahBentang = Number(assignment.markah_pembentangan ?? assignment.presentation_weight ?? 0);
              const adaPembentangan = markahBentang > 0;
              
              let tagText = isKajianKes ? '[' : '[';
              tagText += adaPembentangan ? 'DENGAN PEMBENTANGAN]' : 'TANPA PEMBENTANGAN]';

              const tagBg = isKajianKes ? '#f3e8ff' : '#e0f2fe';
              const tagColor = isKajianKes ? '#7e22ce' : '#0369a1';
              const tagBorder = isKajianKes ? '#d8b4fe' : '#7dd3fc';

              return (
                <div key={assignment.id} style={{ 
                  background: '#fff', padding: '24px', borderRadius: '16px', 
                  border: isLocked ? '1px solid #e2e8f0' : '1px solid #cbd5e1', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s', 
                  ...(isLocked ? { opacity: 0.8, background: '#f8fafc' } : { borderColor: '#10b981' }) 
                }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ 
                        background: tagBg, color: tagColor, border: `1px solid ${tagBorder}`,
                        padding: '6px 12px', borderRadius: '8px', 
                        fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px' 
                      }}>
                        📌 {tagText}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 12px 0', color: isLocked ? '#64748b' : '#0f766e', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.4 }}>
                      {assignment.title}
                    </h3>
                    
                    {isLocked ? (
                      <span style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span> Telah Dimiliki oleh: {ownerGroup}
                      </span>
                    ) : (
                      <span style={{ background: '#d1fae5', color: '#047857', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> Masih Kosong
                      </span>
                    )}
                  </div>
                  
                  <div>
                    {isLocked ? (
                      <button disabled style={{ background: '#e2e8f0', color: '#94a3b8', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'not-allowed' }}>
                        Tidak Tersedia
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSelect(assignment.id)} 
                        style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
                      >
                        Pilih Tajuk Ini
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function PilihTajukPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 600 }}>Memuatkan komponen...</div>}>
        <PilihTajukContent />
      </Suspense>
    </div>
  );
}