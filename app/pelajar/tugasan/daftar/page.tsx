'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function DaftarBorangContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseParam = searchParams.get('course') || '';
  const classParam = searchParams.get('class') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([{ name: '', matrix_no: '' }]);

  const [showPopup, setShowPopup] = useState(false);
  const [existingGroup, setExistingGroup] = useState<{ groupName: string, members: any[] } | null>(null);

  useEffect(() => {
    if (courseParam && classParam) {
      checkExistingGroup(true); 
    }
  }, [courseParam, classParam]);

  const checkExistingGroup = async (isSilent = false) => {
    // 1. Dapatkan No Matrik pelajar melalui prompt (kecuali untuk auto-semak senyap)
    let searchMatrix = '';
    
    if (!isSilent) {
      const userInput = window.prompt("Sila masukkan No. Matrik anda untuk mencari kumpulan lama:");
      if (!userInput) return; // Batal jika pengguna tekan Cancel atau biarkan kosong
      searchMatrix = userInput.trim().toUpperCase();
    } else {
      return; // Batalkan auto-semak senyap kerana kita kini perlukan input No Matrik
    }

    setIsSearching(true);
    try {
      // 2. Cari semua tugasan/kumpulan di bawah kursus & kelas ini
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id,
          student_groups (
            id,
            group_name,
            group_members (student_name, matrix_no)
          )
        `)
        .eq('kod_kursus', courseParam)
        .eq('kumpulan_pelajar', classParam);

      if (error) throw error;

      // 3. Cari jika No Matrik tersebut wujud dalam mana-mana senarai ahli
      let foundGroup = null;
      if (assignments) {
        for (const assignment of assignments) {
          for (const group of assignment.student_groups) {
            // Padanan tepat menggunakan No. Matrik
            const isMember = group.group_members.some((m: any) => 
              m.matrix_no?.trim().toUpperCase() === searchMatrix
            );
            
            if (isMember) {
              foundGroup = {
                groupName: group.group_name,
                members: group.group_members.map((m: any) => ({ name: m.student_name, matrix_no: m.matrix_no }))
              };
              break;
            }
          }
          if (foundGroup) break;
        }
      }

      // 4. Paparkan keputusan
      if (foundGroup) {
        setExistingGroup(foundGroup);
        setShowPopup(true);
      } else {
        alert(`Tiada rekod kumpulan lama dijumpai untuk No. Matrik ${searchMatrix} dalam kelas ini.`);
      }

    } catch (err) {
      console.error("Ralat menyemak kumpulan:", err);
      alert("Ralat pangkalan data semasa mencari kumpulan lama.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKekalkanKumpulan = () => {
    if (existingGroup) {
      setGroupName(existingGroup.groupName);
      setMembers(existingGroup.members);
    }
    setShowPopup(false);
  };

  const handleAddMember = () => {
    if (members.length >= 10) return alert("Maksimum 10 ahli.");
    setMembers([...members, { name: '', matrix_no: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length === 1) return alert("Mesti ada 1 ahli.");
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleMemberChange = (index: number, field: 'name' | 'matrix_no', value: string) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return alert("Sila masukkan Nama Kumpulan.");
    if (members.some(m => !m.name.trim() || !m.matrix_no.trim())) return alert("Lengkapkan maklumat ahli.");

    setIsSubmitting(true);
    try {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('id, student_groups(group_name)')
        .eq('kod_kursus', courseParam)
        .eq('kumpulan_pelajar', classParam);

      if (error) throw error;

      const existingGroups = assignments?.flatMap(a => a.student_groups.map(g => g.group_name.toLowerCase())) || [];
      const isKeepingOwnGroup = existingGroup && existingGroup.groupName.toLowerCase() === groupName.trim().toLowerCase();
      
      if (!isKeepingOwnGroup && existingGroups.includes(groupName.trim().toLowerCase())) {
        alert(`⚠️ Nama kumpulan "${groupName}" telah digunakan oleh pelajar lain dalam kelas ${classParam}. Sila pilih nama lain.`);
        setIsSubmitting(false);
        return;
      }

      sessionStorage.setItem('tempGroupData', JSON.stringify({ groupName: groupName.trim(), members }));
      router.push(`/pelajar/tugasan/pilih?course=${courseParam}&class=${classParam}`);

    } catch (error: any) {
      alert("❌ Ralat semakan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '30px 16px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      {showPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', maxWidth: '450px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👋</div>
            <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.4rem' }}>Kumpulan Dikesan!</h2>
            <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              Kami mendapati anda sudah mempunyai kumpulan (<strong>{existingGroup?.groupName}</strong>) bagi kelas ini. Adakah anda mahu mengekalkan ahli yang sama atau cipta kumpulan baharu?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleKekalkanKumpulan} style={{ background: '#0ea5e9', color: '#fff', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                ✅ Kekalkan Kumpulan Ini
              </button>
              <button onClick={() => setShowPopup(false)} style={{ background: '#f1f5f9', color: '#475569', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                ➕ Cipta Kumpulan Baharu
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0ea5e9' }}>Langkah 2</div>
            <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Pendaftaran Kumpulan</h1>
          </div>
          <Link href="/pelajar/tugasan" style={{ padding: '8px 14px', background: '#e2e8f0', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>
            🔙 Batal
          </Link>
        </header>

        {/* BUTANG GERGASI CARI KUMPULAN LAMA - SEKARANG ADA DI ATAS SEKALI */}
        <div style={{ marginBottom: '24px' }}>
          <button 
            type="button"
            onClick={() => checkExistingGroup(false)} 
            disabled={isSearching}
            style={{ width: '100%', background: '#059669', color: '#fff', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: isSearching ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)' }}
          >
            {isSearching ? '⏳ Menyemak pangkalan data...' : '🔍 Klik Sini Untuk Cari & Kekalkan Kumpulan Lama'}
          </button>
        </div>

        <div style={{ background: '#ecfdf5', padding: '20px', borderRadius: '16px', border: '2px solid #34d399', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#065f46' }}>📌 Mendaftar untuk Kelas:</h3>
          <p style={{ margin: 0, fontWeight: 700, color: '#064e3b', fontSize: '1.1rem' }}>{courseParam} | Kumpulan: {classParam}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Nama Kumpulan Projek *</label>
            <input type="text" placeholder="Cth: Kumpulan 1" value={groupName} onChange={(e) => setGroupName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }} />
          </div>

          <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>👥 Senarai Ahli Kumpulan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {members.map((member, index) => (
              <div key={index} style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '20px', background: '#38bdf8', color: '#fff', padding: '2px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>{index === 0 ? 'Ahli 1 (Ketua)' : `Ahli ${index + 1}`}</div>
                {index > 0 && <button type="button" onClick={() => handleRemoveMember(index)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>✕ Buang</button>}
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Nama Penuh *</label>
                    <input type="text" value={member.name} onChange={(e) => handleMemberChange(index, 'name', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>No. Matrik *</label>
                    <input type="text" value={member.matrix_no} onChange={(e) => handleMemberChange(index, 'matrix_no', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={handleAddMember} style={{ background: '#f1f5f9', color: '#0369a1', border: '2px dashed #bae6fd', width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', marginBottom: '24px' }}>➕ Tambah Ahli</button>
          
          <button type="submit" disabled={isSubmitting} style={{ background: '#0ea5e9', color: '#fff', border: 'none', width: '100%', padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '1.1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(14, 165, 233, 0.25)' }}>
            {isSubmitting ? 'Menyemak...' : 'Seterusnya: Pilih Tajuk ➔'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PendaftaranPage() {
  return <Suspense fallback={<div>Memuatkan...</div>}><DaftarBorangContent /></Suspense>;
}