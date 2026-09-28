'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const KATEGORI_RUBRIK = {
  'Pendahuluan': { color: '#dbeafe', border: '#2563eb', label: 'Pendahuluan' },
  'Isi Kandungan': { color: '#dcfce7', border: '#16a34a', label: 'Isi Kandungan' },
  'Perbincangan': { color: '#ffedd5', border: '#ea580c', label: 'Perbincangan' },
  'Rumusan': { color: '#ffe4e6', border: '#e11d48', label: 'Rumusan' },
  'Rujukan': { color: '#f3e8ff', border: '#9333ea', label: 'Rujukan' }
};

// ==========================================
// KOMPONEN TOOLBAR KUSTOM (GAYA MS WORD)
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
    <div className="no-print" style={{ display: 'flex', gap: '6px', padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
      
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

export default function AnalisisTeksManualPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: groupId } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [submissionData, setSubmissionData] = useState<any>(null);
  const [metaData, setMetaData] = useState<any>({});
  const [marks, setMarks] = useState<any[]>([]);
  
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  
  const paperRef = useRef<HTMLDivElement>(null);
  const cleanHtmlRef = useRef<string>(''); 
  
  const [popup, setPopup] = useState<{ show: boolean, x: number, y: number, range: Range | null }>({ show: false, x: 0, y: 0, range: null });
  const [editModal, setEditModal] = useState<{ show: boolean, id: string | null }>({ show: false, id: null });
  const [manualForm, setManualForm] = useState({ category: 'Pendahuluan', score: '', comment: '' });

  useEffect(() => {
    if (groupId) fetchPaper();
  }, [groupId]);

  // ==========================================
  // ENJIN RENDER TEKS
  // ==========================================
  const renderMarkedPaper = (baseHtml: string, currentMarks: any[]) => {
    if (!paperRef.current) return;
    let html = baseHtml;
    const sortedMarks = [...currentMarks].sort((a, b) => b.text.length - a.text.length);

    sortedMarks.forEach((m) => {
      if (!m.text) return;
      const catObj = KATEGORI_RUBRIK[m.category as keyof typeof KATEGORI_RUBRIK] || KATEGORI_RUBRIK['Pendahuluan'];
      const scoreNum = Number(m.score) || 0;
      const scoreStr = scoreNum >= 0 ? `+${scoreNum}` : `${scoreNum}`;

      const tagBadge = `<sup class="mark-badge" style="display: inline-block; background-color: ${catObj.border}; color: #ffffff; font-size: 0.68rem; font-weight: 700; padding: 2px 5px; border-radius: 4px; margin-left: 3px; vertical-align: super; line-height: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; pointer-events: none;">${m.category} (${scoreStr})</sup>`;

      const escapedText = m.text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '(?:\\s|&nbsp;|<[^>]*>)+');
      
      const isManual = m.type === 'Manual';
      const isArabic = /[\u0600-\u06FF]/.test(escapedText);
      const bound = (isManual || isArabic) ? '' : '\\b';

      try {
        const regex = new RegExp(`(?<!<[^>]*)${bound}(${escapedText})${bound}(?![^<]*>)`, 'i');
        const styledSpan = `<span id="mark-${m.id}" class="clickable-mark" style="cursor: pointer; text-decoration: underline; text-decoration-color: ${catObj.border}; text-decoration-thickness: 2px; background-color: ${catObj.color}; padding: 2px 4px; border-radius: 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">$1${tagBadge}</span>`;
        html = html.replace(regex, styledSpan);
      } catch (e) {
        console.error("Gagal mewarnakan teks:", m.text);
      }
    });

    paperRef.current.innerHTML = html;
  };

  const fetchPaper = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('paper_submissions')
        .select('*, student_groups(*, assignments(*), group_members(*))')
        .eq('group_id', groupId)
        .order('id', { ascending: false });

      if (error) throw error;
      
      const validSubmission = data?.find(s => s.text_content && s.text_content.trim() !== '') || (data && data.length > 0 ? data[0] : null);
      
      if (validSubmission) {
        setSubmissionData(validSubmission);

        const group = validSubmission.student_groups;
        const assignment = group?.assignments;
        const members = group?.group_members || [];

        setMetaData({
          kumpulanPelajar: assignment?.kumpulan_pelajar || 'N/A',
          kodKursus: assignment?.kod_kursus || 'N/A',
          namaKursus: assignment?.nama_kursus || assignment?.title || '',
          tajuk: validSubmission.text_title || assignment?.title || 'Tajuk Kertas Kerja',
          members: members,
          maxPaperMark: assignment?.markah_kertas_kerja || 30
        });

        const textContent = validSubmission.text_content || '';
        const textRef = validSubmission.text_references || '';
        
        const isContentArabic = /[\u0600-\u06FF]/.test(textContent);
        const rtlStyle = isContentArabic ? 'direction: rtl; text-align: right;' : 'direction: ltr; text-align: left;';

        const contentHtml = textContent ? `<div id="paper-body" style="${rtlStyle}">${textContent}</div>` : '';
        const refHtml = textRef ? `<div id="paper-ref" style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; ${rtlStyle}"><h3 style="font-size: 1.1rem; color: #064e3b; margin-bottom: 12px; font-weight: 700;">📚 Senarai Rujukan:</h3><div style="font-family: inherit; white-space: pre-wrap; font-size: 0.95rem; color: #475569; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.6;">${textRef}</div></div>` : '';

        const cleanHtml = (contentHtml + refHtml).trim() || '<p style="text-align: center;">Kertas kerja kosong.</p>';
        cleanHtmlRef.current = cleanHtml;

        let savedMarks = [];
        if (validSubmission.ai_analysis && typeof validSubmission.ai_analysis === 'object') {
          savedMarks = validSubmission.ai_analysis.marks_data || [];
        }

        if (savedMarks.length > 0) {
          setMarks(savedMarks);
          setTimeout(() => renderMarkedPaper(cleanHtml, savedMarks), 100);
        } else {
          if (paperRef.current) paperRef.current.innerHTML = cleanHtml;
        }
      }
    } catch (e: any) {
      console.error("Gagal menarik data:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToDatabase = async () => {
    if (!submissionData) return;
    setIsSaving(true);
    try {
      const { data: latestSub } = await supabase.from('paper_submissions').select('ai_analysis').eq('id', submissionData.id).single();
      const existingAi = latestSub?.ai_analysis || {};
      
      const payload = { ...existingAi, marks_data: marks, marked_html: paperRef.current?.innerHTML || '' };

      const { error } = await supabase.from('paper_submissions').update({ ai_analysis: payload }).eq('id', submissionData.id);
      if (error) throw error;
      
      await supabase.from('paper_submissions').update({ text_content: cleanHtmlRef.current }).eq('id', submissionData.id);

      setHasUnsavedChanges(false);
      alert("✅ Format teks, markah dan tandaan berjaya disimpan!");
    } catch (e: any) {
      alert("Gagal menyimpan markah.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInput = () => {
    if (!paperRef.current) return;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = paperRef.current.innerHTML;

    tempDiv.querySelectorAll('.mark-badge').forEach(badge => badge.remove());
    tempDiv.querySelectorAll('.clickable-mark').forEach(span => {
      const frag = document.createDocumentFragment();
      while (span.firstChild) {
        frag.appendChild(span.firstChild);
      }
      span.replaceWith(frag);
    });

    cleanHtmlRef.current = tempDiv.innerHTML;
    setHasUnsavedChanges(true);
  };

  const runAIAnalysis = () => {
    if (!paperRef.current || !submissionData || marks.length > 0) {
      alert("Sila Reset Markah dahulu sebelum menjalankan analisis AI semula.");
      return;
    }
    
    setIsAIAnalyzing(true);
    
    setTimeout(() => {
      const maxMarkLimit = Number(metaData.maxPaperMark || 30);
      const assignmentTitle = submissionData.student_groups?.assignments?.title || submissionData.text_title || "";
      
      const stopWords = ['dan', 'di', 'ke', 'dari', 'yang', 'ini', 'itu', 'untuk', 'dengan', 'dalam', 'isu', 'cabaran', 'kepada', 'bagi', 'pada', 'mereka', 'oleh', 'and', 'in', 'to', 'from', 'the', 'this', 'that', 'for', 'with', 'on', 'of', 'a', 'an', 'is', 'are', 'issues', 'challenges', 'by', 'as', 'at', 'و', 'في', 'إلى', 'من', 'أن', 'هذا', 'ذلك', 'ل', 'مع', 'على', 'ال', 'قضايا', 'تحديات', 'عن', 'ب', 'ما', 'لا'];

      const baseKeywords = assignmentTitle.toLowerCase().split(/\s+/).filter((w: string) => !stopWords.includes(w) && w.length > 2);

      const synonymDictionary: Record<string, string[]> = {
        'remaja': ['belia', 'anak muda', 'generasi muda', 'pemuda', 'youth', 'teenager', 'adolescent', 'مراهق', 'شباب', 'الشباب', 'الشباب'],
        'pendidikan': ['pembelajaran', 'ilmu', 'tarbiah', 'pengajian', 'sekolah', 'akademik', 'education', 'learning', 'school', 'تعليم', 'تربية', 'التعليم', 'علم'],
        'pembangunan': ['pembentukan', 'kemajuan', 'peningkatan', 'perkembangan', 'development', 'growth', 'progress', 'تنمية', 'تطوير', 'التنمية'],
        'muslim': ['islam', 'mukmin', 'agama', 'islamic', 'religion', 'مسلم', 'إسلامي', 'الإسلام', 'دين', 'المسلمين'],
        'identiti': ['jati diri', 'kualiti diri', 'sahsiah', 'akhlak', 'identity', 'personality', 'character', 'هوية', 'شخصية'],
        'analisis': ['kajian', 'semakan', 'penelitian', 'analysis', 'study', 'review', 'تحليل', 'دراسة', 'بحث'],
        'sains': ['ilmu alam', 'teknologi', 'science', 'technology', 'علوم', 'تكنولوجيا', 'علم'],
        'peribahasa': ['simpulan bahasa', 'pepatah', 'proverb', 'idiom', 'مثل', 'أمثال', 'حكمة'],
        'masyarakat': ['komuniti', 'awam', 'rakyat', 'community', 'society', 'public', 'مجتمع', 'جمهور'],
        'negara': ['nasional', 'kerajaan', 'country', 'nation', 'government', 'دولة', 'وطن', 'حكومة', 'ماليزيا', 'malaysia'],
        'kesan': ['impak', 'akibat', 'pengaruh', 'effect', 'impact', 'consequence', 'أثر', 'تأثير', 'نتيجة'],
        'punca': ['sebab', 'faktor', 'asal', 'cause', 'factor', 'reason', 'سبب', 'عامل', 'مصدر']
      };

      let allowedKeywords: { word: string, source: string, type: 'exact' | 'synonym' }[] = [];
      
      baseKeywords.forEach((kw: string) => {
        allowedKeywords.push({ word: kw, source: kw, type: 'exact' });
        Object.keys(synonymDictionary).forEach(root => {
          const allTerms = [root, ...synonymDictionary[root]];
          if (allTerms.some(term => kw.includes(term) || term.includes(kw))) {
            allTerms.forEach(syn => {
              if (!allowedKeywords.find(item => item.word === syn)) allowedKeywords.push({ word: syn, source: kw, type: 'synonym' });
            });
          }
        });
      });

      if (allowedKeywords.length === 0) {
        allowedKeywords = [{ word: 'remaja', source: 'remaja', type: 'exact' }, { word: 'youth', source: 'remaja', type: 'synonym' }, { word: 'شباب', source: 'remaja', type: 'synonym' }];
      }

      const generatedMarks: any[] = [];
      let currentAiAdded = 0;
      const matchedWordsTracker = new Set<string>();

      allowedKeywords.forEach((kwItem, index) => {
        if (currentAiAdded >= maxMarkLimit) return; 
        if (matchedWordsTracker.has(kwItem.word.toLowerCase())) return; 

        const isArabic = /[\u0600-\u06FF]/.test(kwItem.word);
        
        let regexPattern = kwItem.word;
        if (isArabic) {
            const cleanWord = kwItem.word.replace(/^(ال|وال|بال|كال|ل)/, '');
            regexPattern = `(?:ال|وال|بال|كال|ل)?${cleanWord}`;
        }

        const bound = isArabic ? '' : '\\b';
        const regex = new RegExp(`(?<!<[^>]*)${bound}(${regexPattern})${bound}(?![^<]*>)`, 'i');
        const match = cleanHtmlRef.current.match(regex);
        
        if (match) {
          const matchText = match[1];
          matchedWordsTracker.add(matchText.toLowerCase()); 
          const matchIndex = cleanHtmlRef.current.indexOf(matchText);
          
          let assignedCategory = 'Isi Kandungan';
          let score = kwItem.type === 'exact' ? 2 : 1.5;
          if (index % 3 === 0) score = 1;
          
          let comment = '';

          if (currentAiAdded + score > maxMarkLimit) score = maxMarkLimit - currentAiAdded;

          if (kwItem.word.includes('rujukan') || kwItem.word.includes('reference') || kwItem.word.includes('مرجع') || cleanHtmlRef.current.substring(matchIndex - 100, matchIndex).toLowerCase().includes('rujukan') || cleanHtmlRef.current.substring(matchIndex - 100, matchIndex).toLowerCase().includes('المراجع')) {
            assignedCategory = 'Rujukan'; comment = `Rujukan dikesan bersandarkan kata kunci "${kwItem.source}".`; score = 2;
          } else if (matchIndex < (cleanHtmlRef.current.length * 0.35)) {
            assignedCategory = 'Pendahuluan'; comment = kwItem.type === 'exact' ? `Pengenalan memfokuskan kata kunci: "${kwItem.source}".` : `Pengenalan menggunakan sinonim / terjemahan ("${kwItem.word}").`;
          } else if (matchIndex > (cleanHtmlRef.current.length * 0.75)) {
            assignedCategory = 'Rumusan'; comment = `Menyimpulkan idea dengan mengikat kembali kepada fokus: "${kwItem.source}".`;
          } else {
            if (index % 2 === 0) { assignedCategory = 'Perbincangan'; comment = `Huraian kritis dikesan terhadap fokus "${kwItem.source}".`; } 
            else { assignedCategory = 'Isi Kandungan'; comment = `Pemaparan fakta sokongan relevan dengan topik "${kwItem.source}".`; }
          }

          generatedMarks.push({ id: `ai-${Date.now()}-${index}`, type: 'AI', category: assignedCategory, score: score, comment: comment, text: matchText });
          currentAiAdded += score;
        }
      });

      if (currentAiAdded < maxMarkLimit && submissionData.text_references && submissionData.text_references.length > 5) {
        let refScore = 2;
        if (currentAiAdded + refScore > maxMarkLimit) refScore = maxMarkLimit - currentAiAdded;
        generatedMarks.push({ id: `ai-ref-${Date.now()}`, type: 'AI', category: 'Rujukan', score: refScore, comment: 'Senarai rujukan dikesan dan disusun dengan kemas.', text: 'Rujukan/المراجع' });
      }

      setMarks(generatedMarks);
      renderMarkedPaper(cleanHtmlRef.current, generatedMarks);
      setIsAIAnalyzing(false);
      setHasUnsavedChanges(true);
    }, 1200); 
  };

  const resetMarks = () => {
    const confirmReset = window.confirm("Adakah anda pasti untuk RESET memadam semua markah?");
    if (confirmReset) {
      setMarks([]);
      if (paperRef.current) paperRef.current.innerHTML = cleanHtmlRef.current;
      setHasUnsavedChanges(true); 
    }
  };

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length >= 2 && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (paperRef.current?.contains(range.commonAncestorContainer)) setPopup({ show: true, x: e.pageX, y: e.pageY + 15, range: range });
    } else {
      setPopup(prev => ({ ...prev, show: false }));
    }
  };

  const handlePaperClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const spanElement = target.closest('span[id^="mark-"]');
    if (spanElement) {
      const markToEdit = marks.find(m => m.id === spanElement.id.replace('mark-', ''));
      if (markToEdit) openEditModal(markToEdit, e);
    }
  };

  const saveManualMark = () => {
    if (!popup.range) return;
    const selectedText = popup.range.toString().trim();
    if (!selectedText) return;
    const scoreNum = parseFloat(manualForm.score) || 0;
    const newMark = { id: `manual-${Date.now()}`, type: 'Manual', category: manualForm.category, score: scoreNum, comment: manualForm.comment || 'Penandaan Manual Pensyarah', text: selectedText };
    const updatedMarks = [newMark, ...marks];
    setMarks(updatedMarks);
    renderMarkedPaper(cleanHtmlRef.current, updatedMarks);
    setPopup({ show: false, x: 0, y: 0, range: null });
    setManualForm({ category: 'Pendahuluan', score: '', comment: '' });
    window.getSelection()?.removeAllRanges();
    setHasUnsavedChanges(true);
  };

  const deleteMark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedMarks = marks.filter(m => m.id !== id);
    setMarks(updatedMarks);
    renderMarkedPaper(cleanHtmlRef.current, updatedMarks);
    setEditModal({ show: false, id: null });
    setHasUnsavedChanges(true);
  };

  const openEditModal = (mark: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setManualForm({ category: mark.category, score: String(mark.score), comment: mark.comment });
    setEditModal({ show: true, id: mark.id });
  };

  const saveEditedMark = () => {
    if (!editModal.id) return;
    const scoreNum = parseFloat(manualForm.score) || 0;
    const updatedMarks = marks.map(m => m.id === editModal.id ? { ...m, category: manualForm.category, score: scoreNum, comment: manualForm.comment } : m );
    setMarks(updatedMarks);
    renderMarkedPaper(cleanHtmlRef.current, updatedMarks);
    setEditModal({ show: false, id: null });
    setManualForm({ category: 'Pendahuluan', score: '', comment: '' });
    setHasUnsavedChanges(true);
  };

  const calculateTotalScore = () => parseFloat((marks.reduce((sum, m) => sum + (Number(m.score) || 0), 0)).toFixed(1)); 
  const formatStudentName = (name: string) => name ? name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Pelajar';

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#064e3b', fontSize: '1.1rem', fontWeight: 500 }}>⏳ Memuatkan Dokumen...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: isFullscreen ? '0' : '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .clickable-mark { transition: all 0.2s ease-in-out; display: inline-block; }
        .clickable-mark:hover { filter: brightness(0.9) contrast(1.2); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transform: translateY(-2px); outline: 2px dashed #475569; z-index: 10; position: relative; }
        @media print { .no-print { display: none !important; } body { background: #fff !important; padding: 0 !important; } .print-full-width { width: 100% !important; max-width: 100% !important; height: auto !important; border: none !important; box-shadow: none !important; } .paper-box { height: auto !important; overflow: visible !important; border: none !important; padding: 0 40px !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
      `}} />

      {/* TOP HEADER MENU (Sembunyi ketika Fullscreen) */}
      {!isFullscreen && (
        <div className="no-print" style={{ maxWidth: '1400px', margin: '0 auto', background: '#fff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', flexWrap: 'wrap', gap: '12px' }}>
          <div><button onClick={() => router.back()} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', color: '#475569', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginRight: '16px' }}>← Kembali</button></div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={resetMarks} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}>🔄 Reset Markah</button>
            <button onClick={saveToDatabase} disabled={isSaving || !hasUnsavedChanges} style={{ background: hasUnsavedChanges ? '#10b981' : '#f1f5f9', color: hasUnsavedChanges ? '#fff' : '#94a3b8', border: hasUnsavedChanges ? 'none' : '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>{isSaving ? '⏳ Menyimpan...' : hasUnsavedChanges ? '💾 Simpan Perubahan' : '✅ Telah Disimpan'}</button>
            <button onClick={() => window.print()} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>🖨️ Cetak PDF</button>
            <button onClick={runAIAnalysis} disabled={isAIAnalyzing || marks.length > 0} style={{ background: isAIAnalyzing || marks.length > 0 ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: isAIAnalyzing || marks.length > 0 ? '#94a3b8' : '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: isAIAnalyzing || marks.length > 0 ? 'not-allowed' : 'pointer' }}>{isAIAnalyzing ? '⏳ AI Sedang Menganalisis...' : marks.length > 0 ? '✅ AI Selesai (Sila Reset)' : '✨ Jalankan Analisis AI'}</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: isFullscreen ? 'none' : '1400px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* CONTAINER KERTAS KERJA UTAMA */}
        <div 
          className="print-full-width" 
          style={isFullscreen ? {
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 5000, background: '#94a3b8', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          } : {
            flex: '2', minWidth: '600px', background: '#fff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)'
          }}
        >
          {/* HEADER DOKUMEN & BUTANG PAPARAN PENUH */}
          <div className="no-print" style={{ background: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#334155', fontWeight: 600 }}>📄 Teks Kertas Kerja Pelajar</h2>
            
            {/* Butang Togol Skrin Penuh */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              style={{ background: isFullscreen ? '#ef4444' : '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
            >
              {isFullscreen ? '↙️ Tutup Paparan Penuh' : '⛶ Paparan Penuh'}
            </button>
          </div>
          
          <Toolbar editorRef={paperRef} />

          {/* Wrapper Scroll (PENTING: minHeight: 100% & height: fit-content untuk atasi isu separuh latar belakang putih) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isFullscreen ? '30px 20px' : '0', background: isFullscreen ? '#cbd5e1' : '#fff' }}>
            
            <div style={{ width: '100%', maxWidth: isFullscreen ? '900px' : 'none', background: '#fff', minHeight: '100%', height: 'fit-content', borderRadius: isFullscreen ? '12px' : '0', boxShadow: isFullscreen ? '0 10px 30px rgba(0,0,0,0.15)' : 'none', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ padding: '40px 40px 0 40px' }}>
                <div style={{ position: 'relative', marginBottom: '24px', padding: '24px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', fontFamily: 'system-ui, sans-serif' }}>
                  
                  <div style={{ position: 'absolute', top: '-20px', right: '24px', background: '#064e3b', color: '#ffffff', padding: '10px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(6,78,59,0.25)', textAlign: 'center', lineHeight: '1.25', whiteSpace: 'nowrap', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: '#a7f3d0', marginBottom: '4px', letterSpacing: '0.5px' }}>JUMLAH MARKAH</div>
                    <div>{calculateTotalScore()} / {metaData.maxPaperMark || 30} M</div> 
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', color: '#1e293b' }}>
                    <tbody>
                      <tr><td style={{ padding: '6px 0', width: '180px', fontWeight: 600, color: '#047857' }}>Kumpulan Pelajar:</td><td style={{ padding: '6px 0', fontWeight: 500, color: '#0f172a', fontSize: '1.05rem' }}>{metaData.kumpulanPelajar}</td></tr>
                      <tr><td style={{ padding: '6px 0', fontWeight: 600, color: '#047857' }}>Kod & Nama Kursus:</td><td style={{ padding: '6px 0', fontWeight: 500, color: '#334155' }}>{metaData.kodKursus} — {metaData.namaKursus}</td></tr>
                      <tr><td style={{ padding: '6px 0', fontWeight: 600, color: '#047857', verticalAlign: 'top' }}>Nama Ahli & No. Matrik:</td><td style={{ padding: '6px 0' }}>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: 1.6, fontWeight: 400 }}>
                          {metaData.members.length > 0 ? metaData.members.map((m: any, i: number) => <li key={i} style={{ whiteSpace: 'nowrap' }}>{formatStudentName(m.student_name)} <span style={{ color: '#64748b' }}>({m.matrix_no || 'Tiada'})</span></li>) : <li>Tiada rekod ahli.</li>}
                        </ul>
                      </td></tr>
                    </tbody>
                  </table>
                </div>

                <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#064e3b', marginBottom: '10px', borderBottom: '2px solid #a7f3d0', paddingBottom: '15px' }}>{metaData.tajuk}</h1>
              </div>

              <div 
                className="paper-box" 
                ref={paperRef} 
                contentEditable={true} 
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onMouseUp={handleTextSelection} 
                onClick={handlePaperClick} 
                style={{ padding: '10px 40px 60px 40px', fontSize: '1.05rem', lineHeight: 2, color: '#1e293b', fontFamily: 'Georgia, serif', outline: 'none', background: '#fff' }} 
              />
            </div>
          </div>
        </div>

        {/* PANEL MARKAH KANAN (Sembunyi ketika Fullscreen) */}
        {!isFullscreen && (
          <div className="no-print" style={{ flex: '1', minWidth: '350px', background: '#fff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#ecfdf5', padding: '20px 24px', borderBottom: '1px solid #a7f3d0' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#064e3b', fontWeight: 700 }}>📊 Panel Rincian Markah</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 500 }}>Jumlah Tandaan: {marks.length}</span>
                <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>Total Kertas Kerja: {calculateTotalScore()} / {metaData.maxPaperMark || 30} M</span> 
              </div>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
              {marks.map(mark => (
                <div key={mark.id} style={{ background: '#fff', border: `1px solid ${KATEGORI_RUBRIK[mark.category as keyof typeof KATEGORI_RUBRIK]?.border || '#cbd5e1'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: mark.type === 'AI' ? '#dbeafe' : '#dcfce7', color: mark.type === 'AI' ? '#1e3a8a' : '#14532d', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>{mark.type}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{mark.category}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={(e) => openEditModal(mark, e)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '1.1rem', cursor: 'pointer', padding: '2px 4px' }}>✏️</button>
                      <button type="button" onClick={(e) => deleteMark(mark.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', padding: '2px 4px' }}>×</button>
                    </div>
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', color: '#334155', fontStyle: 'italic', marginBottom: '12px', borderLeft: `4px solid ${KATEGORI_RUBRIK[mark.category as keyof typeof KATEGORI_RUBRIK]?.border || '#cbd5e1'}` }}>"{mark.text}"</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, flex: 1, marginRight: '10px', lineHeight: 1.4 }}>{mark.comment}</span>
                    <span style={{ background: mark.score > 0 ? '#d1fae5' : '#fee2e2', color: mark.score > 0 ? '#065f46' : '#991b1b', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem' }}>{mark.score >= 0 ? `+${mark.score}` : mark.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {popup.show && (
        <div className="no-print" style={{ position: 'absolute', top: popup.y, left: popup.x, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '320px', zIndex: 6000 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#0f172a' }}>📌 Markah Manual Baru</h3>
          <select value={manualForm.category} onChange={(e) => setManualForm({...manualForm, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
            {Object.keys(KATEGORI_RUBRIK).map(key => <option key={key} value={key}>{key}</option>)}
          </select>
          <input type="number" step="0.5" value={manualForm.score} onChange={(e) => setManualForm({...manualForm, score: e.target.value})} placeholder="Markah (cth: 1.5, 2)" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }} />
          <input type="text" value={manualForm.comment} onChange={(e) => setManualForm({...manualForm, comment: e.target.value})} placeholder="Ulasan / Sebab markah..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => setPopup({ show: false, x: 0, y: 0, range: null })} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }}>Batal</button>
            <button type="button" onClick={saveManualMark} style={{ flex: 1, background: '#059669', color: '#fff', padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Simpan</button>
          </div>
        </div>
      )}

      {editModal.show && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', width: '380px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>✏️ Kemaskini Markah Teks</h3>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Kategori Rubrik</label>
            <select value={manualForm.category} onChange={(e) => setManualForm({...manualForm, category: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', outline: 'none' }}>
              {Object.keys(KATEGORI_RUBRIK).map(key => <option key={key} value={key}>{key}</option>)}
            </select>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Markah Nilai</label>
            <input type="number" step="0.5" value={manualForm.score} onChange={(e) => setManualForm({...manualForm, score: e.target.value})} placeholder="Contoh: 1.5 atau 2" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', outline: 'none' }} />
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Komen Pensyarah</label>
            <input type="text" value={manualForm.comment} onChange={(e) => setManualForm({...manualForm, comment: e.target.value})} placeholder="Huraian markah ini..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '24px', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={(e) => deleteMark(editModal.id!, e)} style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #fca5a5', background: '#fee2e2', fontWeight: 600, color: '#dc2626' }}>🗑️ Padam</button>
              <button type="button" onClick={() => setEditModal({ show: false, id: null })} style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, color: '#334155' }}>Batal</button>
              <button type="button" onClick={saveEditedMark} style={{ flex: 1.5, background: '#2563eb', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Kemaskini</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}