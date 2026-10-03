'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function InfoTugasanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('assignment_id');

  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      setAssignment(data);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat turun maklumat tugasan.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // FUNGSI PENDAFTARAN & KUNCI TAJUK PINTAR
  // ==========================================
  const handlePilihTajuk = async () => {
    const tempGroup = sessionStorage.getItem('tempGroupData');
    
    if (!tempGroup) {
      alert("Sila daftar ahli kumpulan terlebih dahulu di halaman utama carian.");
      router.push('/pelajar/tugasan');
      return;
    }

    const { groupName, members } = JSON.parse(tempGroup);
    setIsLocking(true);

    try {
      const { data: checkData, error: checkErr } = await supabase
        .from('student_groups')
        .select('id')
        .eq('assignment_id', assignmentId);

      if (checkErr) throw checkErr;
      
      if (checkData && checkData.length > 0) {
         alert("⚠️ Harap maaf, tajuk ini baru sahaja dikunci oleh kumpulan lain sebentar tadi! Sila kembali dan pilih tajuk lain.");
         setIsLocking(false);
         router.back();
         return;
      }

      const { data: groupData, error: groupErr } = await supabase
        .from('student_groups')
        .insert([{ 
          assignment_id: assignmentId, 
          group_name: groupName 
        }])
        .select()
        .single();

      if (groupErr) throw groupErr;
      const newGroupId = groupData.id;

      const membersData = members.map((m: any) => ({
        group_id: newGroupId,
        student_name: m.name.toUpperCase(),
        matrix_no: m.matrix_no.toUpperCase()
      }));

      const { error: membersErr } = await supabase
        .from('group_members')
        .insert(membersData);

      if (membersErr) throw membersErr;

      alert("🎉 Tahniah! Tajuk ini secara rasmi telah didaftarkan di bawah kumpulan anda.");
      sessionStorage.removeItem('tempGroupData'); 
      router.push('/pelajar/dashboard');

    } catch (error: any) {
      alert("❌ Ralat ketika mendaftar kumpulan: " + error.message);
      setIsLocking(false);
    }
  };

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e', fontWeight: 600, fontSize: '1.2rem' }}>⏳ Memuatkan Maklumat Kursus...</div>;
  }

  if (!assignment) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>Tugasan tidak dijumpai di dalam pangkalan data.</div>;
  }

  const displayDate = assignment.tarikh_akhir || assignment.due_date;
  
  // LOGIK DIPERKETATKAN: Guna ?? (Nullish Coalescing) supaya angka 0 dibaca sebagai 0, bukan di-skip.
  const presentationScore = Number(assignment.markah_pembentangan ?? assignment.presentation_weight ?? 0);
  const paperScore = Number(assignment.markah_kertas_kerja ?? assignment.paper_weight ?? 30);
  
  const hasVideo = presentationScore > 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER & BUTANG KEMBALI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>Langkah Pengesahan Akhir</div>
          <h1 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '2rem', fontWeight: 700 }}>Maklumat Tugasan</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Sila semak butiran tugasan di bawah sebelum meneruskan proses pendaftaran kumpulan.</p>
        </div>
        
        <button 
          onClick={() => router.back()} 
          style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', color: '#334155', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
        >
          ⬅️ Kembali Semula
        </button>
      </div>

      {/* KAD 1: MAKLUMAT KURSUS */}
      <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.1rem', borderBottom: '2px dashed #a7f3d0', paddingBottom: '12px' }}>📌 1. Maklumat Kelas & Pensyarah</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>KOD & NAMA KURSUS</span>
            <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 600, marginTop: '4px' }}>{assignment.kod_kursus}</div>
            <div style={{ fontSize: '0.95rem', color: '#334155', marginTop: '2px' }}>{assignment.nama_kursus || 'Tiada maklumat'}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>KUMPULAN PELAJAR</span>
            <div style={{ fontSize: '1.1rem', color: '#0f766e', fontWeight: 600, marginTop: '4px' }}>{assignment.kumpulan_pelajar}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>PENSYARAH PENILAI</span>
            <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 600, marginTop: '4px' }}>{assignment.nama_pensyarah || 'Pensyarah Kursus'}</div>
          </div>
        </div>
      </section>

      {/* KAD 2: SKOP & SINOPSIS */}
      <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.1rem', borderBottom: '2px dashed #a7f3d0', paddingBottom: '12px' }}>📝 2. Skop & Keperluan Tugasan</h3>
        
        <div style={{ marginBottom: '20px', background: '#ecfdf5', padding: '20px', borderRadius: '12px', border: '1px solid #10b981' }}>
          <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>TAJUK UTAMA TUGASAN</span>
          <div style={{ fontSize: '1.25rem', color: '#064e3b', fontWeight: 600, marginTop: '8px', lineHeight: 1.4 }}>
            {assignment.title}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Sinopsis / Pengenalan:</span>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
              {assignment.pengenalan || assignment.sinopsis || 'Tiada sinopsis disediakan oleh pensyarah.'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Skop Perbincangan & Objektif:</span>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
              {assignment.objektif || assignment.skop || assignment.penemuan_cadangan || 'Tiada skop perbincangan disediakan oleh pensyarah.'}
            </div>
          </div>
        </div>
      </section>

      {/* KAD 3: MARKAH & TARIKH AKHIR */}
      <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.1rem', borderBottom: '2px dashed #a7f3d0', paddingBottom: '12px' }}>⚖️ 3. Agihan Markah & Tarikh Akhir</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          
          <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>
              MARKAH {assignment.jenis_tugasan === 'KAJIAN_KES' ? 'KAJIAN KES' : 'KERTAS KERJA'}
            </span>
            <div style={{ fontSize: '1.5rem', color: '#14532d', fontWeight: 600, marginTop: '4px' }}>
              {paperScore}M
            </div>
          </div>

          {hasVideo && (
            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 700 }}>MARKAH PEMBENTANGAN</span>
              <div style={{ fontSize: '1.5rem', color: '#78350f', fontWeight: 600, marginTop: '4px' }}>
                {presentationScore}M
              </div>
            </div>
          )}

          <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 700 }}>TARIKH AKHIR SERAHAN</span>
            <div style={{ fontSize: '1.1rem', color: '#7f1d1d', fontWeight: 600, marginTop: '12px' }}>
              {displayDate ? new Date(displayDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum Ditetapkan'}
            </div>
          </div>
          
        </div>
      </section>

      {/* BUTANG PENDAFTARAN */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
        <button 
          onClick={handlePilihTajuk} 
          disabled={isLocking}
          style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1.1rem', cursor: isLocking ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.25)', transition: 'transform 0.1s' }}
          onMouseEnter={(e) => { if(!isLocking) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { if(!isLocking) e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {isLocking ? '⏳ Sedang Mendaftar Kumpulan Anda...' : '✅ Sahkan Maklumat & Teruskan Daftar Kumpulan'}
        </button>
      </div>

    </div>
  );
}

export default function InfoTugasanPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 600 }}>⏳ Memuatkan komponen...</div>}>
        <InfoTugasanContent />
      </Suspense>
    </div>
  );
}