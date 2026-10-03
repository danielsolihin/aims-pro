'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PensyarahDashboard() {
  const router = useRouter();
  
  const [lecturerName, setLecturerName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [lastSignIn, setLastSignIn] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [studentGroups, setStudentGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // TAB NAVIGASI
  const [activeTab, setActiveTab] = useState<'tugasan' | 'projek'>('tugasan');
  
  // PENAPIS (FILTER) UNTUK TUGASAN SAYA
  const [filterFakultiTugasan, setFilterFakultiTugasan] = useState<string>('');
  const [filterClassTugasan, setFilterClassTugasan] = useState<string>('');
  const [filterTypeTugasan, setFilterTypeTugasan] = useState<string>('');

  // PENAPIS (FILTER) UNTUK PROJEK PELAJAR
  const [filterFakultiProjek, setFilterFakultiProjek] = useState<string>('');
  const [filterClassProjek, setFilterClassProjek] = useState<string>('');
  const [filterTypeProjek, setFilterTypeProjek] = useState<string>('');
  
  // MODAL AHLI PELAJAR & PROFILE
  const [selectedGroupModal, setSelectedGroupModal] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // FORM PROFILE STATE
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    fetchLecturerData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLecturerData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const secretUserId = session?.user?.id; 

      if (!secretUserId) {
        setIsLoading(false);
        router.push('/');
        return;
      }

      // 1. Ambil data profil rasmi dari jadual 'profiles'
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', secretUserId)
        .single();

      const lectName = profileData?.full_name || session?.user?.user_metadata?.full_name || '';
      const avatar = profileData?.avatar_url || session?.user?.user_metadata?.avatar_url || '';
      
      setLecturerName(lectName);
      setAvatarUrl(avatar);
      setEditName(lectName);
      setPreviewAvatar(avatar);
      
      if (session?.user?.last_sign_in_at) {
        const loginDate = new Date(session.user.last_sign_in_at);
        setLastSignIn(loginDate.toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' }));
      }

      // 2. Ambil tugasan KHAS untuk pensyarah yang log masuk sahaja
      let assignQuery = supabase.from('assignments').select('*');

      if (lectName && lectName.trim() !== '') {
        assignQuery = assignQuery.or(`lecturer_id.eq.${secretUserId},nama_pensyarah.eq.${lectName}`);
      } else {
        assignQuery = assignQuery.eq('lecturer_id', secretUserId);
      }

      const { data: assignData, error: assignErr } = await assignQuery.order('created_at', { ascending: false });
        
      if (assignErr) throw assignErr;
      const fetchedAssignments = assignData || [];
      setAssignments(fetchedAssignments);

      // Tautkan lecturer_id hanya jika nama pensyarah benar-benar padan
      const unlinkedAssignments = fetchedAssignments.filter(a => !a.lecturer_id && a.nama_pensyarah === lectName);
      if (unlinkedAssignments.length > 0) {
        for (const task of unlinkedAssignments) {
          await supabase.from('assignments').update({ lecturer_id: secretUserId }).eq('id', task.id);
        }
      }

      const assignmentIds = fetchedAssignments.map(a => a.id);
      if (assignmentIds.length > 0) {
        const { data: groupData, error: groupErr } = await supabase
          .from('student_groups')
          .select('*, assignments(*), group_members(*)')
          .in('assignment_id', assignmentIds)
          .order('created_at', { ascending: false });
        if (groupErr) throw groupErr;
        setStudentGroups(groupData || []);
      } else {
        setStudentGroups([]);
      }

    } catch (error: any) {
      console.error("Ralat Dashboard Pensyarah:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI LOG KELUAR (LOGOUT) ---
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Adakah anda pasti mahu log keluar dari sistem?");
    if (!confirmLogout) return;

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      router.push('/');
    } catch (error: any) {
      alert("❌ Ralat log keluar: " + error.message);
      setIsLoading(false);
    }
  };

  // --- KEMASKINI GAMBAR PROFIL ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200; 
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPreviewAvatar(compressedDataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const secretUserId = session?.user?.id;

      if (!secretUserId) throw new Error("Sesi tidak sah.");

      // 1. Update data auth Supabase User Metadata
      const updateData: any = {
        data: {
          full_name: editName,
          avatar_url: previewAvatar
        }
      };

      if (editPassword.trim().length > 0) {
        if (editPassword.length < 6) {
          alert("⚠️ Kata laluan sekurang-kurangnya 6 aksara.");
          setIsSavingProfile(false);
          return;
        }
        updateData.password = editPassword;
      }

      const { error: authError } = await supabase.auth.updateUser(updateData);
      if (authError) throw authError;

      // 2. Update secara manual ke jadual 'profiles'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: editName, 
          avatar_url: previewAvatar 
        })
        .eq('id', secretUserId);

      if (profileError) throw profileError;

      // 3. Segar Semula Sesi & Paparan
      await supabase.auth.refreshSession();
      setLecturerName(editName);
      setAvatarUrl(previewAvatar);
      
      alert("✅ Profil berjaya dikemas kini!");
      setShowProfileModal(false);
      setEditPassword('');
      fetchLecturerData();
    } catch (err: any) {
      alert("❌ Ralat mengemaskini profil: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- SENARAI KELAS RASMI & FAKULTI (FILTER OPTIONS) ---
  const uniqueFakultiTugasan = Array.from(new Set(assignments.map(a => a.program_pengajian).filter(Boolean))) as string[];
  const uniqueClassesTugasan = Array.from(new Set(assignments.map(a => a.kumpulan_pelajar).filter(Boolean))) as string[];
  
  const uniqueFakultiProjek = Array.from(new Set(studentGroups.map(g => g.assignments?.program_pengajian).filter(Boolean))) as string[];
  const uniqueClassesProjek = Array.from(new Set(studentGroups.map(g => g.assignments?.kumpulan_pelajar).filter(Boolean))) as string[];

  // --- LOGIK PENAPISAN (TUGASAN SAYA) ---
  const filteredAssignments = assignments.filter((a: any) => {
    const dbType = a.jenis_tugasan || 'KERTAS_KERJA';
    return (
      (!filterFakultiTugasan || a.program_pengajian === filterFakultiTugasan) &&
      (!filterClassTugasan || a.kumpulan_pelajar === filterClassTugasan) &&
      (!filterTypeTugasan || dbType === filterTypeTugasan)
    );
  });

  // --- LOGIK PENAPISAN (PROJEK PELAJAR) ---
  const filteredStudentGroups = studentGroups.filter((g: any) => {
    const dbType = g.assignments?.jenis_tugasan || 'KERTAS_KERJA';
    return (
      (!filterFakultiProjek || g.assignments?.program_pengajian === filterFakultiProjek) &&
      (!filterClassProjek || g.assignments?.kumpulan_pelajar === filterClassProjek) &&
      (!filterTypeProjek || dbType === filterTypeProjek)
    );
  });

  // --- FUNGSI PEMADAMAN KUMPULAN PELAJAR ---
  const handleDeleteStudentGroup = async (id: number, groupName: string) => {
    const confirmDelete = window.confirm(`⚠️ Adakah anda pasti mahu memadam "${groupName}"?\nPelajar perlu mendaftar semula jika dipadam.`);
    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      const { data: memberData } = await supabase.from('group_members').select('id').eq('group_id', id);
      const memberIds = memberData?.map(m => m.id) || [];

      if (memberIds.length > 0) await supabase.from('presentation_evaluations').delete().in('student_id', memberIds);
      await supabase.from('paper_submissions').delete().eq('group_id', id);
      await supabase.from('group_members').delete().eq('group_id', id);
      const { error } = await supabase.from('student_groups').delete().eq('id', id);
      
      if (error) throw error;
      alert(`✅ Pendaftaran kumpulan dipadam.`);
      fetchLecturerData();
    } catch (error: any) { alert(`❌ Ralat: ${error.message}`); } 
    finally { setIsLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f6f4', padding: '30px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .tab-btn:hover { transform: translateY(-2px); opacity: 0.95; }
        .tab-active { transform: scale(1.02); box-shadow: 0 4px 12px rgba(6, 95, 70, 0.15); }
        .group-link:hover { text-decoration: underline !important; color: #b45309 !important; }
        .action-btn { transition: all 0.2s ease; }
        .action-btn:hover { filter: brightness(1.08); transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); }
        .logout-btn:hover { background: #ef4444 !important; color: #fff !important; }
        .avatar-hover { transition: all 0.3s ease; }
        .avatar-hover:hover { transform: scale(1.05); border-color: #34d399 !important; }
        .card-shadow { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); }
        .profile-link:hover { color: #ffffff !important; opacity: 1 !important; }
      `}} />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <header style={{ 
          position: 'relative', overflow: 'hidden', marginBottom: '24px', 
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%)', 
          padding: '28px 32px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', 
          alignItems: 'center', boxShadow: '0 12px 30px rgba(6, 95, 70, 0.2)', flexWrap: 'wrap', gap: '24px' 
        }}>
          
          <svg style={{ position: 'absolute', right: 0, top: 0, bottom: 0, height: '100%', width: '45%', opacity: 0.06, pointerEvents: 'none' }} viewBox="0 0 300 120">
            <pattern id="islamic-fine-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 15 0 L 30 15 L 15 30 L 0 15 Z" fill="none" stroke="#ffffff" strokeWidth="1"/>
              <path d="M 0 0 L 30 30 M 30 0 L 0 30" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
              <circle cx="15" cy="15" r="6" fill="none" stroke="#ffffff" strokeWidth="0.8"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#islamic-fine-pattern)" />
          </svg>

          <div style={{ display: 'flex', alignItems: 'center', gap: '22px', zIndex: 1, flex: '1 1 auto', minWidth: 0 }}>
            <div 
              onClick={() => setShowProfileModal(true)}
              className="avatar-hover" 
              title="Klik untuk Tukar Gambar Profil"
              style={{ position: 'relative', width: '76px', height: '76px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 700, color: '#064e3b', border: '3px solid #a7f3d0', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            >
              {avatarUrl ? <img src={avatarUrl} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (lecturerName ? lecturerName.charAt(0).toUpperCase() : '👨‍🏫')}
            </div>

            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: '#fff', margin: 0, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                👋 Selamat Datang, {lecturerName || 'Pensyarah'}
              </h1>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#ecfdf5', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)' }}>
                  🕒 {currentTime.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.1)', color: '#a7f3d0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, backdropFilter: 'blur(4px)' }}>
                  Log masuk terakhir: {lastSignIn || 'Baru Sebentar Tadi'}
                </span>
              </div>

              <button 
                onClick={() => setShowProfileModal(true)} className="profile-link"
                style={{ background: 'none', border: 'none', padding: 0, marginTop: '8px', fontSize: '0.82rem', color: '#a7f3d0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', transition: 'all 0.2s ease', opacity: 0.9 }}
              >
                ⚙️ Kemaskini Profil & Kata Laluan
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', zIndex: 1, marginLeft: 'auto' }}>
            <Link href="/pensyarah/tugasan/cipta" className="action-btn" style={{ padding: '12px 20px', background: '#34d399', color: '#064e3b', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
              ➕ Cipta Tugasan
            </Link>
            
            <Link href="/pensyarah/urus-tugasan" className="action-btn" style={{ padding: '12px 20px', background: '#fef3c7', color: '#92400e', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
              ⚙ Urus Tugasan
            </Link>

            <Link href="/pensyarah/penilaian" className="action-btn" style={{ padding: '12px 20px', background: '#ffffff', color: '#065f46', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
              📝 Semak & Nilai Tugasan
            </Link>
            
            <div style={{ width: '2px', height: '30px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></div>
            
            <button 
              onClick={handleLogout} 
              className="action-btn logout-btn" 
              style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
            >
              🚪 Keluar
            </button>
          </div>
        </header>

        <div className="card-shadow" style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#ffffff', padding: '16px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', paddingRight: '16px', borderRight: '2px solid #f1f5f9', fontSize: '0.9rem' }}>Paparan Jadual:</span>
          
          <button onClick={() => setActiveTab('tugasan')} className={`tab-btn ${activeTab === 'tugasan' ? 'tab-active' : ''}`} style={{ cursor: 'pointer', border: activeTab === 'tugasan' ? '1px solid #059669' : '1px solid #a7f3d0', padding: '10px 22px', background: activeTab === 'tugasan' ? '#059669' : '#ecfdf5', color: activeTab === 'tugasan' ? '#ffffff' : '#047857', borderRadius: '10px', fontWeight: 700, transition: 'all 0.2s', fontSize: '0.9rem' }}>
            📚 Tugasan Saya ({assignments.length})
          </button>
          <button onClick={() => setActiveTab('projek')} className={`tab-btn ${activeTab === 'projek' ? 'tab-active' : ''}`} style={{ cursor: 'pointer', border: activeTab === 'projek' ? '1px solid #d97706' : '1px solid #fde68a', padding: '10px 22px', background: activeTab === 'projek' ? '#d97706' : '#fffbeb', color: activeTab === 'projek' ? '#ffffff' : '#b45309', borderRadius: '10px', fontWeight: 700, transition: 'all 0.2s', fontSize: '0.9rem' }}>
            👥 Projek Pelajar ({studentGroups.length})
          </button>
          <button onClick={fetchLecturerData} disabled={isLoading} style={{ marginLeft: 'auto', padding: '9px 18px', background: '#f8fafc', color: '#475569', borderRadius: '10px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            {isLoading ? '⏳ Menyegar...' : '🔄 Segar Semula'}
          </button>
        </div>

        {/* TAB 1: TUGASAN SAYA */}
        {activeTab === 'tugasan' && (
          <section className="card-shadow" style={{ background: '#ffffff', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease' }}>
            
            {/* SUSUNAN BARU: TAJUK DI ATAS, FILTER DI BAWAH KEKAL */}
            <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>📚 Senarai Tugasan (Dicipta Oleh Anda)</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Tugasan yang telah anda daftarkan untuk kelas anda.</p>
              </div>
              
              {/* PENAPIS TAB 1 (Kekal di baris baru) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', padding: '8px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>Fakulti:</label>
                  <select value={filterFakultiTugasan} onChange={(e) => setFilterFakultiTugasan(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981', fontSize: '0.85rem', fontWeight: 600, outline: 'none', background: '#fff', maxWidth: '250px', textOverflow: 'ellipsis' }}>
                    <option value="">-- Semua --</option>
                    {uniqueFakultiTugasan.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', padding: '8px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>Kelas:</label>
                  <select value={filterClassTugasan} onChange={(e) => setFilterClassTugasan(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981', fontSize: '0.85rem', fontWeight: 600, outline: 'none', background: '#fff' }}>
                    <option value="">-- Semua ({assignments.length}) --</option>
                    {uniqueClassesTugasan.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', padding: '8px 14px', borderRadius: '10px', border: '1px solid #d8b4fe' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8' }}>Jenis:</label>
                  <select value={filterTypeTugasan} onChange={(e) => setFilterTypeTugasan(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #a855f7', fontSize: '0.85rem', fontWeight: 600, outline: 'none', background: '#fff', color: '#6b21a8' }}>
                    <option value="">-- Semua --</option>
                    <option value="KERTAS_KERJA">Kertas Kerja</option>
                    <option value="KAJIAN_KES">Kajian Kes / Review</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', color: '#475569', width: '50px', fontWeight: 700 }}>No.</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>Kelas Rasmi</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>Maklumat Subjek</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>Tajuk Tugasan</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center', fontWeight: 700 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tiada tugasan ditemui untuk penapis yang dipilih.</td></tr>
                  ) : (
                    filteredAssignments.map((a, index) => {
                      const isKajianKes = a.jenis_tugasan === 'KAJIAN_KES';
                      return (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 14px', fontWeight: 600, color: '#64748b' }}>{index + 1}.</td>
                        <td style={{ padding: '16px 14px' }}><span style={{ background: '#ecfdf5', color: '#065f46', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>{a.kumpulan_pelajar}</span></td>
                        <td style={{ padding: '16px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.kod_kursus}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.program_pengajian}</div>
                        </td>
                        <td style={{ padding: '16px 14px', fontWeight: 500, color: '#334155' }}>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ background: isKajianKes ? '#f3e8ff' : '#e0f2fe', color: isKajianKes ? '#7e22ce' : '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {isKajianKes ? '[KAJIAN KES]' : '[KERTAS KERJA]'}
                            </span>
                          </div>
                          {a.title}
                        </td>
                        <td style={{ padding: '16px 14px', textAlign: 'center' }}><span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, background: '#d1fae5', padding: '4px 12px', borderRadius: '12px' }}>✅ Aktif</span></td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: PROJEK PELAJAR */}
        {activeTab === 'projek' && (
          <section className="card-shadow" style={{ background: '#ffffff', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease' }}>
            
            {/* SUSUNAN BARU: TAJUK DI ATAS, FILTER DI BAWAH KEKAL */}
            <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>👥 Pengurusan Pendaftaran Projek Pelajar</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Klik pada nama kumpulan untuk memapar senarai ahli pelajar.</p>
              </div>
              
              {/* PENAPIS TAB 2 (Kekal di baris baru) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', padding: '8px 14px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>Fakulti:</label>
                  <select value={filterFakultiProjek} onChange={(e) => setFilterFakultiProjek(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '0.85rem', fontWeight: 600, outline: 'none', background: '#fff', maxWidth: '250px', textOverflow: 'ellipsis' }}>
                    <option value="">-- Semua --</option>
                    {uniqueFakultiProjek.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', padding: '8px 14px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>Kelas:</label>
                  <select value={filterClassProjek} onChange={(e) => setFilterClassProjek(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '0.85rem', fontWeight: 600, outline: 'none', background: '#fff' }}>
                    <option value="">-- Semua ({studentGroups.length}) --</option>
                    {uniqueClassesProjek.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', padding: '8px 14px', borderRadius: '10px', border: '1px solid #d8b4fe' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8' }}>Jenis:</label>
                  <select value={filterTypeProjek} onChange={(e) => setFilterTypeProjek(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #a855f7', fontSize: '0.85rem', fontWeight: 600, outline: 'none', background: '#fff', color: '#6b21a8' }}>
                    <option value="">-- Semua --</option>
                    <option value="KERTAS_KERJA">Kertas Kerja</option>
                    <option value="KAJIAN_KES">Kajian Kes / Review</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#fffbeb', textAlign: 'left' }}>
                    <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e', width: '50px', fontWeight: 700 }}>No.</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e', fontWeight: 700 }}>Kumpulan Projek</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e', fontWeight: 700 }}>Kelas Rasmi</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e', fontWeight: 700 }}>Tugasan</th>
                    <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e', textAlign: 'center', fontWeight: 700 }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentGroups.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tiada kumpulan ditemui untuk penapis yang dipilih.</td></tr>
                  ) : (
                    filteredStudentGroups.map((g, index) => {
                      const memberCount = g.group_members?.length || 0;
                      const isKajianKes = g.assignments?.jenis_tugasan === 'KAJIAN_KES';
                      return (
                      <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 14px', fontWeight: 600, color: '#64748b' }}>{index + 1}.</td>
                        <td style={{ padding: '16px 14px' }}>
                          <button onClick={() => setSelectedGroupModal(g)} className="group-link" style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, color: '#d97706', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {g.group_name} 
                            <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', border: '1px solid #fde68a' }}>👥 {memberCount} Ahli</span>
                          </button>
                        </td>
                        <td style={{ padding: '16px 14px', fontWeight: 700, color: '#0f172a' }}>{g.assignments?.kumpulan_pelajar}</td>
                        <td style={{ padding: '16px 14px' }}>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ background: isKajianKes ? '#f3e8ff' : '#e0f2fe', color: isKajianKes ? '#7e22ce' : '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {isKajianKes ? '[KAJIAN KES]' : '[KERTAS KERJA]'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{g.assignments?.title}</div>
                        </td>
                        <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                          <button onClick={() => handleDeleteStudentGroup(g.id, g.group_name)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Padam</button>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* MODAL KEMASKINI PROFIL */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '20px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ecfdf5', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.25rem', fontWeight: 800 }}>⚙️ Kemaskini Profil</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700, color: '#64748b' }}>✕</button>
            </div>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', margin: '0 auto 12px auto', border: '3px solid #059669', overflow: 'hidden', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                  {previewAvatar ? <img src={previewAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (editName ? editName.charAt(0).toUpperCase() : '👨‍🏫')}
                </div>
                <label style={{ display: 'inline-block', padding: '8px 16px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  📷 Pilih Foto Baharu
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Nama Penuh Pensyarah</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Tukar Kata Laluan (Opsional)</label>
                <input type="password" placeholder="••••••••" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowProfileModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={isSavingProfile} style={{ flex: 2, padding: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: isSavingProfile ? 'not-allowed' : 'pointer' }}>
                  {isSavingProfile ? 'Saving...' : '💾 Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SENARAI AHLI PELAJAR */}
      {selectedGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '550px', borderRadius: '20px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '2px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #fef3c7', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#b45309', fontSize: '1.2rem', fontWeight: 800 }}>👥 {selectedGroupModal.group_name}</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Kelas Rasmi: <strong>{selectedGroupModal.assignments?.kumpulan_pelajar}</strong></p>
              </div>
              <button onClick={() => setSelectedGroupModal(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>✕ Tutup</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Tajuk Kajian:</div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedGroupModal.assignments?.title}</div>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>📋 Senarai Pelajar ({selectedGroupModal.group_members?.length || 0} orang):</div>
            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fafafa' }}>
              {(!selectedGroupModal.group_members || selectedGroupModal.group_members.length === 0) ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Tiada maklumat ahli ditemui.</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {selectedGroupModal.group_members.map((m: any, idx: number) => (
                    <li key={m.id || idx} style={{ padding: '12px 16px', borderBottom: idx === selectedGroupModal.group_members.length - 1 ? 'none' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{idx + 1}. {m.student_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No. Matrik: {m.matrix_no}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Ahli</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedGroupModal(null)} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Selesai</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}