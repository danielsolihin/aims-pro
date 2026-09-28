'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SemakanPelajarPage() {
  const router = useRouter();
  
  const [matrixNo, setMatrixNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matrixNo.trim()) return;

    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      const { data: members, error: searchErr } = await supabase
        .from('group_members')
        .select(`*, student_groups (*, assignments (*), paper_submissions (*))`)
        .eq('matrix_no', matrixNo.trim());

      if (searchErr) throw searchErr;

      if (!members || members.length === 0) {
        setError('No. Matrik tidak dijumpai. Sila pastikan anda memasukkan nombor yang tepat.');
        setIsLoading(false);
        return;
      }

      const formattedResults = members.map(member => {
        const group = member.student_groups;
        if (!group) return null;

        const assignment = group.assignments;
        const submissions = group.paper_submissions || [];
        const latestSub = submissions.sort((a: any, b: any) => b.id - a.id)[0];
        
        // TARIK MARKAH MAKSIMUM DINAMIK
        const paperMax = Number(assignment?.markah_kertas_kerja || 30);
        const presMax = Number(assignment?.markah_pembentangan || 30);
        const totalMax = paperMax + presMax;

        const gradingData = latestSub?.ai_analysis?.grading_data || {};
        
        const paperMark = Number(gradingData.paperMark) || 0;
        const paperComment = gradingData.paperComment || '';

        const indMarks = gradingData.individualMarks?.[member.id] || {};
        const presMark = (Number(indMarks.pengenalan) || 0) + (Number(indMarks.interaksi) || 0) + (Number(indMarks.kreativiti) || 0) + (Number(indMarks.soal_jawab) || 0) + (Number(indMarks.sahsiah) || 0);
        const presComment = gradingData.individualComments?.[member.id] || '';

        const isEvaluated = latestSub?.ai_analysis?.grading_data !== undefined;

        return {
          studentName: member.student_name,
          matrixNo: member.matrix_no,
          courseCode: assignment?.kod_kursus || 'N/A',
          assignmentTitle: assignment?.title || 'Tugasan',
          groupName: group.group_name,
          lecturerName: assignment?.lecturer_name || 'Pensyarah',
          paperMark, paperMax, paperComment,
          presMark, presMax, presComment,
          totalMark: paperMark + presMark, totalMax,
          isEvaluated
        };
      }).filter(Boolean);

      setResults(formattedResults);

    } catch (err: any) {
      setError('Berlaku ralat pada pelayan. Sila cuba sebentar lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => router.push('/')} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '20px', color: '#475569', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            🏠 Kembali ke Pintu Gerbang Utama
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2rem', color: '#064e3b', fontWeight: 900 }}>🎓 Semakan Markah Pelajar</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1.05rem' }}>Semak rekod penilaian berterusan (Kertas Kerja & Pembentangan) anda.</p>
        </div>

        <div style={{ background: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Masukkan No. Matrik Anda</label>
            <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
              <input type="text" value={matrixNo} onChange={(e) => setMatrixNo(e.target.value)} placeholder="Contoh: 202512345" style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.1rem', outline: 'none', textAlign: 'center', fontWeight: 600, color: '#0f172a' }} required />
              <button type="submit" disabled={isLoading} style={{ background: '#064e3b', color: '#fff', border: 'none', padding: '0 30px', borderRadius: '12px', fontWeight: 700, fontSize: '1.05rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}>{isLoading ? '⏳...' : '🔍 Semak'}</button>
            </div>
            {error && <div style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: 600, marginTop: '10px', background: '#fee2e2', padding: '8px 16px', borderRadius: '8px' }}>⚠️ {error}</div>}
          </form>
        </div>

        {results && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#334155', fontWeight: 600 }}>Keputusan Penilaian untuk: <span style={{ color: '#064e3b', fontWeight: 800 }}>{results[0].studentName.toUpperCase()} ({results[0].matrixNo})</span></h2>
            </div>

            {results.map((res: any, idx: number) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '20px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'inline-block', background: '#e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '10px' }}>{res.courseCode}</span>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800, lineHeight: 1.4 }}>{res.assignmentTitle}</h3>
                    <div style={{ display: 'flex', gap: '16px', color: '#475569', fontSize: '0.85rem', fontWeight: 500, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>👥 Kumpulan: <strong style={{ color: '#0f172a' }}>{res.groupName}</strong></span><span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>👨‍🏫 Pensyarah: <strong style={{ color: '#0f172a' }}>{res.lecturerName}</strong></span>
                    </div>
                  </div>
                  
                  <div style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '16px', padding: '16px 24px', textAlign: 'center', minWidth: '160px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', marginBottom: '4px', letterSpacing: '0.5px' }}>JUMLAH AKHIR</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#064e3b', lineHeight: 1 }}>
                      {res.isEvaluated ? res.totalMark : '0'} <span style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 700 }}>/ {res.totalMax}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '24px', background: '#f8fafc', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  
                  <div style={{ flex: 1, minWidth: '280px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#064e3b', fontWeight: 700 }}>📄 Kertas Kerja</h4>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>{res.isEvaluated ? res.paperMark : '0'} <span style={{ fontSize: '0.9rem', color: '#10b981' }}>/ {res.paperMax}</span></div>
                    </div>
                    <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', marginBottom: '8px' }}>ULASAN PENSYARAH:</div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', fontStyle: res.paperComment ? 'normal' : 'italic' }}>{res.isEvaluated ? (res.paperComment || 'Tiada ulasan ditinggalkan.') : 'Pensyarah belum meninggalkan ulasan.'}</p>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '280px', background: '#fffbeb', border: '1px solid #fde047', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#854d0e', fontWeight: 700 }}>🗣️ Pembentangan</h4>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{res.isEvaluated ? res.presMark : '0'} <span style={{ fontSize: '0.9rem', color: '#ca8a04' }}>/ {res.presMax}</span></div>
                    </div>
                    <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #fde047' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', marginBottom: '8px' }}>KOMEN PRESTASI:</div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', fontStyle: res.presComment ? 'normal' : 'italic' }}>{res.isEvaluated ? (res.presComment || 'Tiada komen ditinggalkan.') : 'Pensyarah belum meninggalkan ulasan.'}</p>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}