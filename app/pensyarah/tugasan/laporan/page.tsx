'use client';

import { useState, useEffect } from 'react';

export default function LaporanIndukPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      fetchGroupsData(selectedAssignmentId);
    } else {
      setGroups([]);
    }
  }, [selectedAssignmentId]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/pelajar/tugasan');
      const data = await res.json();
      if (res.ok && data.assignments) {
        setAssignments(data.assignments);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGroupsData = async (assignId: string) => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/pensyarah/penilaian?assignment_id=${assignId}`);
      const data = await res.json();
      if (res.ok) setGroups(data.groups || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  };

  const uniquePrograms = Array.from(new Set(assignments.map(a => a.program_pengajian).filter(Boolean))) as string[];
  const uniqueGroups = Array.from(new Set(assignments.map(a => a.kumpulan_pelajar).filter(Boolean))) as string[];
  
  const filteredAssignments = assignments.filter(a => {
    const matchProgram = selectedProgram ? a.program_pengajian === selectedProgram : true;
    const matchGroup = selectedGroupFilter ? a.kumpulan_pelajar === selectedGroupFilter : true;
    return matchProgram && matchGroup;
  });

  const selectedAssignment = assignments.find(a => a.id.toString() === selectedAssignmentId);

  const cetakLaporanPDF = () => window.print();

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '24px', fontFamily: 'Segoe UI, sans-serif', color: '#1e293b' }}>
      
      {/* HEADER & TAPISAN DENGAN BUTANG KEMBALI */}
      <div className="no-print" style={{ marginBottom: '24px', borderBottom: '2px solid #065f46', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ color: '#065f46', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Laporan Induk Markah Pelajar</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Jana dan cetak jadual markah penuh format A4 Lanskap.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/pensyarah/dashboard" style={{ padding: '10px 18px', background: '#f1f5f9', color: '#475569', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #cbd5e1' }}>
              🏠 Kembali ke Dashboard
            </a>
            <button onClick={cetakLaporanPDF} disabled={!selectedAssignmentId} style={{ padding: '10px 20px', background: selectedAssignmentId ? '#065f46' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: selectedAssignmentId ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}>
              🖨️ Cetak Laporan PDF
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <select value={selectedProgram} onChange={(e) => { setSelectedProgram(e.target.value); setSelectedAssignmentId(''); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <option value="">-- Semua Program --</option>
            {uniquePrograms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={selectedGroupFilter} onChange={(e) => { setSelectedGroupFilter(e.target.value); setSelectedAssignmentId(''); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <option value="">-- Semua Kumpulan --</option>
            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #065f46', fontWeight: 700 }}>
            <option value="">-- Pilih Tajuk Tugasan --</option>
            {filteredAssignments.map((a) => (
              <option key={a.id} value={a.id}>{a.kod_kursus} - {a.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DOKUMEN CETAKAN RASMI (A4 LANDSCAPE) */}
      <div id="laporan-cetak" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
        
        {/* HEADER DOKUMEN RASMI */}
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', textTransform: 'uppercase', textAlign: 'center' }}>
            REKOD PENILAIAN BERTERUSAN PELAJAR
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px', fontSize: '0.9rem', color: '#1e293b' }}>
            <div>
              <p style={{ margin: '4px 0' }}><strong>Kursus:</strong> {selectedAssignment?.nama_kursus || '—'} ({selectedAssignment?.kod_kursus || '—'})</p>
              <p style={{ margin: '4px 0' }}><strong>Program:</strong> {selectedAssignment?.program_pengajian || '—'}</p>
              <p style={{ margin: '4px 0' }}><strong>Kumpulan:</strong> {selectedAssignment?.kumpulan_pelajar || '—'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '4px 0' }}><strong>Tajuk Tugasan:</strong> {selectedAssignment?.title || '—'}</p>
              <p style={{ margin: '4px 0' }}><strong>Wajaran Kertas Kerja:</strong> {selectedAssignment?.paper_weight || 0} Mata</p>
              <p style={{ margin: '4px 0' }}><strong>Wajaran Pembentangan:</strong> {selectedAssignment?.presentation_weight || 0} Mata</p>
            </div>
          </div>
        </div>

        {/* JADUAL INDUK MARKAH */}
        {isFetching ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Memuatkan laporan...</div>
        ) : !selectedAssignmentId ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Sila pilih tugasan di atas untuk memaparkan jadual.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '10px', border: '1px solid #0f172a' }}>No.</th>
                <th style={{ padding: '10px', border: '1px solid #0f172a' }}>Nama Pelajar</th>
                <th style={{ padding: '10px', border: '1px solid #0f172a' }}>No. Matrik</th>
                <th style={{ padding: '10px', border: '1px solid #0f172a' }}>Nama Kumpulan (Tajuk)</th>
                <th style={{ padding: '10px', border: '1px solid #0f172a', textAlign: 'center' }}>Kertas Kerja (/{selectedAssignment?.paper_weight})</th>
                <th style={{ padding: '10px', border: '1px solid #0f172a', textAlign: 'center' }}>Pembentangan (/{selectedAssignment?.presentation_weight})</th>
                <th style={{ padding: '10px', border: '1px solid #0f172a', textAlign: 'center' }}>Jumlah (%)</th>
              </tr>
            </thead>
            <tbody>
              {groups.flatMap((g, gIdx) => {
                const paperMarkRaw = g.paper_submissions?.[0]?.final_paper_mark || 0;

                return g.group_members?.map((m: any, mIdx: number) => {
                  const pres = m.presentation_evaluations?.[0];
                  const presMarkRaw = pres?.total_presentation_mark || 0;
                  const totalFinal = (paperMarkRaw + presMarkRaw).toFixed(1);

                  return (
                    <tr key={`${gIdx}-${mIdx}`} style={{ background: (gIdx + mIdx) % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{gIdx + 1}.{mIdx + 1}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{m.student_name}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{m.matrix_no}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{g.group_name}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{paperMarkRaw}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{presMarkRaw}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, color: '#065f46', fontSize: '0.95rem' }}>
                        {totalFinal}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        )}

        {/* BAHAGIAN PENGESAHAN TANDATANGAN PENSYARAH */}
        {selectedAssignmentId && (
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 20px', fontSize: '0.85rem' }}>
            <div>
              <p style={{ margin: 0 }}>Disemak & Disahkan Oleh Pensyarah:</p>
              <div style={{ marginTop: '50px', borderBottom: '1px solid #000', width: '200px' }}></div>
              <p style={{ margin: '4px 0 0 0', fontWeight: 700 }}>Tandatangan & Cop Rasmi</p>
            </div>
            <div>
              <p style={{ margin: 0 }}>Tarikh Pengesahan:</p>
              <p style={{ margin: '50px 0 0 0', fontWeight: 700 }}>____ / ____ / 202__</p>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0 !important; }
          #laporan-cetak { border: none !important; padding: 0 !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}