'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function MaklumatTugasanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('id'); // Guna ?id=XXX

  const [assign, setAssign] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    } else {
      setIsLoading(false);
    }
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      setAssign(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI KUNCI TAJUK & SIMPAN DATA KUMPULAN ---
  const handlePilihTajuk = async () => {
    const tempGroup = sessionStorage.getItem('tempGroupData');
    if (!tempGroup) {
      alert("Sila daftar kumpulan terlebih dahulu sebelum memilih tajuk.");
      router.push('/pelajar/tugasan');
      return;
    }

    const { groupName, members } = JSON.parse(tempGroup);
    setIsLocking(true);

    try {
      // LOGIK SEMAKAN PINTAR 
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

      // SIMPAN KUMPULAN 
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

      // SIMPAN AHLI KUMPULAN
      const membersData = members.map((m: any) => ({
        group_id: newGroupId,
        student_name: m.name.toUpperCase(),
        matrix_no: m.matrix_no.toUpperCase()
      }));

      const { error: membersErr } = await supabase
        .from('group_members')
        .insert(membersData);

      if (membersErr) throw membersErr;

      alert("🎉 Tahniah! Tajuk rasmi menjadi milik kumpulan anda.");
      sessionStorage.removeItem('tempGroupData'); 
      
      router.push(`/pelajar/dashboard?matrik=${members[0].matrix_no}`);

    } catch (error: any) {
      alert("❌ Ralat ketika mendaftar: " + error.message);
      setIsLocking(false);
    }
  };

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', color: '#64748b', fontWeight: 600 }}>⏳ Memuat turun info tugasan...</div>;
  
  if (!assign) return (
    <div style={{ textAlign: 'center', padding: '50px', minHeight: '100vh', background: '#f8fafc' }}>
      <h2>⚠️ Ralat URL / Maklumat Tidak Ditemui</h2>
      <p>Sila pastikan anda memilih tajuk dari halaman Senarai Tajuk yang betul.</p>
      <button onClick={() => router.push('/pelajar/tugasan')} style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '10px' }}>Kembali ke Carian Utama</button>
    </div>
  );

  const displayDate = assign.tarikh_akhir || assign.due_date;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '1rem' }}>
            🔙 Kembali ke Senarai
          </button>
        </header>

        <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '30px' }}>
          
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '32px', color: '#fff' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
              {assign.kod_kursus} - {assign.nama_kursus || 'Subjek'}
            </span>
            <h1 style={{ margin: '16px 0 12px 0', fontSize: '1.8rem', fontWeight: 800 }}>{assign.title}</h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>Oleh Pensyarah: {assign.nama_pensyarah || 'Pensyarah Kursus'}</p>
          </div>

          <div style={{ padding: '32px' }}>
            
            <div style={{ background: '#fffbeb', padding: '16px 20px', borderRadius: '16px', border: '1px solid #fde68a', marginBottom: '24px', display: 'inline-block' }}>
              <div style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 700, marginBottom: '4px' }}>⏰ Tarikh Akhir Serahan (Due Date)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e' }}>
                {displayDate ? new Date(displayDate).toLocaleDateString('ms-MY', { day:'numeric', month:'long', year:'numeric' }) : 'Belum Ditetapkan'}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.1rem', marginBottom: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>📄 Sinopsis & Skop Tugasan</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {assign.pengenalan || assign.sinopsis || assign.skop || 'Tiada sinopsis disertakan oleh pensyarah.'}
              </p>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button 
                onClick={handlePilihTajuk} 
                disabled={isLocking}
                style={{ display: 'inline-block', width: '100%', background: '#059669', color: '#fff', padding: '18px 40px', borderRadius: '16px', border: 'none', cursor: isLocking ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1.2rem', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.25)', transition: 'all 0.3s' }}
              >
                {isLocking ? '⏳ Mengunci Tajuk...' : '✅ Pilih Tajuk Ini & Daftar Kumpulan'}
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}

export default function MaklumatTugasanPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>Memuatkan...</div>}>
      <MaklumatTugasanContent />
    </Suspense>
  );
}