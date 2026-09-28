'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LaporanIndukPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');

  const [studentReports, setStudentReports] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]); 
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      fetchReportData(selectedProgram, selectedGroupFilter);
    } else {
      setStudentReports([]);
      setSelectedStudentIds([]);
    }
  }, [selectedProgram, selectedGroupFilter]);

  const fetchAssignments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const lectName = session?.user?.user_metadata?.full_name || '';
      
      const { data, error } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      let allAssignments = data || [];
      if (lectName) {
        const myAssignments = allAssignments.filter((a:any) => a.nama_pensyarah === lectName);
        if (myAssignments.length > 0) {
          allAssignments = myAssignments;
        }
      }
      setAssignments(allAssignments);
    } catch (error) {
      console.error("Gagal menarik senarai kelas:", error);
    }
  };

  const fetchReportData = async (program: string, groupFilter: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('student_groups')
        .select(`
          *,
          assignments!inner(*),
          paper_submissions(*),
          group_members(*)
        `)
        .eq('assignments.program_pengajian', program);

      if (groupFilter) {
        query = query.eq('assignments.kumpulan_pelajar', groupFilter);
      }

      const { data: groupsData, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;

      const allStudentIds = groupsData?.flatMap(g => g.group_members?.map((m: any) => m.id) || []) || [];

      let presentationData: any[] = [];
      if (allStudentIds.length > 0) {
        const { data: presEvals } = await supabase
          .from('presentation_evaluations')
          .select('*')
          .in('student_id', allStudentIds);
        presentationData = presEvals || [];
      }

      const compiledReports: any[] = [];

      groupsData?.forEach((group: any) => {
        const paperMark = group.paper_submissions?.[0]?.final_paper_mark || 0;
        const assignmentInfo = group.assignments;
        
        const maxPaper = assignmentInfo?.paper_weight || 30;
        const maxVideo = assignmentInfo?.presentation_weight || 30;

        group.group_members?.forEach((member: any) => {
          // PADANAN TEPAT PAKSA (String Matching)
          const evalItem = presentationData.find((p: any) => String(p.student_id) === String(member.id));
          const videoMark = evalItem?.total_presentation_mark || 0;
          const totalMark = paperMark + videoMark;

          compiledReports.push({
            student_id: member.id,
            student_name: member.student_name,
            matrix_no: member.matrix_no,
            group_name: group.group_name,
            course_code: assignmentInfo?.kod_kursus || 'N/A',
            paper_mark: paperMark,
            video_mark: videoMark,
            total_mark: totalMark,
            max_paper: maxPaper,
            max_video: maxVideo,
            has_submitted: group.paper_submissions && group.paper_submissions.length > 0
          });
        });
      });

      compiledReports.sort((a, b) => a.student_name.localeCompare(b.student_name));
      setStudentReports(compiledReports);
      setSelectedStudentIds(compiledReports.map(s => s.student_id));

    } catch (error) {
      console.error("Ralat menarik data laporan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = studentReports.filter(s => selectedStudentIds.includes(s.student_id));
    if (dataToExport.length === 0) {
      alert("⚠️ Sila pilih sekurang-kurangnya seorang pelajar untuk dieksport.");
      return;
    }

    const sample = dataToExport[0];
    const maxPaper = sample.max_paper;
    const maxVideo = sample.max_video;
    const maxTotal = maxPaper + maxVideo;

    let csvContent = `Bil,Nama Pelajar,No. Matrik,Kumpulan,Markah Kertas Kerja (/${maxPaper}),Markah Pembentangan (/${maxVideo}),Jumlah Akhir (/${maxTotal})\n`;

    dataToExport.forEach((student, index) => {
      csvContent += `${index + 1},"${student.student_name}","${student.matrix_no}","${student.group_name}",${student.paper_mark},${student.video_mark},${student.total_mark}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Markah_${selectedProgram || 'Semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniquePrograms = Array.from(new Set(assignments.map(a => a.program_pengajian).filter(Boolean))) as string[];
  const filteredByProgram = assignments.filter(a => a.program_pengajian === selectedProgram);
  const uniqueGroupFilters = Array.from(new Set(filteredByProgram.map(a => a.kumpulan_pelajar).filter(Boolean))) as string[];

  const sampleData = studentReports[0] || {};
  const maxPaper = sampleData.max_paper || 30;
  const maxVideo = sampleData.max_video || 30;
  const maxTotal = maxPaper + maxVideo;

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: #fff; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11pt; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; font-weight: bold; }
          @page { size: A4 landscape; margin: 15mm; }
        }
        .print-only { display: none; }
        .checkbox-custom { width: 18px; height: 18px; cursor: pointer; accent-color: #065f46; }
      `}} />

      <header className="no-print" style={{ marginBottom: '24px', borderBottom: '2px solid #065f46', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: '#065f46', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>📊 Laporan Induk Markah Pelajar</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Papar, cetak jadual, dan eksport data ke Excel.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/pensyarah/dashboard" style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #cbd5e1' }}>
            🏠 Kembali
          </Link>
          <button onClick={handleExportExcel} disabled={studentReports.length === 0} style={{ padding: '10px 16px', background: studentReports.length === 0 ? '#cbd5e1' : '#059669', color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: studentReports.length === 0 ? 'not-allowed' : 'pointer' }}>
            📥 Eksport ke Excel (CSV)
          </button>
          <button onClick={() => window.print()} disabled={studentReports.length === 0} style={{ padding: '10px 16px', background: studentReports.length === 0 ? '#94a3b8' : '#0f172a', color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: studentReports.length === 0 ? 'not-allowed' : 'pointer' }}>
            🖨️ Cetak PDF Rasmi
          </button>
        </div>
      </header>

      <section className="no-print" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>🔍 Tapis Rekod Pelajar</h3>
        
        {assignments.length === 0 && (
          <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '16px', fontWeight: 600 }}>
            ⚠️ Tiada sebarang rekod Program Pengajian ditemui. Sila pastikan anda telah mencipta dan mendaftar tugasan di menu "Cipta Tugasan Baru".
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <select value={selectedProgram} onChange={(e) => { setSelectedProgram(e.target.value); setSelectedGroupFilter(''); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}>
            <option value="">-- Sila Pilih Program Pengajian --</option>
            {uniquePrograms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={selectedGroupFilter} disabled={!selectedProgram} onChange={(e) => setSelectedGroupFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #065f46', background: '#ecfdf5', fontWeight: 700 }}>
            <option value="">Semua Kumpulan (Satu Kelas)</option>
            {uniqueGroupFilters.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </section>

      <div className="print-only" style={{ marginBottom: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '4px' }}>Laporan Penilaian Akademik Keseluruhan</h2>
        <h3 style={{ textAlign: 'center', margin: '0 0 20px 0', fontWeight: 'normal' }}>Sistem Pengurusan Penilaian Muqaran</h3>
        
        <table style={{ width: '100%', border: 'none', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ border: 'none', padding: '4px 0', width: '20%' }}><strong>Program / Kelas:</strong></td>
              <td style={{ border: 'none', padding: '4px 0' }}>{selectedProgram || '-'}</td>
            </tr>
            <tr>
              <td style={{ border: 'none', padding: '4px 0' }}><strong>Kumpulan:</strong></td>
              <td style={{ border: 'none', padding: '4px 0' }}>{selectedGroupFilter || 'Keseluruhan Kelas'}</td>
            </tr>
            <tr>
              <td style={{ border: 'none', padding: '4px 0' }}><strong>Tarikh Dicetak:</strong></td>
              <td style={{ border: 'none', padding: '4px 0' }}>{new Date().toLocaleDateString('ms-MY')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {selectedProgram && (
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
              📋 Senarai Markah Pelajar <span style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>({selectedStudentIds.length} Dipilih)</span>
            </h2>
            {isLoading && <span style={{ color: '#065f46', fontWeight: 700 }}>⏳ Sedang mengira markah...</span>}
          </div>

          {studentReports.length === 0 && !isLoading ? (
            <div className="no-print" style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
              Tiada rekod pelajar ditemui untuk tapisan ini.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    
                    <th className="no-print" style={{ padding: '14px', textAlign: 'center', width: '4%' }}>
                      <input 
                        type="checkbox" 
                        className="checkbox-custom"
                        checked={studentReports.length > 0 && selectedStudentIds.length === studentReports.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds(studentReports.map(s => s.student_id));
                          else setSelectedStudentIds([]);
                        }}
                      />
                    </th>

                    <th style={{ padding: '14px', color: '#0f172a', width: '5%' }}>Bil.</th>
                    <th style={{ padding: '14px', color: '#0f172a', width: '22%' }}>Nama Pelajar</th>
                    <th style={{ padding: '14px', color: '#0f172a', width: '12%' }}>No. Matrik</th>
                    <th style={{ padding: '14px', color: '#0f172a', width: '12%' }}>Kumpulan</th>
                    
                    <th style={{ padding: '14px', color: '#065f46', width: '15%', textAlign: 'center' }}>
                      Kertas Kerja<br/><span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>( / {maxPaper} )</span>
                    </th>
                    <th style={{ padding: '14px', color: '#b45309', width: '15%', textAlign: 'center' }}>
                      Pembentangan<br/><span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>( / {maxVideo} )</span>
                    </th>
                    <th style={{ padding: '14px', color: '#0f172a', width: '15%', textAlign: 'center', background: '#e2e8f0' }}>
                      Jumlah Akhir<br/><span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>( / {maxTotal} )</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentReports.map((student, index) => {
                    const isSelected = selectedStudentIds.includes(student.student_id);
                    return (
                      <tr key={student.student_id} className={!isSelected ? 'no-print' : ''} style={{ borderBottom: '1px solid #e2e8f0', background: !student.has_submitted ? '#fff1f2' : isSelected ? '#fff' : '#f8fafc' }}>
                        
                        <td className="no-print" style={{ padding: '14px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            className="checkbox-custom"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) setSelectedStudentIds(prev => prev.filter(id => id !== student.student_id));
                              else setSelectedStudentIds(prev => [...prev, student.student_id]);
                            }}
                          />
                        </td>

                        <td style={{ padding: '14px', color: '#475569' }}>{index + 1}</td>
                        <td style={{ padding: '14px', fontWeight: 600, color: '#1e293b' }}>
                          {student.student_name}
                          {!student.has_submitted && <span className="no-print" style={{ display: 'block', fontSize: '0.75rem', color: '#e11d48', marginTop: '4px' }}>Tiada Serahan</span>}
                        </td>
                        <td style={{ padding: '14px', color: '#475569' }}>{student.matrix_no}</td>
                        <td style={{ padding: '14px', color: '#475569' }}>{student.group_name}</td>
                        
                        <td style={{ padding: '14px', textAlign: 'center', color: '#059669', background: '#f0fdf4', fontSize: '1rem' }}>
                          {student.paper_mark}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'center', color: '#d97706', background: '#fffbeb', fontSize: '1rem' }}>
                          {student.video_mark}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'center', color: '#0f172a', background: '#f1f5f9', fontSize: '1.05rem' }}>
                          {student.total_mark}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="print-only" style={{ marginTop: '50px', textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ margin: '0 0 40px 0' }}>Disemak dan disahkan oleh:</p>
        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>PENSYARAH KURSUS</p>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: '#555' }}>Cop Rasmi Fakulti</p>
      </div>

    </div>
  );
}