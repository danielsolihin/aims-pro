'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UrusTugasanPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // State Penapis Hierarki (Filters)
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedGroupClass, setSelectedGroupClass] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(''); // Filter Jenis Tugasan

  // State Pilihan Pukal (Select All / Bulk Selection)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // State untuk Edit Modal
  const [editModal, setEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    id: null,
    title: '',
    kod_kursus: '',
    nama_kursus: '',
    program_pengajian: '',
    kumpulan_pelajar: '',
    jenis_tugasan: 'KERTAS_KERJA', // Bawa jenis tugasan untuk logic Edit
    markah_kertas_kerja: 30,
    markah_pembentangan: 30
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      // 1. Dapatkan Sesi Pensyarah yang sedang log masuk
      const { data: { session } } = await supabase.auth.getSession();
      const secretUserId = session?.user?.id;

      if (!secretUserId) {
        router.push('/login');
        return;
      }

      // 2. Dapatkan nama profil dari jadual 'profiles'
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', secretUserId)
        .single();

      const lectName = profile?.full_name || session?.user?.user_metadata?.full_name || '';

      // 3. Tapis tugasan KHAS untuk pensyarah ini sahaja
      let assignQuery = supabase.from('assignments').select('*');
      if (lectName && lectName.trim() !== '') {
        assignQuery = assignQuery.or(`lecturer_id.eq.${secretUserId},nama_pensyarah.eq.${lectName}`);
      } else {
        assignQuery = assignQuery.eq('lecturer_id', secretUserId);
      }

      const { data, error } = await assignQuery.order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
      setSelectedIds([]); 
    } catch (err: any) {
      console.error("Ralat menarik data tugasan:", err.message);
      alert("Gagal memuat turun data tugasan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIK PENAPISAN DINAMIK (HIRARKI)
  // ==========================================
  const programList = Array.from(new Set(assignments.map(a => a.program_pengajian).filter(Boolean))) as string[];

  const filteredForCourse = selectedProgram
    ? assignments.filter(a => a.program_pengajian === selectedProgram)
    : assignments;
  const courseList = Array.from(new Set(filteredForCourse.map(a => a.kod_kursus).filter(Boolean))) as string[];

  const filteredForGroup = assignments.filter(a =>
    (!selectedProgram || a.program_pengajian === selectedProgram) &&
    (!selectedCourse || a.kod_kursus === selectedCourse)
  );
  const groupClassList = Array.from(new Set(filteredForGroup.map(a => a.kumpulan_pelajar).filter(Boolean))) as string[];

  const handleProgramChange = (val: string) => {
    setSelectedProgram(val);
    setSelectedCourse('');
    setSelectedGroupClass('');
    setSelectedIds([]);
  };

  const handleCourseChange = (val: string) => {
    setSelectedCourse(val);
    setSelectedGroupClass('');
    setSelectedIds([]);
  };

  const handleGroupClassChange = (val: string) => {
    setSelectedGroupClass(val);
    setSelectedIds([]);
  };

  const handleTypeChange = (val: string) => {
    setSelectedType(val);
    setSelectedIds([]);
  };

  const resetFilters = () => {
    setSelectedProgram('');
    setSelectedCourse('');
    setSelectedGroupClass('');
    setSelectedType('');
    setSelectedIds([]);
  };

  const filteredAssignments = assignments.filter((a: any) => {
    const isProgramMatch = !selectedProgram || a.program_pengajian === selectedProgram;
    const isCourseMatch = !selectedCourse || a.kod_kursus === selectedCourse;
    const isGroupMatch = !selectedGroupClass || a.kumpulan_pelajar === selectedGroupClass;
    
    // Logik untuk jenis tugasan (Fallback jika undefined = KERTAS_KERJA)
    const dbType = a.jenis_tugasan || 'KERTAS_KERJA';
    const isTypeMatch = !selectedType || dbType === selectedType;

    return isProgramMatch && isCourseMatch && isGroupMatch && isTypeMatch;
  });

  // ==========================================
  // LOGIK PILIH SEMUA (SELECT ALL)
  // ==========================================
  const isAllSelected = filteredAssignments.length > 0 && filteredAssignments.every(a => selectedIds.includes(a.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredAssignments.map(a => a.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    } else {
      const filteredSet = new Set(filteredAssignments.map(a => a.id));
      setSelectedIds(selectedIds.filter(id => !filteredSet.has(id)));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // ==========================================
  // FUNGSI PADAM & KEMASKINI
  // ==========================================
  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = window.confirm(`AMARAN! Adakah anda pasti untuk MEMADAM tugasan:\n"${title}"?\n\nPerhatian: Tugasan tidak boleh dipadam jika sudah ada kumpulan pelajar yang berdaftar di bawahnya.`);
    if (confirmDelete) {
      try {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (error) throw error;
        alert("✅ Tugasan berjaya dipadam!");
        setAssignments(prev => prev.filter(a => a.id !== id));
        setSelectedIds(prev => prev.filter(i => i !== id));
      } catch (err: any) {
        alert(`❌ Gagal memadam tugasan: ${err.message}`);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(`AMARAN! Adakah anda pasti untuk MEMADAM ${selectedIds.length} tugasan yang dipilih?`);
    if (confirmDelete) {
      try {
        const { error } = await supabase.from('assignments').delete().in('id', selectedIds);
        if (error) throw error;
        alert(`✅ ${selectedIds.length} tugasan terpilih berjaya dipadam!`);
        setAssignments(prev => prev.filter(a => !selectedIds.includes(a.id)));
        setSelectedIds([]);
      } catch (err: any) {
        alert(`❌ Gagal memadam tugasan terpilih: ${err.message}`);
      }
    }
  };

  const openEditModal = (assignment: any) => {
    setEditForm({
      id: assignment.id,
      title: assignment.title || '',
      kod_kursus: assignment.kod_kursus || '',
      nama_kursus: assignment.nama_kursus || '',
      program_pengajian: assignment.program_pengajian || '',
      kumpulan_pelajar: assignment.kumpulan_pelajar || '',
      jenis_tugasan: assignment.jenis_tugasan || 'KERTAS_KERJA', // Simpan state jenis
      markah_kertas_kerja: assignment.markah_kertas_kerja ?? 30,
      markah_pembentangan: assignment.markah_pembentangan ?? 30
    });
    setEditModal(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fullPayload: any = {
        title: editForm.title,
        kod_kursus: editForm.kod_kursus,
        nama_kursus: editForm.nama_kursus,
        program_pengajian: editForm.program_pengajian,
        kumpulan_pelajar: editForm.kumpulan_pelajar,
        markah_kertas_kerja: Number(editForm.markah_kertas_kerja) || 30,
        // Jika kajian kes, markah pembentangan automatik 0
        markah_pembentangan: editForm.jenis_tugasan === 'KAJIAN_KES' ? 0 : (Number(editForm.markah_pembentangan) || 30)
      };

      const { error } = await supabase.from('assignments').update(fullPayload).eq('id', editForm.id);
      if (error) throw error;

      alert("✅ Tugasan berjaya dikemaskini!");
      setEditModal(false);
      fetchAssignments();
    } catch (err: any) {
      alert(`❌ Gagal mengemaskini tugasan:\n${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#064e3b', fontSize: '1.2rem', fontWeight: 600 }}>⏳ Memuatkan Rekod Tugasan...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', color: '#0f766e', fontWeight: 800 }}>
              ⚙️ Pusat Urusan Tugasan
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 400 }}>
              Lihat, kemaskini maklumat, tetapan markah atau padam tugasan yang telah dicipta.
            </p>
          </div>
          <button onClick={() => router.back()} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
            ← Kembali
          </button>
        </div>

        {/* KAD PENAPIS PAPARAN */}
        <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔍 Tapis Paparan Tugasan
            </h3>
            {(selectedProgram || selectedCourse || selectedGroupClass || selectedType) && (
              <button onClick={resetFilters} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                🔄 Set Semula Penapis
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>1. Fakulti / Program Pengajian</label>
              <select value={selectedProgram} onChange={(e) => handleProgramChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', outline: 'none', color: '#334155', fontWeight: 400 }}>
                <option value="">-- Semua Program ({programList.length}) --</option>
                {programList.map((prog, i) => <option key={i} value={prog}>{prog}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>2. Kod Kursus (Subjek)</label>
              <select value={selectedCourse} onChange={(e) => handleCourseChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #10b981', background: '#ecfdf5', fontSize: '0.9rem', outline: 'none', color: '#064e3b', fontWeight: 400 }}>
                <option value="">-- Semua Kod Kursus ({courseList.length}) --</option>
                {courseList.map((crs, i) => <option key={i} value={crs}>{crs}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>3. Kumpulan / Kelas Rasmi</label>
              <select value={selectedGroupClass} onChange={(e) => handleGroupClassChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #3b82f6', background: '#eff6ff', fontSize: '0.9rem', outline: 'none', color: '#1e40af', fontWeight: 400 }}>
                <option value="">-- Semua Kelas Rasmi ({groupClassList.length}) --</option>
                {groupClassList.map((grp, i) => <option key={i} value={grp}>{grp}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>4. Jenis Tugasan</label>
              <select value={selectedType} onChange={(e) => handleTypeChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #8b5cf6', background: '#f5f3ff', fontSize: '0.9rem', outline: 'none', color: '#5b21b6', fontWeight: 400 }}>
                <option value="">-- Semua Jenis --</option>
                <option value="KERTAS_KERJA">Kertas Kerja & Video</option>
                <option value="KAJIAN_KES">Kajian Kes / Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* JADUAL TUGASAN DENGAN SELECT ALL */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 400 }}>
              Menampilkan <strong>{filteredAssignments.length}</strong> daripada {assignments.length} tugasan
            </span>
            {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(220,38,38,0.25)' }}>
                🗑️ Padam Terpilih ({selectedIds.length})
              </button>
            )}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0f766e' }} title="Pilih Semua" />
                </th>
                <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', width: '50px', fontWeight: 700 }}>Bil</th>
                <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', fontWeight: 700 }}>Kod & Kursus</th>
                <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', fontWeight: 700 }}>Tajuk Tugasan</th>
                <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>Markah Max (Kertas/Bentang)</th>
                <th style={{ padding: '14px', borderBottom: '2px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Tiada tugasan ditemui untuk penapis yang dipilih.</td></tr>
              ) : (
                filteredAssignments.map((assignment, idx) => {
                  const isSelected = selectedIds.includes(assignment.id);
                  const dbType = assignment.jenis_tugasan || 'KERTAS_KERJA';
                  const isKajianKes = dbType === 'KAJIAN_KES';

                  return (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0fdfa' : 'transparent' }}>
                      <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(assignment.id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0f766e' }} />
                      </td>
                      <td style={{ padding: '16px', color: '#64748b', fontWeight: 400, verticalAlign: 'middle' }}>{idx + 1}.</td>
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{assignment.kod_kursus}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>{assignment.nama_kursus}</div>
                      </td>
                      <td style={{ padding: '16px', maxWidth: '350px', verticalAlign: 'middle' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ background: isKajianKes ? '#f3e8ff' : '#e0f2fe', color: isKajianKes ? '#7e22ce' : '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                            {isKajianKes ? '[KAJIAN KES]' : '[KERTAS KERJA]'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, color: '#0f766e' }}>{assignment.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400, marginTop: '4px' }}>
                          {assignment.program_pengajian} <span style={{ color: '#94a3b8' }}>({assignment.kumpulan_pelajar})</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📄 <strong style={{ fontWeight: 600 }}>{assignment.markah_kertas_kerja ?? 30}M</strong>
                          </span>
                          
                          {/* Sembunyikan ikon markah pembentangan jika ia adalah Kajian Kes */}
                          {!isKajianKes && (
                            <span style={{ background: '#fffbeb', color: '#b45309', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🗣️ <strong style={{ fontWeight: 600 }}>{assignment.markah_pembentangan ?? 30}M</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '90px', marginLeft: 'auto' }}>
                          <button onClick={() => openEditModal(assignment)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 0', borderRadius: '6px', cursor: 'pointer', color: '#2563eb', fontWeight: 500, fontSize: '0.85rem' }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDelete(assignment.id, assignment.title)} style={{ width: '100%', background: '#fee2e2', border: '1px solid #fca5a5', padding: '6px 0', borderRadius: '6px', cursor: 'pointer', color: '#dc2626', fontWeight: 500, fontSize: '0.85rem' }}>
                            🗑️ Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KEMASKINI (EDIT) */}
      {editModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '30px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              ✏️ Kemaskini Tugasan
            </h3>

            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Tajuk Tugasan</label>
                <input type="text" required value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 400 }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Kod Kursus</label>
                  <input type="text" required value={editForm.kod_kursus} onChange={(e) => setEditForm({...editForm, kod_kursus: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 400 }} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Nama Kursus</label>
                  <input type="text" required value={editForm.nama_kursus} onChange={(e) => setEditForm({...editForm, nama_kursus: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 400 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Program Pengajian</label>
                  <input type="text" required value={editForm.program_pengajian} onChange={(e) => setEditForm({...editForm, program_pengajian: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 400 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Kelas Rasmi</label>
                  <input type="text" required value={editForm.kumpulan_pelajar} onChange={(e) => setEditForm({...editForm, kumpulan_pelajar: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 400 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#047857', marginBottom: '6px' }}>Markah Max: Kertas Kerja</label>
                  <input type="number" required value={editForm.markah_kertas_kerja} onChange={(e) => setEditForm({...editForm, markah_kertas_kerja: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #10b981', background: '#ecfdf5', outline: 'none', fontWeight: 600, color: '#047857' }} />
                </div>
                
                {/* Sembunyikan input edit markah pembentangan jika ia adalah Kajian Kes */}
                {editForm.jenis_tugasan !== 'KAJIAN_KES' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#b45309', marginBottom: '6px' }}>Markah Max: Pembentangan</label>
                    <input type="number" required value={editForm.markah_pembentangan} onChange={(e) => setEditForm({...editForm, markah_pembentangan: Number(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#fffbeb', outline: 'none', fontWeight: 600, color: '#b45309' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, color: '#334155' }}>
                  Batal
                </button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, background: '#0f766e', color: '#fff', padding: '14px', border: 'none', borderRadius: '10px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  {isSaving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}