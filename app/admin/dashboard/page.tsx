'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SuperadminDashboard() {
  const router = useRouter();
  
  // STATE DATA ASAS
  const [assignments, setAssignments] = useState<any[]>([]);
  const [studentGroups, setStudentGroups] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]); 
  const [submissionsCount, setSubmissionsCount] = useState(0); 

  // STATE KAWALAN UI
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tajuk' | 'kelas' | 'projek' | 'pensyarah'>('tajuk');
  const [filterClassTajuk, setFilterClassTajuk] = useState<string>('');
  const [filterClassProjek, setFilterClassProjek] = useState<string>('');
  const [selectedGroupModal, setSelectedGroupModal] = useState<any | null>(null);

  const [selectedAssignments, setSelectedAssignments] = useState<number[]>([]);
  const [selectedOfficialClasses, setSelectedOfficialClasses] = useState<string[]>([]); 
  const [selectedStudentGroups, setSelectedStudentGroups] = useState<number[]>([]);

  const [newLecturer, setNewLecturer] = useState({ name: '', email: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  // STATE PROFIL, MASA & GAMBAR
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchUserAndData();
    return () => clearInterval(timer);
  }, []);

  const fetchUserAndData = async () => {
    setIsLoading(true);
    try {
      // 1. DIKEMASKINI: DAPATKAN SESI PENGGUNA TERKINI DENGAN LEBIH TEPAT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        setCurrentUser(user);
        const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      } else {
        // Jika tiada sesi (akses terus ke URL), arahkan log masuk semula
        alert("Sesi log masuk anda tidak ditemui atau telah luput. Sila log masuk semula.");
        router.push('/login');
        return; // Berhentikan proses tarikan data
      }

      // 2. TARIK DATA DASHBOARD
      const { data: assignData } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
      setAssignments(assignData || []);

      const { data: groupData } = await supabase.from('student_groups').select('*, assignments(title, nama_pensyarah, kod_kursus, kumpulan_pelajar), group_members(*)').order('created_at', { ascending: false });
      setStudentGroups(groupData || []);
      
      const { data: lectData } = await supabase.from('profiles').select('*').eq('role', 'lecturer').order('created_at', { ascending: false });
      setLecturers(lectData || []);

      const { count: paperCount } = await supabase.from('paper_submissions').select('*', { count: 'exact', head: true });
      setSubmissionsCount(paperCount || 0);

    } catch (error: any) {
      console.error("Ralat memuat turun data:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!currentUser) {
        alert("⚠️ Sistem belum selesai memuatkan profil anda. Sila muat semula (refresh) halaman.");
        return;
      }

      if (!e.target.files || e.target.files.length === 0) return;
      
      setIsUploading(true);
      const file = e.target.files[0];
      alert(`⏳ Sedang memuat naik fail: ${file.name}...\nSila tekan OK dan tunggu sebentar.`);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
      
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      alert("✅ Tahniah! Gambar profil berjaya dikemaskini.");

    } catch (error: any) {
      alert("❌ Ralat muat naik gambar: " + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleLogout = async () => {
    const confirmLogOut = window.confirm("Adakah anda pasti mahu log keluar?");
    if (confirmLogOut) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };


  // --- LOGIK KELAS RASMI ---
  const uniqueOfficialClasses = Array.from(new Set(assignments.map(a => a.kumpulan_pelajar).filter(Boolean))) as string[];
  const getOfficialClasses = () => {
    const classMap = new Map();
    assignments.forEach(a => {
      const classKey = `${a.kumpulan_pelajar}_${a.nama_pensyarah}_${a.program_pengajian}`;
      if (!classMap.has(classKey)) {
        classMap.set(classKey, { class_name: a.kumpulan_pelajar, lecturer: a.nama_pensyarah, program: a.program_pengajian, assignment_ids: [a.id] });
      } else { classMap.get(classKey).assignment_ids.push(a.id); }
    });
    return Array.from(classMap.values()).map(cls => {
      const registeredCount = studentGroups.filter(sg => cls.assignment_ids.includes(sg.assignment_id)).length;
      return { ...cls, key: `${cls.class_name}_${cls.lecturer}`, registeredCount };
    });
  };
  const officialClassesList = getOfficialClasses();

  const filteredAssignments = filterClassTajuk ? assignments.filter(a => a.kumpulan_pelajar === filterClassTajuk) : assignments;
  const filteredStudentGroups = filterClassProjek ? studentGroups.filter(g => g.assignments?.kumpulan_pelajar === filterClassProjek) : studentGroups;

  // --- FUNGSI PADAM (DELETE) ---
  const handleSelectAllAssignments = (e: React.ChangeEvent<HTMLInputElement>) => { e.target.checked ? setSelectedAssignments(filteredAssignments.map(a => a.id)) : setSelectedAssignments([]); };
  const handleToggleAssignment = (id: number) => { setSelectedAssignments(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); };
  const handleBulkDeleteAssignments = async (idsToDel: number[] = selectedAssignments) => {
    if (idsToDel.length === 0) return;
    if (!window.confirm(`⚠️ AMARAN! Pasti mahu memadam ${idsToDel.length} rekod ini?`)) return;
    setIsLoading(true);
    try {
      const { data: groupData } = await supabase.from('student_groups').select('id').in('assignment_id', idsToDel);
      const groupIds = groupData?.map(g => g.id) || [];
      if (groupIds.length > 0) {
        const { data: memberData } = await supabase.from('group_members').select('id').in('group_id', groupIds);
        const memberIds = memberData?.map(m => m.id) || [];
        if (memberIds.length > 0) await supabase.from('presentation_evaluations').delete().in('student_id', memberIds);
        await supabase.from('paper_submissions').delete().in('group_id', groupIds);
        await supabase.from('group_members').delete().in('group_id', groupIds);
        await supabase.from('student_groups').delete().in('id', groupIds);
      }
      await supabase.from('assignments').delete().in('id', idsToDel);
      alert(`✅ Berjaya memadam rekod!`); fetchUserAndData();
    } catch (error: any) { alert(`❌ Ralat: ${error.message}`); } finally { setIsLoading(false); }
  };

  const handleSelectAllClasses = (e: React.ChangeEvent<HTMLInputElement>) => { e.target.checked ? setSelectedOfficialClasses(officialClassesList.map(c => c.key)) : setSelectedOfficialClasses([]); };
  const handleToggleClass = (key: string) => { setSelectedOfficialClasses(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]); };
  const handleBulkDeleteClasses = async () => {
    if (selectedOfficialClasses.length === 0) return;
    const assignmentsToDelete: number[] = [];
    officialClassesList.forEach(cls => { if (selectedOfficialClasses.includes(cls.key)) assignmentsToDelete.push(...cls.assignment_ids); });
    handleBulkDeleteAssignments(assignmentsToDelete);
  };

  const handleSelectAllStudentGroups = (e: React.ChangeEvent<HTMLInputElement>) => { e.target.checked ? setSelectedStudentGroups(filteredStudentGroups.map(g => g.id)) : setSelectedStudentGroups([]); };
  const handleToggleStudentGroup = (id: number) => { setSelectedStudentGroups(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); };
  const handleBulkDeleteStudentGroups = async () => {
    if (selectedStudentGroups.length === 0) return;
    if (!window.confirm(`⚠️ Pasti mahu memadam ${selectedStudentGroups.length} KUMPULAN PROJEK ini?`)) return;
    setIsLoading(true);
    try {
      const { data: memberData } = await supabase.from('group_members').select('id').in('group_id', selectedStudentGroups);
      const memberIds = memberData?.map(m => m.id) || [];
      if (memberIds.length > 0) await supabase.from('presentation_evaluations').delete().in('student_id', memberIds);
      await supabase.from('paper_submissions').delete().in('group_id', selectedStudentGroups);
      await supabase.from('group_members').delete().in('group_id', selectedStudentGroups);
      await supabase.from('student_groups').delete().in('id', selectedStudentGroups);
      alert(`✅ Kumpulan Projek Pelajar berjaya dipadam!`); fetchUserAndData();
    } catch (error: any) { alert(`❌ Ralat: ${error.message}`); } finally { setIsLoading(false); }
  };

  // --- FUNGSI PENSYARAH ---
  const handleRegisterLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLecturer.name || !newLecturer.email || !newLecturer.password) return;
    setIsRegistering(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: newLecturer.email, password: newLecturer.password });
      if (authError) throw authError;
      if (authData.user) {
        await supabase.from('profiles').insert([{ id: authData.user.id, full_name: newLecturer.name, role: 'lecturer' }]);
        alert(`✅ Akaun Pensyarah ${newLecturer.name} berjaya didaftarkan!`);
      }
      setNewLecturer({ name: '', email: '', password: '' }); fetchUserAndData(); 
    } catch (error: any) { alert(`❌ Ralat mendaftar: ${error.message}`); } finally { setIsRegistering(false); }
  };
  const handleDeleteLecturer = async (lecturerId: string, lecturerName: string) => {
    if (!window.confirm(`⚠️ Pasti mahu memadam akaun pensyarah ${lecturerName}?`)) return;
    try {
      await supabase.from('profiles').delete().eq('id', lecturerId);
      alert(`Berjaya memadam profil ${lecturerName}.`); fetchUserAndData();
    } catch (error: any) { alert(`❌ Ralat memadam: ${error.message}`); }
  };


  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .admin-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: #ef4444; }
        .row-selected { background-color: #fef2f2 !important; }
        .tab-btn:hover { transform: translateY(-2px); opacity: 0.9; }
        .tab-active { transform: scale(1.02); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .group-link:hover { text-decoration: underline !important; color: #b45309 !important; }
        .stat-card { transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-5px); }
        .profile-img-container:hover .upload-overlay { opacity: 1; }
      `}} />

      {/* ==============================================================
          HEADER SUPERADMIN
          ============================================================== */}
      <header style={{ marginBottom: '24px', background: '#0f172a', padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* BAHAGIAN KIRI: TAJUK & TAG MASA */}
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>🛡️ Dashboard Superadmin</h1>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>🕒 Waktu Semasa: <strong style={{color: '#e2e8f0'}}>
              {isMounted ? currentTime.toLocaleTimeString('ms-MY') : 'Memuatkan...'}
            </strong></span>
            <span style={{ color: '#475569' }}>|</span>
            <span>Terakhir Log Masuk: <strong style={{color: '#e2e8f0'}}>
              {isMounted 
                ? (currentUser?.last_sign_in_at 
                    ? new Date(currentUser.last_sign_in_at).toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' }) 
                    : 'Baru Sebentar Tadi') 
                : 'Memuatkan...'}
            </strong></span>
          </div>
        </div>

        {/* BAHAGIAN KANAN: PROFIL & BUTANG TINDAKAN */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div className="profile-img-container" style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #38bdf8', background: '#1e293b', flexShrink: 0 }}>
            {isUploading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#38bdf8', fontSize: '0.7rem', fontWeight: 800 }}>⏳...</div>
            ) : (
              <img src={avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.email?.substring(0, 2) || 'AD'}&background=0f172a&color=38bdf8`} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <label className="upload-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', textAlign: 'center', padding: '4px' }}>
              Tukar<br/>Gambar
              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={fetchUserAndData} disabled={isLoading} style={{ padding: '10px 14px', background: '#334155', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              🔄 Segar Semula
            </button>
            <Link href="/" style={{ padding: '10px 14px', background: '#fff', color: '#0f172a', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center' }}>
              🏠 Utama
            </Link>
            <button onClick={handleLogout} style={{ padding: '10px 14px', background: '#ef4444', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
              🚪 Log Keluar
            </button>
          </div>

        </div>
      </header>

      {/* KAD STATISTIK (OVERVIEW) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', padding: '24px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(4, 120, 87, 0.3)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, opacity: 0.9 }}>👨‍🏫 Jumlah Pensyarah</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 800 }}>{lecturers.length}</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '24px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(29, 78, 216, 0.3)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, opacity: 0.9 }}>📚 Tugasan Dicipta</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 800 }}>{assignments.length}</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', padding: '24px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(180, 83, 9, 0.3)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, opacity: 0.9 }}>👥 Kumpulan Projek</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 800 }}>{studentGroups.length}</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', padding: '24px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(109, 40, 217, 0.3)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, opacity: 0.9 }}>📤 Kertas Kerja Dihantar</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 800 }}>{submissionsCount}</p>
        </div>
      </div>

      {/* BAR NAVIGASI TABS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', background: '#fff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', paddingRight: '16px', borderRight: '2px solid #e2e8f0' }}>Paparan Jadual:</span>
        <button onClick={() => setActiveTab('tajuk')} className={`tab-btn ${activeTab === 'tajuk' ? 'tab-active' : ''}`} style={{ cursor: 'pointer', border: activeTab === 'tajuk' ? '1px solid #0284c7' : '1px solid #bae6fd', padding: '10px 20px', background: activeTab === 'tajuk' ? '#0284c7' : '#f0f9ff', color: activeTab === 'tajuk' ? '#fff' : '#0369a1', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s' }}>📚 Tajuk Tugasan</button>
        <button onClick={() => setActiveTab('kelas')} className={`tab-btn ${activeTab === 'kelas' ? 'tab-active' : ''}`} style={{ cursor: 'pointer', border: activeTab === 'kelas' ? '1px solid #c026d3' : '1px solid #f5d0fe', padding: '10px 20px', background: activeTab === 'kelas' ? '#c026d3' : '#fdf4ff', color: activeTab === 'kelas' ? '#fff' : '#a21caf', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s' }}>🏫 Kelas Rasmi</button>
        <button onClick={() => setActiveTab('projek')} className={`tab-btn ${activeTab === 'projek' ? 'tab-active' : ''}`} style={{ cursor: 'pointer', border: activeTab === 'projek' ? '1px solid #d97706' : '1px solid #fde68a', padding: '10px 20px', background: activeTab === 'projek' ? '#d97706' : '#fffbeb', color: activeTab === 'projek' ? '#fff' : '#b45309', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s' }}>👥 Projek Pelajar</button>
        <button onClick={() => setActiveTab('pensyarah')} className={`tab-btn ${activeTab === 'pensyarah' ? 'tab-active' : ''}`} style={{ cursor: 'pointer', border: activeTab === 'pensyarah' ? '1px solid #16a34a' : '1px solid #bbf7d0', padding: '10px 20px', background: activeTab === 'pensyarah' ? '#16a34a' : '#f0fdf4', color: activeTab === 'pensyarah' ? '#fff' : '#15803d', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s' }}>👨‍🏫 Akaun Pensyarah</button>
      </div>

      {/* JADUAL 1: TAJUK */}
      {activeTab === 'tajuk' && (
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>📚 Pengurusan Tajuk Tugasan</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Saring tajuk mengikut pendaftaran Kelas Rasmi untuk paparan lebih ringkas.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>🏫 Tapis Kelas:</label>
                <select value={filterClassTajuk} onChange={(e) => setFilterClassTajuk(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                  <option value="">-- Semua Kelas Rasmi ({assignments.length}) --</option>
                  {uniqueOfficialClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {selectedAssignments.length > 0 && (
                <button onClick={() => handleBulkDeleteAssignments()} disabled={isLoading} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>🗑️ Padam {selectedAssignments.length} Rekod</button>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '14px', borderBottom: '2px solid #cbd5e1', width: '40px', textAlign: 'center' }}><input type="checkbox" className="admin-checkbox" checked={selectedAssignments.length === filteredAssignments.length && filteredAssignments.length > 0} onChange={handleSelectAllAssignments} /></th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Kelas Rasmi</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Maklumat Subjek</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Tajuk Kertas Kerja</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>Pensyarah</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Tiada rekod.</td></tr> : filteredAssignments.map((a) => (
                  <tr key={a.id} className={selectedAssignments.includes(a.id) ? 'row-selected' : ''} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px', textAlign: 'center' }}><input type="checkbox" className="admin-checkbox" checked={selectedAssignments.includes(a.id)} onChange={() => handleToggleAssignment(a.id)} /></td>
                    <td style={{ padding: '14px' }}><span style={{ background: '#f5d0fe', color: '#86198f', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{a.kumpulan_pelajar}</span></td>
                    <td style={{ padding: '14px' }}><div style={{ fontWeight: 700, color: '#0284c7' }}>{a.kod_kursus}</div></td>
                    <td style={{ padding: '14px', fontWeight: 500 }}>{a.title}</td>
                    <td style={{ padding: '14px' }}><span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>{a.nama_pensyarah}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* JADUAL 2: KELAS RASMI */}
      {activeTab === 'kelas' && (
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>🏫 Pengurusan Kelas Rasmi</h2>
            {selectedOfficialClasses.length > 0 && <button onClick={handleBulkDeleteClasses} disabled={isLoading} style={{ background: '#d946ef', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>✕ Padam {selectedOfficialClasses.length} Kelas</button>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#fdf4ff', textAlign: 'left' }}>
                  <th style={{ padding: '14px', borderBottom: '2px solid #f5d0fe', width: '40px', textAlign: 'center' }}><input type="checkbox" className="admin-checkbox" checked={selectedOfficialClasses.length === officialClassesList.length && officialClassesList.length > 0} onChange={handleSelectAllClasses} /></th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #f5d0fe', color: '#86198f' }}>Kelas Rasmi</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #f5d0fe', color: '#86198f' }}>Fakulti / Program</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #f5d0fe', color: '#86198f' }}>Pensyarah Pemilik</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #f5d0fe', color: '#86198f', textAlign: 'center' }}>Sub-Kumpulan Terbentuk</th>
                </tr>
              </thead>
              <tbody>
                {officialClassesList.length === 0 ? <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Tiada rekod.</td></tr> : officialClassesList.map((cls) => (
                  <tr key={cls.key} className={selectedOfficialClasses.includes(cls.key) ? 'row-selected' : ''} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px', textAlign: 'center' }}><input type="checkbox" className="admin-checkbox" checked={selectedOfficialClasses.includes(cls.key)} onChange={() => handleToggleClass(cls.key)} /></td>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#c026d3', fontSize: '1rem' }}>{cls.class_name || '-'}</td>
                    <td style={{ padding: '14px', color: '#475569' }}>{cls.program || '-'}</td>
                    <td style={{ padding: '14px' }}>{cls.lecturer}</td>
                    <td style={{ padding: '14px', textAlign: 'center' }}>{cls.registeredCount > 0 ? <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{cls.registeredCount} Kumpulan Projek</span> : <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>0 Pendaftaran</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* JADUAL 3: KUMPULAN PROJEK */}
      {activeTab === 'projek' && (
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>👥 Pengurusan Projek Pelajar</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>🏫 Tapis Kelas:</label>
                <select value={filterClassProjek} onChange={(e) => setFilterClassProjek(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '0.85rem', fontWeight: 600 }}>
                  <option value="">-- Semua Kelas --</option>
                  {uniqueOfficialClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {selectedStudentGroups.length > 0 && <button onClick={handleBulkDeleteStudentGroups} disabled={isLoading} style={{ background: '#f97316', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>✕ Padam {selectedStudentGroups.length} Pendaftaran</button>}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#fffbeb', textAlign: 'left' }}>
                  <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', width: '40px', textAlign: 'center' }}><input type="checkbox" className="admin-checkbox" checked={selectedStudentGroups.length === filteredStudentGroups.length && filteredStudentGroups.length > 0} onChange={handleSelectAllStudentGroups} /></th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e' }}>Kumpulan Projek</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e' }}>Kelas Rasmi</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e' }}>Tajuk Kajian</th>
                  <th style={{ padding: '14px', borderBottom: '2px solid #fde68a', color: '#92400e' }}>Pensyarah</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentGroups.length === 0 ? <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Tiada rekod.</td></tr> : filteredStudentGroups.map((g) => (
                  <tr key={g.id} className={selectedStudentGroups.includes(g.id) ? 'row-selected' : ''} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px', textAlign: 'center' }}><input type="checkbox" className="admin-checkbox" checked={selectedStudentGroups.includes(g.id)} onChange={() => handleToggleStudentGroup(g.id)} /></td>
                    <td style={{ padding: '14px' }}>
                      <button onClick={() => setSelectedGroupModal(g)} className="group-link" style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, color: '#d97706', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {g.group_name} <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', border: '1px solid #fde68a' }}>👥 {g.group_members?.length || 0} Ahli</span>
                      </button>
                    </td>
                    <td style={{ padding: '14px', fontWeight: 600 }}>{g.assignments?.kumpulan_pelajar}</td>
                    <td style={{ padding: '14px' }}><div style={{ fontSize: '0.85rem', color: '#334155' }}>{g.assignments?.title}</div></td>
                    <td style={{ padding: '14px', color: '#475569' }}>{g.assignments?.nama_pensyarah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: AKAUN PENSYARAH */}
      {activeTab === 'pensyarah' && (
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>➕ Daftar Pensyarah</h2>
            <form onSubmit={handleRegisterLecturer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" required value={newLecturer.name} onChange={(e) => setNewLecturer({...newLecturer, name: e.target.value})} placeholder="Nama Penuh" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="email" required value={newLecturer.email} onChange={(e) => setNewLecturer({...newLecturer, email: e.target.value})} placeholder="Alamat E-mel" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="text" required minLength={6} value={newLecturer.password} onChange={(e) => setNewLecturer({...newLecturer, password: e.target.value})} placeholder="Kata Laluan" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button type="submit" disabled={isRegistering} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>{isRegistering ? 'Mendaftar...' : '✅ Simpan'}</button>
            </form>
          </div>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>👨‍🏫 Senarai Pensyarah</h2>
            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f0fdf4', textAlign: 'left' }}><th style={{ padding: '12px', borderBottom: '2px solid #bbf7d0', color: '#166534' }}>Nama Pensyarah</th><th style={{ padding: '12px', borderBottom: '2px solid #bbf7d0', color: '#166534' }}>ID Akaun (UUID)</th><th style={{ padding: '12px', borderBottom: '2px solid #bbf7d0', color: '#166534', textAlign: 'center' }}>Tindakan</th></tr>
                </thead>
                <tbody>
                  {lecturers.map(lect => (
                    <tr key={lect.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{lect.full_name}</td><td style={{ padding: '12px', color: '#64748b', fontSize: '0.8rem' }}>{lect.id}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}><button onClick={() => handleDeleteLecturer(lect.id, lect.full_name)} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Padam</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* MODAL AHLI PELAJAR */}
      {selectedGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '550px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '2px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #fef3c7', paddingBottom: '12px', marginBottom: '16px' }}>
              <div><h3 style={{ margin: 0, color: '#b45309', fontSize: '1.2rem', fontWeight: 800 }}>👥 {selectedGroupModal.group_name}</h3><p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Kelas Rasmi: <strong>{selectedGroupModal.assignments?.kumpulan_pelajar}</strong></p></div>
              <button onClick={() => setSelectedGroupModal(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>✕ Tutup</button>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fafafa' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {selectedGroupModal.group_members?.map((m: any, idx: number) => (
                  <li key={m.id || idx} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontWeight: 700 }}>{idx + 1}. {m.student_name}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>No. Matrik: {m.matrix_no}</div></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}