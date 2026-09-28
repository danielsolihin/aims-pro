'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PortalPenilaianPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [studentGroups, setStudentGroups] = useState<any[]>([]);

  // State Hierarki Filter
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedGroupClass, setSelectedGroupClass] = useState<string>('');

  // Senarai unik untuk Dropdown Filter
  const [programList, setProgramList] = useState<string[]>([]);
  const [courseList, setCourseList] = useState<string[]>([]);
  const [groupClassList, setGroupClassList] = useState<string[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- FUNGSI SIMPAN PILIHAN KE MEMORI CACHE ---
  const saveFilters = (prog: string, crs: string, grp: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aims_sel_program', prog || '');
      sessionStorage.setItem('aims_sel_course', crs || '');
      sessionStorage.setItem('aims_sel_groupclass', grp || '');
      localStorage.setItem('aims_sel_program', prog || '');
      localStorage.setItem('aims_sel_course', crs || '');
      localStorage.setItem('aims_sel_groupclass', grp || '');
    }
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Dapatkan sesi pengguna (pensyarah) yang sedang log masuk
      const { data: { session } } = await supabase.auth.getSession();
      const secretUserId = session?.user?.id;

      if (!secretUserId) {
        setIsLoading(false);
        router.push('/login');
        return;
      }

      // 2. Dapatkan nama penuh profil rasmi
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', secretUserId)
        .single();

      const lectName = profileData?.full_name || session?.user?.user_metadata?.full_name || '';

      // 3. Dapatkan senarai ID tugasan KHAS milik pensyarah ini sahaja
      let assignQuery = supabase.from('assignments').select('id');
      if (lectName && lectName.trim() !== '') {
        assignQuery = assignQuery.or(`lecturer_id.eq.${secretUserId},nama_pensyarah.eq.${lectName}`);
      } else {
        assignQuery = assignQuery.eq('lecturer_id', secretUserId);
      }

      const { data: myAssignments, error: assignErr } = await assignQuery;
      if (assignErr) throw assignErr;

      const assignmentIds = (myAssignments || []).map((a: any) => a.id);

      // Jika pensyarah baharu belum mempunyai sebarang tugasan
      if (assignmentIds.length === 0) {
        setStudentGroups([]);
        setProgramList([]);
        setCourseList([]);
        setGroupClassList([]);
        setIsLoading(false);
        return;
      }

      // 4. Ambil kumpulan projek hanya untuk tugasan milik pensyarah ini
      const { data: groupData, error: groupErr } = await supabase
        .from('student_groups')
        .select('*, assignments(*), paper_submissions(*), group_members(*)')
        .in('assignment_id', assignmentIds);

      if (groupErr) throw groupErr;

      const fetchedGroups = groupData || [];
      setStudentGroups(fetchedGroups);

      const programs = Array.from(new Set(fetchedGroups.map((g: any) => g.assignments?.program_pengajian).filter(Boolean))) as string[];
      setProgramList(programs);

      // Semak simpanan memori terdahulu
      const savedProgram = sessionStorage.getItem('aims_sel_program') || localStorage.getItem('aims_sel_program');
      const savedCourse = sessionStorage.getItem('aims_sel_course') || localStorage.getItem('aims_sel_course');
      const savedGroupClass = sessionStorage.getItem('aims_sel_groupclass') || localStorage.getItem('aims_sel_groupclass');

      if (savedProgram && programs.includes(savedProgram)) {
        setSelectedProgram(savedProgram);
        updateCourses(savedProgram, fetchedGroups, savedCourse, savedGroupClass);
      } else if (programs.length > 0) {
        const defaultProg = programs[0];
        setSelectedProgram(defaultProg);
        updateCourses(defaultProg, fetchedGroups, null, null);
      }

    } catch (err: any) {
      console.error("Ralat muat turun data portal:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourses = (program: string, allData: any[], savedCourse: string | null, savedGroupClass: string | null) => {
    const filteredByProg = allData.filter((g: any) => g.assignments?.program_pengajian === program);
    const courses = Array.from(new Set(filteredByProg.map((g: any) => g.assignments?.kod_kursus).filter(Boolean))) as string[];
    setCourseList(courses);

    const courseToUse = savedCourse && courses.includes(savedCourse) ? savedCourse : courses[0] || '';
    setSelectedCourse(courseToUse);

    if (courseToUse) {
      updateGroupClasses(program, courseToUse, allData, savedGroupClass);
    } else {
      setGroupClassList([]);
      setSelectedGroupClass('');
      saveFilters(program, '', '');
    }
  };

  const updateGroupClasses = (program: string, course: string, allData: any[], savedGroupClass: string | null) => {
    const filteredByCourse = allData.filter((g: any) => 
      g.assignments?.program_pengajian === program && 
      g.assignments?.kod_kursus === course
    );

    const groupClasses = Array.from(new Set(filteredByCourse.map((g: any) => g.assignments?.kumpulan_pelajar).filter(Boolean))) as string[];
    setGroupClassList(groupClasses);

    const groupClassToUse = savedGroupClass && groupClasses.includes(savedGroupClass) ? savedGroupClass : groupClasses[0] || '';
    setSelectedGroupClass(groupClassToUse);

    // Simpan kombinasi terkini yang sah
    saveFilters(program, course, groupClassToUse);
  };

  const handleProgramChange = (val: string) => {
    setSelectedProgram(val);
    updateCourses(val, studentGroups, null, null);
  };

  const handleCourseChange = (val: string) => {
    setSelectedCourse(val);
    updateGroupClasses(selectedProgram, val, studentGroups, null);
  };

  const handleGroupClassChange = (val: string) => {
    setSelectedGroupClass(val);
    saveFilters(selectedProgram, selectedCourse, val);
  };

  // Tapis kumpulan projek berdasarkan hierarki
  const filteredGroups = studentGroups.filter((g: any) => 
    (!selectedProgram || g.assignments?.program_pengajian === selectedProgram) &&
    (!selectedCourse || g.assignments?.kod_kursus === selectedCourse) &&
    (!selectedGroupClass || g.assignments?.kumpulan_pelajar === selectedGroupClass)
  );

  // ==========================================
  // FUNGSI MUAT TURUN EXCEL (CSV) & MARKAH CALC
  // ==========================================
  const exportToExcel = () => {
    let csvContent = "\uFEFFBil,No. Matrik,Nama Pelajar,Kumpulan,Markah Kertas Kerja (30M),Markah Pembentangan (30M),Jumlah Keseluruhan (60M)\n";
    let count = 1;

    filteredGroups.forEach((group: any) => {
      const submissions = group.paper_submissions || [];
      const latestSub = submissions.sort((a: any, b: any) => b.id - a.id)[0];
      const gradingData = latestSub?.ai_analysis?.grading_data || {};
      
      const paperMark = Number(gradingData.paperMark) || 0;

      group.group_members?.forEach((member: any) => {
        const indMarks = gradingData.individualMarks?.[member.id] || {};
        const presMark = (Number(indMarks.pengenalan)||0) + (Number(indMarks.interaksi)||0) + (Number(indMarks.kreativiti)||0) + (Number(indMarks.soal_jawab)||0) + (Number(indMarks.sahsiah)||0);
        const totalMark = paperMark + presMark;

        csvContent += `"${count}","${member.matrix_no || '-'}","${member.student_name}","${group.group_name}","${paperMark}","${presMark}","${totalMark}"\n`;
        count++;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Markah_${selectedCourse || 'Semua'}_${selectedGroupClass || 'Semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#064e3b', fontSize: '1.2rem', fontWeight: 600 }}>
        ⏳ Memuatkan Portal Penilaian Pensyarah...
      </div>
    );
  }

  // ==========================================
  // PENYEDIAAN DATA UNTUK CETAKAN PDF (JADUAL TERSEMBUNYI)
  // ==========================================
  const renderPrintableTable = () => {
    let count = 1;
    return filteredGroups.flatMap((group: any) => {
      const submissions = group.paper_submissions || [];
      const latestSub = submissions.sort((a: any, b: any) => b.id - a.id)[0];
      const gradingData = latestSub?.ai_analysis?.grading_data || {};
      const paperMark = Number(gradingData.paperMark) || 0;

      return (group.group_members || []).map((member: any) => {
        const indMarks = gradingData.individualMarks?.[member.id] || {};
        const presMark = (Number(indMarks.pengenalan)||0) + (Number(indMarks.interaksi)||0) + (Number(indMarks.kreativiti)||0) + (Number(indMarks.soal_jawab)||0) + (Number(indMarks.sahsiah)||0);
        const totalMark = paperMark + presMark;
        const currentCount = count++;

        return (
          <tr key={`${group.id}-${member.id}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{currentCount}</td>
            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{member.matrix_no || '-'}</td>
            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{member.student_name}</td>
            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{group.group_name}</td>
            <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{paperMark}</td>
            <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{presMark}</td>
            <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}>{totalMark}</td>
          </tr>
        );
      });
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* GAYA KHAS UNTUK CETAKAN PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; margin: 0; padding: 0; }
        }
      `}} />

      <div className="no-print" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* HEADER PORTAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', color: '#064e3b', fontWeight: 800 }}>
              Portal Penilaian Pensyarah
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
              Pilih hierarki kelas dan semak serahan tugasan pelajar serta rincian markah AI.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => router.push('/pensyarah/dashboard')}
              style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              🏠 Kembali ke Dashboard
            </button>
          </div>
        </div>

        {/* KAD HIERARKI KELAS & KUMPULAN */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔍 Pilih Hierarki Kelas & Kumpulan
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>1. Fakulti / Program Pengajian</label>
              <select value={selectedProgram} onChange={(e) => handleProgramChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', color: '#0f172a', fontWeight: 500 }}>
                {programList.map((prog, i) => <option key={i} value={prog}>{prog}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>2. Kod Kursus (Subjek)</label>
              <select value={selectedCourse} onChange={(e) => handleCourseChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #10b981', background: '#ecfdf5', fontSize: '0.95rem', outline: 'none', color: '#064e3b', fontWeight: 500 }}>
                {courseList.map((crs, i) => <option key={i} value={crs}>{crs}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>3. Kumpulan / Kelas Rasmi</label>
              <select value={selectedGroupClass} onChange={(e) => handleGroupClassChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #3b82f6', background: '#eff6ff', fontSize: '0.95rem', outline: 'none', color: '#1e40af', fontWeight: 500 }}>
                {groupClassList.map((grp, i) => <option key={i} value={grp}>{grp}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* JADUAL REKOD KUMPULAN PROJEK */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          
          {/* HEADER JADUAL & BUTANG EKSPORT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 700 }}>👥 Rekod Kumpulan Projek Pelajar</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Subjek: <strong>{selectedCourse || 'Semua'}</strong> | Kelas Rasmi: <strong>{selectedGroupClass || 'Semua'}</strong></p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: '#ecfdf5', color: '#047857', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #a7f3d0' }}>
                {filteredGroups.length} Kumpulan
              </span>
              <button onClick={() => window.print()} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                🖨️ Cetak PDF
              </button>
              <button onClick={exportToExcel} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                📊 Muat Turun Excel
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px' }}>No.</th>
                  <th style={{ padding: '14px' }}>Kumpulan Projek</th>
                  <th style={{ padding: '14px' }}>Ahli</th>
                  <th style={{ padding: '14px' }}>Status Kertas Kerja</th>
                  <th style={{ padding: '14px', textAlign: 'right' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      Tiada kumpulan projek didaftarkan untuk hierarki kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group: any, index: number) => {
                    const submissions = group.paper_submissions || [];
                    const latestSub = submissions.sort((a: any, b: any) => b.id - a.id)[0];

                    const isSubmitted = !!latestSub;
                    const isEvaluated = latestSub?.ai_analysis?.grading_data !== undefined && latestSub?.ai_analysis?.grading_data !== null;

                    return (
                      <tr key={group.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', color: '#64748b', fontWeight: 600 }}>{index + 1}.</td>
                        <td style={{ padding: '16px', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{group.group_name}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                            👥 {group.group_members?.length || 0} orang
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          {isEvaluated ? (
                            <span style={{ background: '#064e3b', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              ✓ Telah Disemak
                            </span>
                          ) : isSubmitted ? (
                            <span style={{ background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></span> Telah Dihantar
                            </span>
                          ) : (
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                              Belum Hantar
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          {isEvaluated ? (
                            <button
                              onClick={() => router.push(`/pensyarah/penilaian/semak/${group.id}`)}
                              style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#d1fae5'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#ecfdf5'}
                            >
                              ✅ Telah Dinilai
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push(`/pensyarah/penilaian/semak/${group.id}`)}
                              style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(2,132,199,0.25)', transition: 'transform 0.1s' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              🔍 Semak & Nilai
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* BAHAGIAN KHAS CETAKAN PDF */}
      <div className="print-only" style={{ display: 'none', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '8px' }}>Laporan Markah Penilaian Pelajar</h1>
          <p style={{ margin: 0, fontSize: '1.1rem', color: '#475569' }}>
            Kursus: <strong>{selectedCourse || 'Semua Kursus'}</strong> | Kelas: <strong>{selectedGroupClass || 'Semua Kelas'}</strong>
          </p>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#0f172a' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', width: '5%' }}>Bil</th>
              <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'left', width: '15%' }}>No. Matrik</th>
              <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'left', width: '30%' }}>Nama Pelajar</th>
              <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'left', width: '15%' }}>Kumpulan</th>
              <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', width: '10%' }}>Kertas Kerja (30M)</th>
              <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', width: '10%' }}>Pembentangan (30M)</th>
              <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', width: '15%', background: '#e2e8f0' }}>Total (60M)</th>
            </tr>
          </thead>
          <tbody>
            {renderPrintableTable()}
          </tbody>
        </table>

        <div style={{ marginTop: '40px', fontSize: '0.85rem', color: '#64748b', textAlign: 'right' }}>
          Janaan Automatik Sistem Penilaian AI - {new Date().toLocaleDateString('ms-MY')}
        </div>
      </div>

    </div>
  );
}