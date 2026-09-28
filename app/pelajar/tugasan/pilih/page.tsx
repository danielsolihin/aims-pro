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

  useEffect(() => {
    if (course && studentClass) {
      fetchTopics();
    }
  }, [course, studentClass]);

  const fetchTopics = async () => {
    setIsLoading(true);
    try {
      // 1. Tarik senarai tugasan berdasarkan kursus dan kelas
      const { data: assignData, error: assignErr } = await supabase
        .from('assignments')
        .select('*')
        .eq('kod_kursus', course)
        .eq('kumpulan_pelajar', studentClass);
        
      if (assignErr) throw assignErr;
      
      const fetchedAssignments = assignData || [];
      setAssignments(fetchedAssignments);

      // 2. Semak kumpulan mana yang telah 'lock' (daftar) tajuk ini
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

  // DIKEMASKINI: Mengarahkan ke Halaman Info / Maklumat Kursus terlebih dahulu
  const handleSelect = (assignmentId: string) => {
    router.push(`/pelajar/tugasan/info?assignment_id=${assignmentId}`);
    // Nota: Jika nama laluan fail halaman info anda adalah '/pelajar/tugasan/maklumat', 
    // sila tukar '/info' kepada '/maklumat' di atas.
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER & BUTANG KEMBALI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ color: '#0ea5e9', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>Langkah 3</div>
          <h1 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '2rem', fontWeight: 800 }}>Pilih Tajuk Kertas Kerja</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>
            Sila klik pada tajuk yang berstatus <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', margin: '0 4px' }}></span> Masih Kosong untuk dikunci (lock).
          </p>
        </div>
        
        {/* BUTANG KEMBALI KE HALAMAN UTAMA */}
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
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
        >
          🏠 Kembali ke Halaman Utama
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>⏳ Memuatkan senarai tajuk...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {assignments.length === 0 ? (
            <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b' }}>
              Tiada tajuk kertas kerja ditemui untuk subjek dan kelas ini. Sila hubungi pensyarah anda.
            </div>
          ) : (
            assignments.map((assignment) => {
              const isLocked = !!lockedStatus[assignment.id];
              const ownerGroup = lockedStatus[assignment.id];

              return (
                <div key={assignment.id} style={{ 
                  background: '#fff', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: isLocked ? '1px solid #e2e8f0' : '1px solid #cbd5e1', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '16px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)', 
                  transition: 'all 0.2s', 
                  ...(isLocked ? { opacity: 0.7, background: '#f8fafc' } : { borderColor: '#10b981' }) 
                }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: isLocked ? '#94a3b8' : '#0f766e', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.4 }}>
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
                      <button disabled style={{ background: '#f1f5f9', color: '#cbd5e1', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'not-allowed' }}>
                        Tidak Tersedia
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSelect(assignment.id)} 
                        style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.2)', transition: 'transform 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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