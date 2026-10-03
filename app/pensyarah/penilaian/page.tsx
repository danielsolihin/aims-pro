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
  const [selectedType, setSelectedType] = useState<string>(''); 

  // State Tetingkap Modal Laporan
  const [showReportModal, setShowReportModal] = useState<'pdf' | 'excel' | null>(null);

  // Senarai unik untuk Dropdown Filter
  const [programList, setProgramList] = useState<string[]>([]);
  const [courseList, setCourseList] = useState<string[]>([]);
  const [groupClassList, setGroupClassList] = useState<string[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const saveFilters = (prog: string, crs: string, grp: string, type: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aims_sel_program', prog || '');
      sessionStorage.setItem('aims_sel_course', crs || '');
      sessionStorage.setItem('aims_sel_groupclass', grp || '');
      sessionStorage.setItem('aims_sel_type', type || '');
    }
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const secretUserId = session?.user?.id;

      if (!secretUserId) {
        setIsLoading(false);
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', secretUserId)
        .single();

      const lectName = profileData?.full_name || session?.user?.user_metadata?.full_name || '';

      let assignQuery = supabase.from('assignments').select('id');
      if (lectName && lectName.trim() !== '') {
        assignQuery = assignQuery.or(`lecturer_id.eq.${secretUserId},nama_pensyarah.eq.${lectName}`);
      } else {
        assignQuery = assignQuery.eq('lecturer_id', secretUserId);
      }

      const { data: myAssignments, error: assignErr } = await assignQuery;
      if (assignErr) throw assignErr;

      const assignmentIds = (myAssignments || []).map((a: any) => a.id);

      if (assignmentIds.length === 0) {
        setStudentGroups([]);
        setProgramList([]);
        setCourseList([]);
        setGroupClassList([]);
        setIsLoading(false);
        return;
      }

      const { data: groupData, error: groupErr } = await supabase
        .from('student_groups')
        .select('*, assignments(*), paper_submissions(*), group_members(*)')
        .in('assignment_id', assignmentIds);

      if (groupErr) throw groupErr;

      const fetchedGroups = groupData || [];
      setStudentGroups(fetchedGroups);

      const programs = Array.from(new Set(fetchedGroups.map((g: any) => g.assignments?.program_pengajian).filter(Boolean))) as string[];
      setProgramList(programs);

      const savedProgram = sessionStorage.getItem('aims_sel_program');
      const savedCourse = sessionStorage.getItem('aims_sel_course');
      const savedGroupClass = sessionStorage.getItem('aims_sel_groupclass');
      const savedType = sessionStorage.getItem('aims_sel_type');

      if (savedProgram && programs.includes(savedProgram)) {
        setSelectedProgram(savedProgram);
        updateCourses(savedProgram, fetchedGroups, savedCourse, savedGroupClass);
      } else if (programs.length > 0) {
        const defaultProg = programs[0];
        setSelectedProgram(defaultProg);
        updateCourses(defaultProg, fetchedGroups, null, null);
      }

      if (savedType) setSelectedType(savedType);

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
      saveFilters(program, '', '', selectedType);
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

    saveFilters(program, course, groupClassToUse, selectedType);
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
    saveFilters(selectedProgram, selectedCourse, val, selectedType);
  };

  const handleTypeChange = (val: string) => {
    setSelectedType(val);
    saveFilters(selectedProgram, selectedCourse, selectedGroupClass, val);
  };

  // Tapis paparan jadual di UI mengikut semua filter
  const filteredGroups = studentGroups.filter((g: any) => {
    const isProgramMatch = !selectedProgram || g.assignments?.program_pengajian === selectedProgram;
    const isCourseMatch = !selectedCourse || g.assignments?.kod_kursus === selectedCourse;
    const isGroupMatch = !selectedGroupClass || g.assignments?.kumpulan_pelajar === selectedGroupClass;
    const dbType = g.assignments?.jenis_tugasan || 'KERTAS_KERJA';
    const isTypeMatch = !selectedType || dbType === selectedType;
    return isProgramMatch && isCourseMatch && isGroupMatch && isTypeMatch;
  });

  // ==========================================
  // LOGIK PENGGABUNGAN LAPORAN (CONSOLIDATED)
  // ==========================================
  const getCourseName = () => {
    const group = studentGroups.find(g => g.assignments?.kod_kursus === selectedCourse);
    return group?.assignments?.nama_kursus || 'N/A';
  };

  const getConsolidatedData = () => {
    const studentMap = new Map();
    if (!selectedCourse || !selectedGroupClass) return [];

    const groupsForClass = studentGroups.filter((g: any) => 
      g.assignments?.kod_kursus === selectedCourse &&
      g.assignments?.kumpulan_pelajar === selectedGroupClass
    );

    groupsForClass.forEach((group: any) => {
      const dbType = group.assignments?.jenis_tugasan || 'KERTAS_KERJA';
      
      const submissions = group.paper_submissions || [];
      const latestSub = submissions.sort((a: any, b: any) => b.id - a.id)[0];
      const gradingData = latestSub?.ai_analysis?.grading_data || {};
      
      const paperMark = Number(gradingData.paperMark) || 0;
      
      group.group_members?.forEach((member: any) => {
        const indMarks = gradingData.individualMarks?.[member.id] || {};
        const presMark = (Number(indMarks.pengenalan)||0) + (Number(indMarks.interaksi)||0) + (Number(indMarks.kreativiti)||0) + (Number(indMarks.soal_jawab)||0) + (Number(indMarks.sahsiah)||0);
        
        if (!studentMap.has(member.matrix_no)) {
          studentMap.set(member.matrix_no, {
            matrix_no: member.matrix_no || '-',
            student_name: member.student_name,
            kk_paper: 0,
            kk_pres: 0,
            kr_paper: 0,
            kr_pres: 0,
          });
        }

        const studentRecord = studentMap.get(member.matrix_no);

        if (dbType === 'KAJIAN_KES') {
           studentRecord.kr_paper = paperMark;
           studentRecord.kr_pres = presMark;
        } else {
           studentRecord.kk_paper = paperMark;
           studentRecord.kk_pres = presMark;
        }
      });
    });

    return Array.from(studentMap.values()).sort((a, b) => a.student_name.localeCompare(b.student_name));
  };

  // ==========================================
  // EKSPORT KE EXCEL (HTML Xls Format)
  // ==========================================
  const exportToExcel = () => {
    const consolidatedData = getConsolidatedData();
    const namaKursus = getCourseName();

    // Membina struktur HTML khusus yang boleh dibaca oleh Microsoft Excel
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          .header-title { font-weight: bold; font-size: 14pt; }
          .header-info { font-weight: bold; font-size: 11pt; }
          .table-header { background-color: #a6a6a6; font-weight: bold; border: 1pt solid #000000; text-align: center; vertical-align: middle; padding: 5px; }
          .table-cell { border: 1pt solid #000000; text-align: center; vertical-align: middle; padding: 4px; }
          .table-cell-left { border: 1pt solid #000000; text-align: left; vertical-align: middle; padding: 4px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="8" class="header-title">MARKAH KESELURUHAN PENILAIAN BERTERUSAN</td></tr>
          <tr><td colspan="8"></td></tr>
          <tr><td colspan="8" class="header-info">KOD KURSUS : ${selectedCourse}</td></tr>
          <tr><td colspan="8" class="header-info">NAMA KURSUS: ${namaKursus}</td></tr>
          <tr><td colspan="8" class="header-info">KUMPULAN: ${selectedGroupClass}</td></tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <td class="table-header" style="width: 40px;">BIL</td>
            <td class="table-header" style="width: 120px;">NO. MATRIK</td>
            <td class="table-header" style="width: 250px;">NAMA PELAJAR</td>
            <td class="table-header" style="width: 120px;">KERTAS KERJA</td>
            <td class="table-header" style="width: 150px;">PEMBENTANGAN (KK)</td>
            <td class="table-header" style="width: 150px;">KAJIAN KES/REVIEW</td>
            <td class="table-header" style="width: 150px;">PEMBENTANGAN (KR)</td>
            <td class="table-header" style="width: 120px;">TOTAL MARKAH</td>
          </tr>
    `;

    consolidatedData.forEach((student, index) => {
      const total = student.kk_paper + student.kk_pres + student.kr_paper + student.kr_pres;
      html += `
          <tr>
            <td class="table-cell">${index + 1}</td>
            <td class="table-cell" style="mso-number-format:'\\@'">${student.matrix_no}</td>
            <td class="table-cell-left">${student.student_name}</td>
            <td class="table-cell">${student.kk_paper}</td>
            <td class="table-cell">${student.kk_pres}</td>
            <td class="table-cell">${student.kr_paper}</td>
            <td class="table-cell">${student.kr_pres}</td>
            <td class="table-cell"><b>${total}</b></td>
          </tr>
      `;
    });

    html += `
        </table>
      </body>
      </html>
    `;

    // Save as .xls so Excel renders the HTML table cleanly
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Markah_${selectedCourse}_${selectedGroupClass}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isReadyToExport = selectedCourse !== '' && selectedGroupClass !== '';
  const consolidatedDataPrint = getConsolidatedData();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#064e3b', fontSize: '1.2rem', fontWeight: 600 }}>
        ⏳ Memuatkan Portal Penilaian Pensyarah...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* GAYA KHAS UNTUK CETAKAN PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: landscape; margin: 15mm; }
          body { background: #fff !important; margin: 0; padding: 0; font-family: Arial, sans-serif; }
          
          /* Khas supaya jadual data sahaja yang ada border penuh */
          table.print-data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          table.print-data-table th, table.print-data-table td { border: 1px solid #000; padding: 8px; font-size: 11px; }
          table.print-data-table th { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold; text-align: center; }
        }
      `}} />

      <div className="no-print" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
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

        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔍 Pilih Hierarki Kelas & Kumpulan
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
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
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>4. Jenis Tugasan</label>
              <select value={selectedType} onChange={(e) => handleTypeChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #8b5cf6', background: '#f5f3ff', fontSize: '0.95rem', outline: 'none', color: '#5b21b6', fontWeight: 500 }}>
                <option value="">Semua Jenis</option>
                <option value="KERTAS_KERJA">Kertas Kerja & Video</option>
                <option value="KAJIAN_KES">Kajian Kes / Review</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 700 }}>👥 Rekod Kumpulan Projek Pelajar</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Subjek: <strong>{selectedCourse || 'Semua'}</strong> | Kelas Rasmi: <strong>{selectedGroupClass || 'Semua'}</strong></p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: '#ecfdf5', color: '#047857', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #a7f3d0' }}>
                {filteredGroups.length} Kumpulan
              </span>
              <button onClick={() => setShowReportModal('pdf')} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                🖨️ Cetak PDF
              </button>
              <button onClick={() => setShowReportModal('excel')} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
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
                  <th style={{ padding: '14px' }}>Tugasan</th>
                  <th style={{ padding: '14px' }}>Ahli</th>
                  <th style={{ padding: '14px' }}>Status Serahan</th>
                  <th style={{ padding: '14px', textAlign: 'right' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      Tiada kumpulan projek didaftarkan untuk tapisan hierarki ini.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group: any, index: number) => {
                    const submissions = group.paper_submissions || [];
                    const latestSub = submissions.sort((a: any, b: any) => b.id - a.id)[0];

                    const isSubmitted = !!latestSub;
                    const isEvaluated = latestSub?.ai_analysis?.grading_data !== undefined && latestSub?.ai_analysis?.grading_data !== null;
                    
                    const isKajianKes = group.assignments?.jenis_tugasan === 'KAJIAN_KES';

                    return (
                      <tr key={group.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', color: '#64748b', fontWeight: 600 }}>{index + 1}.</td>
                        <td style={{ padding: '16px', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{group.group_name}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ background: isKajianKes ? '#f3e8ff' : '#e0f2fe', color: isKajianKes ? '#7e22ce' : '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {isKajianKes ? '🔍 KAJIAN KES' : '📑 KERTAS KERJA'}
                          </span>
                        </td>
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

      {/* POP-UP (MODAL) TETAPAN LAPORAN */}
      {showReportModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', maxWidth: '550px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '1.4rem' }}>📥 Janaan Laporan Markah Keseluruhan</h2>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.95rem' }}>Sila pastikan kelas yang ingin dijana laporannya adalah tepat:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>1. Fakulti / Program Pengajian</label>
                <select value={selectedProgram} onChange={(e) => handleProgramChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', color: '#0f172a' }}>
                  {programList.map((prog, i) => <option key={i} value={prog}>{prog}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>2. Kod Kursus (Subjek)</label>
                <select value={selectedCourse} onChange={(e) => handleCourseChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #10b981', background: '#ecfdf5', outline: 'none', color: '#064e3b', fontWeight: 500 }}>
                  <option value="">Sila Pilih Subjek...</option>
                  {courseList.map((crs, i) => <option key={i} value={crs}>{crs}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>3. Kumpulan / Kelas Rasmi</label>
                <select value={selectedGroupClass} onChange={(e) => handleGroupClassChange(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #3b82f6', background: '#eff6ff', outline: 'none', color: '#1e40af', fontWeight: 500 }}>
                  <option value="">Sila Pilih Kelas...</option>
                  {groupClassList.map((grp, i) => <option key={i} value={grp}>{grp}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: '#fef3c7', color: '#b45309', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
              <strong>Nota:</strong> Laporan ini akan menyenaraikan semua individu pelajar di dalam kelas ini dan menggabungkan markah mereka (Kertas Kerja, Kajian Kes & Pembentangan).
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowReportModal(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              {showReportModal === 'excel' ? (
                <button disabled={!isReadyToExport} onClick={() => { exportToExcel(); setShowReportModal(null); }} style={{ flex: 2, padding: '12px', background: isReadyToExport ? '#16a34a' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isReadyToExport ? 'pointer' : 'not-allowed' }}>
                  {isReadyToExport ? '📊 Muat Turun Excel' : 'Pilih Kelas Dahulu'}
                </button>
              ) : (
                <button disabled={!isReadyToExport} onClick={() => { window.print(); setShowReportModal(null); }} style={{ flex: 2, padding: '12px', background: isReadyToExport ? '#0f172a' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isReadyToExport ? 'pointer' : 'not-allowed' }}>
                  {isReadyToExport ? '🖨️ Cetak PDF' : 'Pilih Kelas Dahulu'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BAHAGIAN KHAS CETAKAN PDF (CONSOLIDATED REPORT) */}
      <div className="print-only" style={{ display: 'none', padding: '10px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ textTransform: 'uppercase', marginBottom: '15px' }}>MARKAH KESELURUHAN PENILAIAN BERTERUSAN</h2>
          <table style={{ fontWeight: 600, fontSize: '11pt', color: '#0f172a', border: 'none', width: 'auto', marginTop: 0 }}>
             <tbody>
                <tr><td style={{ padding: '0 20px 6px 0', border: 'none', whiteSpace: 'nowrap' }}>KOD KURSUS</td><td style={{ padding: '0 0 6px 0', border: 'none' }}>: {selectedCourse}</td></tr>
                <tr><td style={{ padding: '0 20px 6px 0', border: 'none', whiteSpace: 'nowrap' }}>NAMA KURSUS</td><td style={{ padding: '0 0 6px 0', border: 'none' }}>: {getCourseName()}</td></tr>
                <tr><td style={{ padding: '0 20px 0 0', border: 'none', whiteSpace: 'nowrap' }}>KUMPULAN</td><td style={{ padding: '0', border: 'none' }}>: {selectedGroupClass}</td></tr>
             </tbody>
          </table>
        </div>
        
        <table className="print-data-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>BIL</th>
              <th style={{ width: '12%' }}>NO. MATRIK</th>
              <th style={{ width: '30%', textAlign: 'left' }}>NAMA PELAJAR</th>
              <th style={{ width: '12%' }}>KERTAS KERJA</th>
              <th style={{ width: '14%' }}>PEMBENTANGAN (KK)</th>
              <th style={{ width: '14%' }}>KAJIAN KES/REVIEW</th>
              <th style={{ width: '14%' }}>PEMBENTANGAN (KR)</th>
              <th style={{ width: '10%' }}>TOTAL MARKAH</th>
            </tr>
          </thead>
          <tbody>
            {consolidatedDataPrint.map((student: any, index: number) => {
              const total = student.kk_paper + student.kk_pres + student.kr_paper + student.kr_pres;
              return (
                <tr key={index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ textAlign: 'center' }}>{student.matrix_no}</td>
                  <td style={{ textAlign: 'left' }}>{student.student_name}</td>
                  <td style={{ textAlign: 'center' }}>{student.kk_paper}</td>
                  <td style={{ textAlign: 'center' }}>{student.kk_pres}</td>
                  <td style={{ textAlign: 'center' }}>{student.kr_paper}</td>
                  <td style={{ textAlign: 'center' }}>{student.kr_pres}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{total}</td>
                </tr>
              );
            })}
            {consolidatedDataPrint.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Tiada data untuk kelas ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}