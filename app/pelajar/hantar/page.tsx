'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // DITAMBAH: Untuk tarik data secara automatik

function HantarTugasanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('group_id'); // Ambil ID Kumpulan dari URL

  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<any | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<any | null>(null);

  const [contentTitle, setContentTitle] = useState('');
  const [contentReferences, setContentReferences] = useState('');
  const [groupVideoUrl, setGroupVideoUrl] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ref untuk Rich Text Editor
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupAndAssignmentDetails();
    } else {
      alert("⚠️ Ralat: Sila masuk melalui Dashboard Pelajar.");
      router.push('/pelajar/dashboard');
    }
  }, [groupId]);

  // FUNGSI BARU: Tarik maklumat kumpulan, ahli dan tugasan secara automatik
  const fetchGroupAndAssignmentDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_groups')
        .select('*, assignments(*), group_members(*)')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      
      setSelectedGroupId(data.id.toString());
      setSelectedGroupDetails(data);
      setAssignmentDetails(data.assignments);
      setSelectedProgram(data.assignments.program_pengajian);
      setContentTitle(data.assignments.title); // Isi tajuk automatik ke dalam ruangan editor

    } catch (e: any) { 
      console.error(e);
      alert("Maklumat kumpulan tidak ditemui.");
      router.push('/pelajar/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const isExpired = assignmentDetails?.due_date ? new Date().setHours(0,0,0,0) > new Date(assignmentDetails.due_date).setHours(23,59,59,999) : false;

  // -------------------------------------------------------------
  // FUNGSI RICH TEXT EDITOR (MS WORD TOOLBAR SIMULATION)
  // -------------------------------------------------------------
  const execCmd = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired || !selectedGroupId) return;
    
    // Tarik kandungan HTML dari Editor
    const finalContentBody = editorRef.current?.innerHTML || '';

    if (!finalContentBody.trim() || finalContentBody === '<br>' || !contentReferences.trim()) {
      setErrorMsg("Sila lengkapkan kandungan kertas kerja dan senarai rujukan.");
      return;
    }

    if (!groupVideoUrl.trim()) {
      setErrorMsg("Sila masukkan pautan video pembentangan kumpulan.");
      return;
    }

    setIsSubmitting(true); setErrorMsg(null); setStatusMsg(null);

    const memberVideosPayload = selectedGroupDetails?.group_members?.map((m: any) => ({
      member_id: m.id,
      video_url: groupVideoUrl
    })) || [];

    const formData = new FormData();
    formData.append('group_id', selectedGroupId);
    formData.append('program', selectedProgram || 'N/A');
    formData.append('text_title', contentTitle);
    formData.append('text_content', finalContentBody); // Hantar HTML format
    formData.append('text_references', contentReferences);
    formData.append('member_videos', JSON.stringify(memberVideosPayload));
    formData.append('submission_type', 'text_form');

    try {
      const res = await fetch('/api/pelajar/hantar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal muat naik tugasan.');
      
      setStatusMsg(`🎉 ${data.message} Sistem akan kembali ke halaman utama secara automatik...`);
      setTimeout(() => { router.push('/'); }, 2500);

    } catch (err: any) { 
      setErrorMsg(err.message); 
      setIsSubmitting(false); 
    } 
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: '50px' }}>⏳ Memuat turun maklumat tugasan anda...</div>;
  if (!selectedGroupDetails || !assignmentDetails) return null;

  return (
    <div style={{ maxWidth: '960px', margin: '30px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      {/* CSS KHAS UNTUK BUTANG TOOLBAR EDITOR */}
      <style dangerouslySetInnerHTML={{__html: `
        .toolbar-btn {
          background: transparent; border: 1px solid transparent; border-radius: 4px; 
          padding: 6px 10px; cursor: pointer; color: #334155; font-size: 0.95rem; 
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .toolbar-btn:hover { background: #e2e8f0; border: 1px solid #cbd5e1; color: #0f172a; }
        .toolbar-divider { width: 1px; background: #cbd5e1; margin: 0 6px; }
        .editor-container a { color: #2563eb; text-decoration: underline; }
        .editor-container ul, .editor-container ol { padding-left: 20px; }
      `}} />

      <header style={{ marginBottom: '24px', borderBottom: '2px solid #065f46', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: '#065f46', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>📝 Penulisan & Penghantaran Tugasan</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Taip dan format kertas kerja anda secara profesional di sini.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ padding: '10px 16px', background: '#fff', color: '#0f172a', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #cbd5e1', cursor: 'pointer' }}>⬅ Kembali</button>
        </div>
      </header>

      <form onSubmit={handleSubmitUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1. MAKLUMAT TUGASAN & KUMPULAN (DIKEMAS KINI DARI DROPDOWN) */}
        <div style={{ background: '#ecfdf5', padding: '24px', borderRadius: '16px', border: '2px solid #34d399', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: '#065f46', borderBottom: '2px solid #a7f3d0', paddingBottom: '10px' }}>📌 1. Maklumat Tugasan</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>Nama Kumpulan</div>
              <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>{selectedGroupDetails.group_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>Tarikh Tutup (Dateline)</div>
              <div style={{ fontSize: '1.1rem', color: '#991b1b', fontWeight: 800 }}>
                {assignmentDetails.due_date ? new Date(assignmentDetails.due_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum Ditetapkan'}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>Tajuk Tugasan</div>
              <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>{assignmentDetails.title}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>Pensyarah & Kelas</div>
              <div style={{ fontSize: '1rem', color: '#334155', fontWeight: 600 }}>{assignmentDetails.nama_pensyarah} ({assignmentDetails.kod_kursus} - {assignmentDetails.kumpulan_pelajar})</div>
            </div>
            <div style={{ gridColumn: '1 / -1', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700, marginBottom: '8px' }}>👥 Senarai Ahli Kumpulan</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontWeight: 600 }}>
                {selectedGroupDetails.group_members?.map((m: any, idx: number) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{m.student_name} ({m.matrix_no})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {isExpired && (
          <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', fontWeight: 700 }}>
            ⚠️ Tarikh penghantaran tamat pada ({new Date(assignmentDetails.due_date).toLocaleDateString('ms-MY')}).
          </div>
        )}

        {!isExpired && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 2. EDITOR TEKS KERTAS KERJA BERFORMAT MS WORD */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '2px solid #065f46', overflow: 'hidden', boxShadow: '0 4px 15px rgba(6, 95, 70, 0.08)' }}>
              
              <div style={{ background: '#ecfdf5', padding: '16px 20px', borderBottom: '1px solid #a7f3d0' }}>
                <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.2rem' }}>✍️ Editor Kertas Kerja Profesional</h3>
              </div>

              <div style={{ padding: '24px' }}>
                
                {/* TAJUK ASSIGNMENT */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>1. Tajuk Spesifik Kertas Kerja</label>
                  <input 
                    type="text" 
                    required 
                    value={contentTitle} 
                    onChange={(e) => setContentTitle(e.target.value)} 
                    placeholder="Masukkan tajuk penuh kajian..." 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }} 
                  />
                </div>

                {/* KANDUNGAN ASSIGNMENT BERSERTA BAR MENU (RIBBON) */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>
                    2. Kandungan Utama (Pendahuluan, Perbincangan & Rumusan)
                  </label>
                  
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                    
                    {/* BAR MENU TOOLBAR */}
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderBottom: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                      
                      {/* Font Styles */}
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('bold')} title="Bold"><b>B</b></button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('italic')} title="Italic"><i>I</i></button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('underline')} title="Underline"><u>U</u></button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('strikeThrough')} title="Strikethrough"><s>S</s></button>
                      
                      <div className="toolbar-divider"></div>

                      {/* Headings & Size */}
                      <select onChange={(e) => execCmd('formatBlock', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                        <option value="P">Teks Biasa</option>
                        <option value="H1">Tajuk Besar (H1)</option>
                        <option value="H2">Tajuk Sederhana (H2)</option>
                        <option value="H3">Tajuk Kecil (H3)</option>
                      </select>
                      <select onChange={(e) => execCmd('fontSize', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                        <option value="3">Saiz Biasa</option>
                        <option value="1">Kecil</option>
                        <option value="5">Besar</option>
                        <option value="7">Sangat Besar</option>
                      </select>

                      <div className="toolbar-divider"></div>

                      {/* Colors */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }} title="Warna Teks">
                        <span style={{ fontWeight: 800, color: '#dc2626' }}>A</span>
                        <input type="color" onChange={(e) => execCmd('foreColor', e.target.value)} style={{ padding: 0, width: '20px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }} title="Warna Latar (Highlight)">
                        <span style={{ background: '#fef08a', padding: '0 2px' }}>A</span>
                        <input type="color" onChange={(e) => execCmd('hiliteColor', e.target.value)} style={{ padding: 0, width: '20px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }} />
                      </label>

                      <div className="toolbar-divider"></div>

                      {/* Lists & Indent */}
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('insertUnorderedList')} title="Bullet List">• Senarai</button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('insertOrderedList')} title="Numbered List">1. Nombor</button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('outdent')} title="Kurangkan Inden">⬅️</button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('indent')} title="Tambah Inden">➡️</button>

                      <div className="toolbar-divider"></div>

                      {/* Alignment */}
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('justifyLeft')} title="Align Left">⬚ Kiri</button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('justifyCenter')} title="Align Center">⬚ Tengah</button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('justifyRight')} title="Align Right">Kanan ⬚</button>
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('justifyFull')} title="Justify">≡ Sama Rata</button>
                      
                      <div className="toolbar-divider"></div>
                      
                      {/* Clear Formatting */}
                      <button type="button" className="toolbar-btn" onClick={() => execCmd('removeFormat')} title="Buang Format">🧹 Buang Format</button>
                    </div>

                    {/* KAWASAN MENAIP (CONTENT EDITABLE) */}
                    <div 
                      ref={editorRef}
                      contentEditable={true}
                      className="editor-container"
                      suppressContentEditableWarning={true}
                      style={{ 
                        width: '100%', minHeight: '350px', padding: '20px', 
                        background: '#fcfcfc', fontSize: '1rem', lineHeight: 1.8, 
                        fontFamily: 'Georgia, serif', outline: 'none', overflowY: 'auto'
                      }}
                      onFocus={(e) => {
                        if (e.currentTarget.innerHTML === '<p><br></p>' || e.currentTarget.innerHTML === '') {
                          e.currentTarget.innerHTML = '';
                        }
                      }}
                    >
                      <p>Mulakan penulisan anda di sini...</p>
                    </div>
                  </div>
                </div>

                {/* 3. SUMBER RUJUKAN */}
                <div>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>3. Senarai Rujukan & Kitab</label>
                  <textarea 
                    required 
                    rows={4}
                    value={contentReferences} 
                    onChange={(e) => setContentReferences(e.target.value)} 
                    placeholder="1. Al-Zuhayli, Wahbah. (2002). Al-Fiqh al-Islami wa Adillatuh...&#10;2. Jurnal Muamalat..." 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', lineHeight: 1.6 }} 
                  />
                </div>

              </div>
            </div>
            
            {/* 3. PAUTAN VIDEO PEMBENTANGAN */}
            <div style={{ background: '#fffbe3', border: '1px solid #fde047', padding: '24px', borderRadius: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#854d0e', fontSize: '1.1rem' }}>📹 Pautan Video Pembentangan Kumpulan</h3>
              <p style={{ fontSize: '0.85rem', color: '#a16207', marginBottom: '16px', lineHeight: 1.5 }}>
                Sila masukkan <strong>satu (1) pautan video YouTube</strong> sahaja bagi wakil kumpulan. Video ini akan dinilai secara individu oleh pensyarah untuk setiap ahli.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#713f12' }}>Pautan Video YouTube:</label>
                <input 
                  type="url" 
                  required 
                  value={groupVideoUrl} 
                  onChange={(e) => setGroupVideoUrl(e.target.value)} 
                  placeholder="Contoh: https://www.youtube.com/watch?v=..." 
                  style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '2px solid #fde047', fontSize: '0.95rem' }} 
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: '#713f12', background: '#fefce8', padding: '12px', borderRadius: '8px', border: '1px dashed #fde047' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>👥 Ahli kumpulan yang terdaftar:</strong> 
                {selectedGroupDetails.group_members?.map((m: any) => `${m.student_name} (${m.matrix_no})`).join(', ') || 'Tiada rekod ahli.'}
              </div>
            </div>

          </div>
        )}

        {errorMsg && <div style={{ color: '#991b1b', background: '#fef2f2', padding: '14px', borderRadius: '10px', fontWeight: 600, border: '1px solid #fecaca' }}>⚠️ {errorMsg}</div>}
        
        {statusMsg && (
          <div style={{ color: '#065f46', background: '#ecfdf5', padding: '16px', borderRadius: '10px', fontWeight: 800, border: '1px solid #a7f3d0', textAlign: 'center', fontSize: '1.1rem' }}>
            {statusMsg}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting || !selectedGroupId || isExpired || !!statusMsg} 
          style={{ padding: '18px', background: isExpired ? '#cbd5e1' : isSubmitting || !!statusMsg ? '#94a3b8' : '#065f46', color: isExpired ? '#475569' : '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1.1rem', cursor: (isExpired || isSubmitting || !!statusMsg) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(6,95,70,0.2)', transition: 'background 0.2s' }}>
          {isSubmitting ? 'Sedang Menyimpan Rekod & Menganalisis Teks (Sila Tunggu)...' : !!statusMsg ? 'Penghantaran Selesai ✓' : '🚀 Hantar Tugasan Teks & Video'}
        </button>
      </form>
    </div>
  );
}

// Wrapper Suspense diperlukan oleh Next.js untuk penggunaan useSearchParams
export default function HantarTugasanPage() {
  return (
    <Suspense fallback={<div style={{ padding: '50px', textAlign: 'center' }}>Memuatkan borang editor...</div>}>
      <HantarTugasanContent />
    </Suspense>
  );
}