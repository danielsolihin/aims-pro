'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ==========================================
// FUNGSI PINTAR: TUKAR PAUTAN KE FORMAT EMBED
// ==========================================
const getEmbedUrl = (url: string) => {
  if (!url) return null;
  try {
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('drive.google.com/file/d/')) {
      return url.replace(/\/view.*$/, '/preview');
    }
  } catch (e) {
    return url;
  }
  return url;
};

export default function SemakanPenilaianPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: groupId } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  
  // TAB BERSEMUKA ATAU VIDEO
  const [activeTab, setActiveTab] = useState<'bersemuka' | 'video'>('bersemuka');

  const [paperMark, setPaperMark] = useState<number | ''>('');
  const [paperComment, setPaperComment] = useState('');
  
  const [individualMarks, setIndividualMarks] = useState<Record<string, any>>({});
  const [individualComments, setIndividualComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (groupId) fetchEvaluationData();
  }, [groupId]);

  const fetchEvaluationData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_groups')
        .select('*, assignments(*), group_members(*), paper_submissions(*)')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroupData(data);
      
      const initialMarks: Record<string, any> = {};
      data.group_members?.forEach((m: any) => {
        initialMarks[m.id] = { pengenalan: '', interaksi: '', kreativiti: '', soal_jawab: '', sahsiah: '' };
      });

      if (data.paper_submissions && data.paper_submissions.length > 0) {
        const sortedSubmissions = [...data.paper_submissions].sort((a, b) => b.id - a.id);
        const latestSubmission = sortedSubmissions[0];
        setSubmissionData(latestSubmission);

        const aiAnalysis = latestSubmission.ai_analysis || {};
        const aiMarksArray = aiAnalysis.marks_data || [];
        const totalAiMarks = aiMarksArray.reduce((sum: number, m: any) => sum + (Number(m.score) || 0), 0);

        if (aiAnalysis.grading_data) {
          const savedGrading = aiAnalysis.grading_data;
          if (savedGrading.paperMark !== undefined && savedGrading.paperMark !== '') {
            setPaperMark(savedGrading.paperMark);
          } else if (totalAiMarks > 0) {
            setPaperMark(totalAiMarks);
          } else {
            setPaperMark('');
          }
          setPaperComment(savedGrading.paperComment || '');
          setIndividualMarks(savedGrading.individualMarks || initialMarks);
          setIndividualComments(savedGrading.individualComments || {});
        } else {
          setPaperMark(totalAiMarks > 0 ? totalAiMarks : '');
          setIndividualMarks(initialMarks);
        }
      } else {
        setIndividualMarks(initialMarks);
      }

    } catch (e: any) {
      console.error("Ralat memuat turun data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = (marks: any) => {
    if (!marks) return 0;
    const { pengenalan, interaksi, kreativiti, soal_jawab, sahsiah } = marks;
    return (Number(pengenalan) || 0) + (Number(interaksi) || 0) + (Number(kreativiti) || 0) + (Number(soal_jawab) || 0) + (Number(sahsiah) || 0);
  };

  const saveEvaluation = async () => {
    if (!submissionData) return;
    setIsSaving(true);
    try {
      const { data: latestSub } = await supabase
        .from('paper_submissions')
        .select('ai_analysis')
        .eq('id', submissionData.id)
        .single();

      const existingAi = latestSub?.ai_analysis || {};
      const gradingData = { paperMark, paperComment, individualMarks, individualComments };
      const updatedAiAnalysis = { ...existingAi, grading_data: gradingData };

      const { error } = await supabase.from('paper_submissions').update({ ai_analysis: updatedAiAnalysis }).eq('id', submissionData.id);
      if (error) throw error;
      alert("✅ Markah berjaya direkodkan!");
    } catch (e: any) {
      alert("Gagal menyimpan markah. Sila cuba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳ Memuatkan modul pemarkahan...</div>;
  if (!groupData) return <div style={{ padding: '50px', textAlign: 'center' }}>Data kumpulan tidak dijumpai.</div>;

  const assignment = groupData.assignments;
  
  // LOGIK MENGENALPASTI JENIS DAN STATUS VIDEO
  const isKajianKes = assignment?.jenis_tugasan === 'KAJIAN_KES';
  const maxPaper = Number(assignment?.markah_kertas_kerja || 30);
  const maxPres = Number(assignment?.markah_pembentangan ?? assignment?.presentation_weight ?? 0);
  const hasVideo = maxPres > 0;
  const maxCriteria = hasVideo ? maxPres / 5 : 0;

  const handleMarkChange = (studentId: string, field: string, value: string) => {
    let numVal = parseFloat(value);
    if (numVal > maxCriteria) numVal = maxCriteria; 
    if (numVal < 0) numVal = 0;
    
    setIndividualMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: isNaN(numVal) ? '' : numVal } }));
  };

  // KENALPASTI PAUTAN VIDEO UNTUK EMBED
  const rawVideoUrl = submissionData?.video_link || submissionData?.video_url;
  const embedVideoUrl = getEmbedUrl(rawVideoUrl);

  return (
    <div style={{ minHeight: '100vh', background: '#fcfcfc', padding: '30px 16px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #10b981', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <input type="checkbox" checked readOnly style={{ width: '18px', height: '18px', marginTop: '4px', accentColor: '#10b981' }} />
              <div>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: 600 }}>{assignment?.kumpulan_pelajar} - {groupData.group_name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.95rem' }}>
                  <span style={{ color: '#ef4444' }}>📌</span> {assignment?.title}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ background: '#064e3b', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>✓ Semakan Aktif</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #064e3b', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', fontWeight: 600 }}>Penilaian Untuk: <span style={{ color: '#065f46', fontWeight: 700 }}>{groupData.group_name}</span></h2>
            <button onClick={() => router.back()} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>✕ Tutup</button>
          </div>

          <div style={{ padding: '24px' }}>
            
            {/* PAPER MARK */}
            <div style={{ background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', padding: '24px', marginBottom: hasVideo ? '30px' : '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <h3 style={{ margin: 0, color: '#064e3b', fontSize: '1.15rem', fontWeight: 700 }}>
                  📄 Markah {isKajianKes ? 'Penulisan / Kajian Kes' : 'Kertas Kerja'} Kumpulan
                </h3>
                <button onClick={() => router.push(`/pensyarah/penilaian/analisis/${groupId}`)} style={{ background: '#064e3b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📁 Papar Analisis Teks Penuh
                </button>
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', border: '1px solid #10b981', borderRadius: '12px', padding: '16px', textAlign: 'center', minWidth: '150px' }}>
                  <label style={{ display: 'block', color: '#064e3b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Markah (Max: {maxPaper})</label>
                  <input type="number" max={maxPaper} value={paperMark} onChange={(e) => setPaperMark(Number(e.target.value))} placeholder="0" style={{ width: '100px', padding: '10px', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <label style={{ display: 'block', color: '#064e3b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Ulasan Pensyarah</label>
                  <textarea value={paperComment} onChange={(e) => setPaperComment(e.target.value)} placeholder="Taipkan ulasan anda di sini..." style={{ width: '100%', height: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* PRESENTATION MARK (HANYA MUNCUL JIKA ADA VIDEO / MARKAH BENTANG > 0) */}
            {hasVideo && (
              <div style={{ background: '#fffbeb', borderRadius: '16px', border: '1px solid #fde047', padding: '24px' }}>
                
                {/* TAB TOGGLE BERSEMUKA & VIDEO */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setActiveTab('bersemuka')} 
                      style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'bersemuka' ? '#b45309' : '#fef3c7', color: activeTab === 'bersemuka' ? '#fff' : '#b45309', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
                    >
                      🧑‍🏫 Bersemuka
                    </button>
                    <button 
                      onClick={() => setActiveTab('video')} 
                      style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'video' ? '#b45309' : '#fef3c7', color: activeTab === 'video' ? '#fff' : '#b45309', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
                    >
                      🎥 Video
                    </button>
                  </div>

                  <span style={{ color: '#b45309', fontSize: '0.95rem', fontWeight: 700, background: '#fef3c7', padding: '8px 16px', borderRadius: '8px' }}>
                    Markah Penuh: {maxPres}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 20px 0', color: '#854d0e', fontSize: '1.2rem', fontWeight: 800 }}>
                  {activeTab === 'bersemuka' ? '👥 Penilaian Individu Pembentangan (Bersemuka)' : '🎬 Penilaian Individu Pembentangan (Video)'}
                </h3>

                {/* KOTAK PAUTAN VIDEO (GAYA STATIK/STICKY) */}
                {activeTab === 'video' && (
                  <div style={{ 
                    position: 'sticky', 
                    top: '20px', 
                    zIndex: 50, 
                    background: '#fff', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: '2px solid #f59e0b', 
                    marginBottom: '30px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#b45309', fontWeight: 700 }}>🎥 Video Pembentangan Pelajar</h4>
                      {rawVideoUrl && (
                        <a href={rawVideoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}>
                          Buka di Tab Baru ↗
                        </a>
                      )}
                    </div>
                    
                    {embedVideoUrl ? (
                      <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', background: '#1e293b' }}>
                        <iframe 
                          src={embedVideoUrl} 
                          width="100%" 
                          height="100%" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '12px', color: '#b45309', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', border: '1px dashed #fcd34d' }}>
                        ⚠️ Kumpulan pelajar ini belum memuat naik pautan video pembentangan mereka secara berasingan.
                      </div>
                    )}
                  </div>
                )}

                {/* SENARAI MARKAH PELAJAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {groupData.group_members?.map((member: any) => {
                    const marks = individualMarks[member.id] || {};
                    const total = calculateTotal(marks);

                    return (
                      <div key={member.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fde047', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>{member.student_name}</h4>
                          {total > 0 && <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>✓ Dinilai ({total} M)</span>}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                          {[{ key: 'pengenalan', label: 'Pengenalan' }, { key: 'interaksi', label: 'Interaksi' }, { key: 'kreativiti', label: 'Kreativiti' }, { key: 'soal_jawab', label: 'Soal Jawab' }, { key: 'sahsiah', label: 'Sahsiah Diri' }].map(criteria => (
                            <div key={criteria.key}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: '#854d0e', fontWeight: 700, marginBottom: '6px' }}>{criteria.label} (/{maxCriteria})</label>
                              <input 
                                type="number" 
                                min="0" 
                                max={maxCriteria} 
                                step="0.5" 
                                value={marks[criteria.key] ?? ''} 
                                onChange={(e) => handleMarkChange(member.id, criteria.key, e.target.value)} 
                                style={{ width: '100%', padding: '10px', background: '#fef08a', border: '1px solid #fde047', borderRadius: '8px', textAlign: 'center', fontSize: '1.1rem', color: '#854d0e', fontWeight: 700, outline: 'none' }} 
                              />
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <input type="text" placeholder={`Komen prestasi pelajar ini...`} value={individualComments[member.id] || ''} onChange={(e) => setIndividualComments(prev => ({...prev, [member.id]: e.target.value}))} style={{ flex: 1, minWidth: '250px', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }} />
                          <div style={{ background: '#d1fae5', padding: '14px 20px', borderRadius: '8px', color: '#064e3b', fontWeight: 700, fontSize: '1rem', border: '1px solid #a7f3d0' }}>Jumlah: {total} / {maxPres}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'right' }}>
              <button onClick={saveEvaluation} disabled={isSaving} style={{ background: '#064e3b', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(6,78,59,0.2)' }}>
                {isSaving ? '⏳ Menyimpan...' : '💾 Simpan & Rekod Markah'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}