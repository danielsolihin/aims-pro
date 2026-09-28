'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ==========================================
// KOMPONEN TOOLBAR KUSTOM (GAYA MS WORD PENUH)
// ==========================================
const Toolbar = ({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) => {
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const btnStyle = {
    padding: '6px 12px',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#334155',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.1s'
  };

  return (
    <div style={{ display: 'flex', gap: '6px', padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
      
      <button type="button" onClick={() => formatText('undo')} style={btnStyle} title="Undo (Kembali)">↩️</button>
      <button type="button" onClick={() => formatText('redo')} style={btnStyle} title="Redo (Ke Depan)">↪️</button>
      
      <div style={{ width: '2px', height: '24px', background: '#cbd5e1', margin: '0 6px' }}></div>

      <button type="button" onClick={() => formatText('bold')} style={{ ...btnStyle, fontWeight: 700, color: '#0f172a' }} title="Bold (Tebal)">B</button>
      <button type="button" onClick={() => formatText('italic')} style={{ ...btnStyle, fontStyle: 'italic', fontFamily: 'serif' }} title="Italic (Condong)">I</button>
      <button type="button" onClick={() => formatText('underline')} style={{ ...btnStyle, textDecoration: 'underline' }} title="Underline (Garis Bawah)">U</button>
      <button type="button" onClick={() => formatText('strikethrough')} style={{ ...btnStyle, textDecoration: 'line-through' }} title="Strikethrough (Potong)">S</button>
      
      <div style={{ width: '2px', height: '24px', background: '#cbd5e1', margin: '0 6px' }}></div>
      
      <select onChange={(e) => formatText('formatBlock', e.target.value)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', outline: 'none', color: '#334155', fontWeight: 500 }}>
        <option value="P">Perenggan (Biasa)</option>
        <option value="H1">Tajuk Besar (H1)</option>
        <option value="H2">Tajuk Sederhana (H2)</option>
        <option value="H3">Tajuk Kecil (H3)</option>
      </select>

      <div style={{ width: '2px', height: '24px', background: '#cbd5e1', margin: '0 6px' }}></div>

      <button type="button" onClick={() => formatText('justifyLeft')} style={btnStyle} title="Susun Kiri">⬅️</button>
      <button type="button" onClick={() => formatText('justifyCenter')} style={btnStyle} title="Susun Tengah">↔️</button>
      <button type="button" onClick={() => formatText('justifyRight')} style={btnStyle} title="Susun Kanan">➡️</button>
      <button type="button" onClick={() => formatText('justifyFull')} style={btnStyle} title="Rata Kiri & Kanan (Justify)">📄</button>

      <div style={{ width: '2px', height: '24px', background: '#cbd5e1', margin: '0 6px' }}></div>

      <button type="button" onClick={() => formatText('insertOrderedList')} style={btnStyle} title="Senarai Bernombor">1. 2.</button>
      <button type="button" onClick={() => formatText('insertUnorderedList')} style={btnStyle} title="Senarai Titik (Bullet)">•</button>
      <button type="button" onClick={() => formatText('outdent')} style={btnStyle} title="Kurangkan Inden (Ke Kiri)">⇤</button>
      <button type="button" onClick={() => formatText('indent')} style={btnStyle} title="Tambahkan Inden (Ke Kanan)">⇥</button>
    </div>
  );
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
function MuatNaikContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('group_id');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [assignmentInfo, setAssignmentInfo] = useState<any>(null);
  
  // STATE AHLI KUMPULAN (UNTUK FUNGSI TAMBAH/EDIT/PADAM)
  const [members, setMembers] = useState<any[]>([]);
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const [textContent, setTextContent] = useState('');
  const [textReferences, setTextReferences] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const refEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) {
      alert("Sila pilih kumpulan terlebih dahulu dari Dashboard.");
      router.push('/pelajar/dashboard');
      return;
    }
    fetchGroupAndAssignment();
  }, [groupId]);

  const fetchGroupAndAssignment = async () => {
    try {
      const { data: groupData, error: groupErr } = await supabase
        .from('student_groups')
        .select('*, assignments(*), group_members(*)')
        .eq('id', groupId)
        .single();

      if (groupErr) throw groupErr;

      setGroupInfo(groupData);
      setAssignmentInfo(groupData.assignments);
      
      // Simpan senarai ahli ke dalam State
      setMembers(groupData.group_members || []);

      const { data: latestSub } = await supabase
        .from('paper_submissions')
        .select('*')
        .eq('group_id', groupId)
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (latestSub) {
        setSubmissionId(latestSub.id); 
        setTextContent(latestSub.text_content || '');
        setTextReferences(latestSub.text_references || '');
        setVideoUrl(latestSub.video_link || latestSub.video_url || ''); 
        
        if (editorRef.current) editorRef.current.innerHTML = latestSub.text_content || '';
        if (refEditorRef.current) refEditorRef.current.innerHTML = latestSub.text_references || '';
      }
    } catch (err: any) {
      console.error(err);
      alert("Gagal menarik data tugasan.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIK PENGURUSAN AHLI (TAMBAH / EDIT / PADAM)
  // ==========================================
  const addMember = () => {
    setMembers([...members, { student_name: '', matrix_no: '' }]);
  };

  const updateMember = (index: number, field: string, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const removeMember = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleSaveMembers = async () => {
    if (members.length === 0) {
      alert("Kumpulan mesti mempunyai sekurang-kurangnya seorang ahli.");
      return;
    }
    if (members.some(m => !m.student_name.trim() || !m.matrix_no.trim())) {
      alert("Sila lengkapkan nama dan no. matrik untuk semua ahli.");
      return;
    }

    setIsSavingMembers(true);
    try {
      // 1. Dapatkan senarai ID ahli yang sedia ada dalam DB
      const { data: dbMembers } = await supabase.from('group_members').select('id').eq('group_id', groupId);
      const dbIds = dbMembers?.map(m => m.id) || [];
      
      // 2. Cari ID yang telah dipadam oleh pengguna
      const currentIds = members.filter(m => m.id).map(m => m.id);
      const idsToDelete = dbIds.filter(id => !currentIds.includes(id));

      if (idsToDelete.length > 0) {
        await supabase.from('group_members').delete().in('id', idsToDelete);
      }

      // 3. Kemaskini ahli sedia ada & Masukkan ahli baharu
      for (const m of members) {
        const payload = {
          group_id: groupId,
          student_name: m.student_name.toUpperCase(),
          matrix_no: m.matrix_no.toUpperCase()
        };

        if (m.id) {
          await supabase.from('group_members').update(payload).eq('id', m.id);
        } else {
          await supabase.from('group_members').insert([payload]);
        }
      }

      alert("✅ Senarai ahli berjaya dikemaskini!");
      setIsEditingMembers(false);
      fetchGroupAndAssignment(); // Muat semula senarai ahli dari pangkalan data
    } catch (err: any) {
      alert("Ralat mengemaskini ahli: " + err.message);
    } finally {
      setIsSavingMembers(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const detectArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

  // ==========================================
  // FUNGSI HANTAR & KEMASKINI PINTAR (UPSERT)
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Halang pengguna submit jika sedang kemaskini ahli (untuk elak ralat data tak simpan)
    if (isEditingMembers) {
      alert("Sila klik 'Simpan Senarai Ahli' atau 'Batal' terlebih dahulu sebelum menghantar tugasan.");
      return;
    }

    const currentContent = editorRef.current?.innerHTML || '';
    const currentRefs = refEditorRef.current?.innerHTML || '';
    
    if (!currentContent.trim() || currentContent === '<br>') {
      alert('Sila isikan kandungan kertas kerja anda sebelum menghantar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalVideoUrl = videoUrl.trim() !== '' ? videoUrl.trim() : null;

      const payload: any = {
        group_id: groupId,
        text_title: assignmentInfo?.title || 'Tugasan Tanpa Tajuk',
        text_content: currentContent,
        text_references: currentRefs,
        pdf_url: '' // WAJIB kekal kosong sebegini untuk atasi "not-null constraint"
      };

      const sendDataToDB = async (dataPayload: any) => {
        if (submissionId) {
          const { error } = await supabase.from('paper_submissions').update(dataPayload).eq('id', submissionId);
          return error;
        } else {
          const { error } = await supabase.from('paper_submissions').insert([dataPayload]);
          return error;
        }
      };

      let dbError;
      let isVideoSaved = false;

      if (finalVideoUrl) payload.video_url = finalVideoUrl;
      dbError = await sendDataToDB(payload);

      if (dbError && dbError.message && (dbError.message.includes('video_url') || dbError.message.includes('column'))) {
        delete payload.video_url;
        if (finalVideoUrl) payload.video_link = finalVideoUrl;
        
        dbError = await sendDataToDB(payload);

        if (dbError && dbError.message && (dbError.message.includes('video_link') || dbError.message.includes('column'))) {
          delete payload.video_link;
          dbError = await sendDataToDB(payload); 
          isVideoSaved = false;
        } else if (!dbError) {
          isVideoSaved = true;
        }
      } else if (!dbError) {
        isVideoSaved = true;
      }

      if (dbError) throw dbError;

      if (finalVideoUrl && !isVideoSaved) {
        alert('✅ Teks kertas kerja BERJAYA dihantar.\n\n⚠️ TAPI AMARAN:\nPautan video TIDAK DAPAT DISIMPAN kerana kolum "video_url" BELUM DICIPTA di dalam jadual "paper_submissions" di Supabase anda.\n\nSila buka SQL Editor Supabase dan cipta kolum tersebut.');
      } else {
        alert('✅ Kertas kerja & Pautan Video berjaya dihantar / dikemaskini!');
      }
      
      router.push('/pelajar/dashboard');

    } catch (err: any) {
      console.error("Gagal menghantar:", err);
      const errorMsg = err?.message || err?.details || JSON.stringify(err);
      alert(`❌ Gagal menghantar kertas kerja.\n\nPunca Ralat: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>Memuatkan Modul...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.6rem', fontWeight: 600 }}>Muat Naik & Serahan Kertas Kerja</h1>
          <button onClick={() => router.back()} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', fontWeight: 500, color: '#334155' }}>
            Batal / Kembali
          </button>
        </div>

        <div style={{ background: '#ecfdf5', padding: '24px', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#064e3b', fontWeight: 600 }}>📌 1. Maklumat Tugasan & Kumpulan</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #d1fae5' }}>
            
            <div>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Nama Kumpulan</span>
              <div style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 500, marginTop: '2px' }}>{groupInfo?.group_name}</div>
            </div>
            
            <div>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Tarikh Serahan Terakhir</span>
              <div style={{ fontSize: '1.05rem', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>Belum Ditetapkan</div>
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Tajuk Kajian</span>
              <div style={{ fontSize: '1.05rem', color: '#0f766e', fontWeight: 500, marginTop: '2px' }}>{assignmentInfo?.title}</div>
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Pensyarah & Subjek</span>
              <div style={{ fontSize: '1.05rem', color: '#334155', fontWeight: 500, marginTop: '2px' }}>{assignmentInfo?.nama_pensyarah} — {assignmentInfo?.kod_kursus} ({assignmentInfo?.kumpulan_pelajar})</div>
            </div>

            {/* BAHAGIAN PENGURUSAN AHLI YANG BARU */}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #a7f3d0', paddingTop: '16px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Senarai Ahli & No. Matrik</span>
                {!isEditingMembers && (
                  <button type="button" onClick={() => setIsEditingMembers(true)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    ✏️ Kemaskini Ahli
                  </button>
                )}
              </div>

              {!isEditingMembers ? (
                <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px', color: '#334155', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {members.length > 0 ? (
                    members.map((m: any, i: number) => (
                      <li key={m.id || i}>
                        <span style={{ fontWeight: 500, color: '#0f172a' }}>{m.student_name}</span> 
                        <span style={{ color: '#64748b', marginLeft: '6px' }}>({m.matrix_no || 'Tiada Matrik'})</span>
                      </li>
                    ))
                  ) : (
                    <li style={{ color: '#94a3b8', fontStyle: 'italic' }}>Tiada ahli direkodkan.</li>
                  )}
                </ul>
              ) : (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  {members.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        value={m.student_name} 
                        onChange={(e) => updateMember(idx, 'student_name', e.target.value)} 
                        placeholder="Nama Ahli" 
                        style={{ flex: 2, minWidth: '150px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#0f172a' }} 
                      />
                      <input 
                        type="text" 
                        value={m.matrix_no} 
                        onChange={(e) => updateMember(idx, 'matrix_no', e.target.value)} 
                        placeholder="No Matrik" 
                        style={{ flex: 1, minWidth: '100px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#0f172a' }} 
                      />
                      <button type="button" onClick={() => removeMember(idx)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }} title="Padam Ahli">
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={addMember} style={{ background: '#e2e8f0', color: '#334155', border: '1px dashed #94a3b8', padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                      + Tambah Ahli
                    </button>
                    <button type="button" onClick={() => { setIsEditingMembers(false); fetchGroupAndAssignment(); }} style={{ background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                      Batal
                    </button>
                    <button type="button" onClick={handleSaveMembers} disabled={isSavingMembers} style={{ background: '#059669', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: isSavingMembers ? 'not-allowed' : 'pointer', flex: 2, boxShadow: '0 4px 6px rgba(5,150,105,0.2)' }}>
                      {isSavingMembers ? '⏳ Menyimpan...' : '💾 Simpan Senarai Ahli'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#f1f5f9', padding: '20px 24px', borderBottom: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 600 }}>✍️ 2. Ruangan Kertas Kerja & Video</h3>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', border: '1px solid #fde047' }}>
              <label style={{ display: 'block', fontSize: '1rem', color: '#b45309', marginBottom: '8px', fontWeight: 600 }}>🎥 Pautan Video Pembentangan (Pilihan):</label>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#d97706' }}>Jika anda perlu menghantar video pembentangan, sila letakkan pautan video (YouTube/Google Drive) di bawah.</p>
              <input 
                type="url" 
                value={videoUrl} 
                onChange={(e) => setVideoUrl(e.target.value)} 
                placeholder="Contoh: https://youtube.com/watch?v=xxxxx" 
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none', fontSize: '0.95rem', fontWeight: 400 }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', color: '#0f172a', marginBottom: '12px', fontWeight: 600 }}>
                📄 Kandungan Laporan (Teks) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ border: '2px solid #10b981', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.1)' }}>
                <Toolbar editorRef={editorRef} />
                <div 
                  ref={editorRef}
                  contentEditable
                  onPaste={handlePaste}
                  onInput={(e) => setTextContent(e.currentTarget.innerHTML)}
                  style={{ 
                    minHeight: '400px', 
                    maxHeight: '600px', 
                    overflowY: 'auto', 
                    padding: '30px', 
                    outline: 'none', 
                    fontSize: '1.05rem', 
                    lineHeight: 1.8, 
                    background: '#fff',
                    fontWeight: 400,
                    direction: detectArabic(textContent) ? 'rtl' : 'ltr', 
                    textAlign: detectArabic(textContent) ? 'right' : 'left',
                    fontFamily: detectArabic(textContent) ? 'Arial, sans-serif' : 'inherit'
                  }}
                  placeholder="Taip atau paste kandungan laporan anda di sini..."
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '1.05rem', color: '#0f172a', marginBottom: '12px', fontWeight: 600 }}>📚 Senarai Rujukan (Bibliografi):</label>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                <Toolbar editorRef={refEditorRef} />
                <div 
                  ref={refEditorRef}
                  contentEditable
                  onPaste={handlePaste}
                  onInput={(e) => setTextReferences(e.currentTarget.innerHTML)}
                  style={{ 
                    minHeight: '150px', 
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '20px', 
                    outline: 'none', 
                    fontSize: '0.95rem', 
                    lineHeight: 1.6, 
                    background: '#f8fafc',
                    fontWeight: 400,
                    direction: detectArabic(textReferences) ? 'rtl' : 'ltr',
                    textAlign: detectArabic(textReferences) ? 'right' : 'left'
                  }}
                  placeholder="Contoh: Ahmad, A. (2020). Pendidikan Islam di Malaysia..."
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting || isEditingMembers} style={{ background: (isSubmitting || isEditingMembers) ? '#94a3b8' : 'linear-gradient(to right, #064e3b, #047857)', color: '#fff', padding: '16px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: 'none', cursor: (isSubmitting || isEditingMembers) ? 'not-allowed' : 'pointer', boxShadow: '0 10px 20px rgba(6, 78, 59, 0.2)' }}>
              {isSubmitting ? '⏳ Sedang Menghantar...' : '🚀 Hantar Serahan Kertas Kerja'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default function MuatNaikTugasanPageWrapper() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuatkan halaman...</div>}>
      <MuatNaikContent />
    </Suspense>
  );
}