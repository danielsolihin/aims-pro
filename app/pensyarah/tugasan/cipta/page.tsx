'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CiptaTugasanPage() {
  const router = useRouter();

  // STATE: JENIS TUGASAN & PEMBENTANGAN
  const [jenisTugasan, setJenisTugasan] = useState<'KERTAS_KERJA' | 'KAJIAN_KES'>('KERTAS_KERJA');
  const [adaPembentangan, setAdaPembentangan] = useState<boolean>(true);

  const handleJenisChange = (val: 'KERTAS_KERJA' | 'KAJIAN_KES') => {
    setJenisTugasan(val);
    if (val === 'KAJIAN_KES') setAdaPembentangan(false);
    else setAdaPembentangan(true);
  };

  // STATE BORANG 1: MAKLUMAT KURSUS
  const [programPengajian, setProgramPengajian] = useState('');
  const [kumpulanPelajar, setKumpulanPelajar] = useState('');
  const [kodKursus, setKodKursus] = useState('');
  const [namaKursus, setNamaKursus] = useState('');
  const [tarikhAkhir, setTarikhAkhir] = useState('');
  
  const [historyFakulti, setHistoryFakulti] = useState<string[]>([]);
  const [historyKumpulan, setHistoryKumpulan] = useState<string[]>([]);
  const [historyKodKursus, setHistoryKodKursus] = useState<string[]>([]);
  const [historyNamaKursus, setHistoryNamaKursus] = useState<string[]>([]);

  // STATE BORANG 2: SKOP TUGASAN
  const [title, setTitle] = useState('');
  const [sinopsisTajuk, setSinopsisTajuk] = useState('');
  const [skopIsiPerbincangan, setSkopIsiPerbincangan] = useState('');

  // STATE BORANG 3: MARKAH
  const [paperWeight, setPaperWeight] = useState<number>(30);
  const [presentationWeight, setPresentationWeight] = useState<number>(30);

  // STATE BORANG 4: PARAMETER RUBRIK AI
  const [rubrics, setRubrics] = useState([
    { id: 1, title: 'Pendahuluan & Latar Belakang', weight: 5, keywords: '' },
    { id: 2, title: 'Isi Kandungan & Dalil Fiqh', weight: 10, keywords: '' },
    { id: 3, title: 'Perbincangan & Muqaranah Mazhab', weight: 8, keywords: '' },
    { id: 4, title: 'Rumusan & Cadangan', weight: 4, keywords: '' },
    { id: 5, title: 'Rujukan & Format Turath', weight: 3, keywords: '' }
  ]);

  const [loadingRubricId, setLoadingRubricId] = useState<number | null>(null);
  const [aiStatusNote, setAiStatusNote] = useState<string | null>(null);
  
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);

  useEffect(() => {
    fetchLecturerHistory();
  }, []);

  const fetchLecturerHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const secretUserId = session?.user?.id;
      if (!secretUserId) return;

      const { data, error } = await supabase
        .from('assignments')
        .select('program_pengajian, kumpulan_pelajar, kod_kursus, nama_kursus')
        .eq('lecturer_id', secretUserId);

      if (error) throw error;
      if (data && data.length > 0) {
        setHistoryFakulti(Array.from(new Set(data.map(d => d.program_pengajian).filter(Boolean))));
        setHistoryKumpulan(Array.from(new Set(data.map(d => d.kumpulan_pelajar).filter(Boolean))));
        setHistoryKodKursus(Array.from(new Set(data.map(d => d.kod_kursus).filter(Boolean))));
        setHistoryNamaKursus(Array.from(new Set(data.map(d => d.nama_kursus).filter(Boolean))));
      }
    } catch (err) {
      console.warn("Ralat menarik sejarah auto-cadangan:", err);
    }
  };

  const handleGenerateKeywords = async (rubricId: number, rubricTitle: string) => {
    if (!title.trim()) {
      alert("⚠️ Sila masukkan 'Tajuk Utama Tugasan' terlebih dahulu sebelum menjana kata kunci AI.");
      return;
    }

    setLoadingRubricId(rubricId);
    setAiStatusNote(null);

    try {
      const res = await fetch('/api/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rubricName: rubricTitle, 
          courseTitle: title,
          synopsis: sinopsisTajuk,
          skop: skopIsiPerbincangan
        })
      });

      const data = await res.json();

      if (data && data.keywords) {
        setRubrics(prev => prev.map(r => r.id === rubricId ? { ...r, keywords: data.keywords } : r));
        
        if (data.source === 'ai') {
          setAiStatusNote(`✨ Kata kunci AI berjaya dijana khusus berdasarkan Tajuk & Sinopsis untuk: ${rubricTitle}`);
        } else {
          setAiStatusNote(`💡 Kata kunci padanan tajuk diisi automatik untuk: ${rubricTitle}`);
        }
      }
    } catch (error) {
      console.warn("Gagal menghubungi API, guna ekstraksi dinamik:", error);
      
      const cleanTitleWords = title.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
      const cleanSynWords = sinopsisTajuk.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
      const combined = Array.from(new Set([...cleanTitleWords, ...cleanSynWords])).slice(0, 6).join(', ');

      const defaultKeywords = combined || 'definisi, analisis, perbincangan, rumusan, rujukan';
      setRubrics(prev => prev.map(r => r.id === rubricId ? { ...r, keywords: defaultKeywords } : r));
      setAiStatusNote(`💡 Kata kunci padanan tajuk diisi automatik untuk: ${rubricTitle}`);
    } finally {
      setLoadingRubricId(null);
    }
  };

  const handleRubricWeightChange = (id: number, newWeight: number) => {
    setRubrics(prev => prev.map(r => r.id === id ? { ...r, weight: newWeight } : r));
  };

  const handleRubricKeywordsChange = (id: number, newKeywords: string) => {
    setRubrics(prev => prev.map(r => r.id === id ? { ...r, keywords: newKeywords } : r));
  };

  const totalRubricScore = rubrics.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const totalKeseluruhan = paperWeight + (adaPembentangan ? presentationWeight : 0);

  const handleSubmit = async (action: 'tambah' | 'keluar') => {
    if (!programPengajian || !kumpulanPelajar || !kodKursus || !title) {
      alert("⚠️ Sila lengkapkan maklumat wajib (Fakulti, Kumpulan, Kod Kursus, & Tajuk Utama Tugasan).");
      return;
    }

    if (action === 'tambah') setIsSubmittingAdd(true);
    else setIsSubmittingExit(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const lectName = session?.user?.user_metadata?.full_name || 'Pensyarah Kursus';

      // NAMA LAJUR (COLUMN) TELAH DISELARASKAN DENGAN DATABASE
      let payload: any = {
        jenis_tugasan: jenisTugasan,
        program_pengajian: programPengajian,
        kumpulan_pelajar: kumpulanPelajar,
        kod_kursus: kodKursus,
        nama_kursus: namaKursus,
        tarikh_akhir: tarikhAkhir || null,
        title: title,
        objektif: skopIsiPerbincangan || sinopsisTajuk || '',
        pengenalan: sinopsisTajuk || '',
        isi_perbincangan: sinopsisTajuk || '',
        penemuan_cadangan: skopIsiPerbincangan || '',
        nama_pensyarah: lectName,
        markah_kertas_kerja: paperWeight,
        markah_pembentangan: adaPembentangan ? presentationWeight : 0, // Simpan terus nilai 0 ke pangkalan data
        paper_rubrics: rubrics
      };

      let { error } = await supabase.from('assignments').insert([payload]);

      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
         console.warn("Menyelaras dengan struktur lama (fallback)...");
         if (error.message?.includes('jenis_tugasan')) delete payload.jenis_tugasan;
         if (error.message?.includes('tarikh_akhir')) delete payload.tarikh_akhir;
         
         const fallbackRes = await supabase.from('assignments').insert([payload]);
         error = fallbackRes.error;
      }

      if (error) throw error;

      alert("🎉 Tugasan baharu berjaya didaftarkan!");

      if (action === 'keluar') {
        router.push('/pensyarah/dashboard');
      } else if (action === 'tambah') {
        setTitle('');
        setSinopsisTajuk('');
        setSkopIsiPerbincangan('');
        setRubrics(prev => prev.map(r => ({ ...r, keywords: '' })));
        setAiStatusNote(null);
        fetchLecturerHistory();
        
        const section2 = document.getElementById('seksyen-skop');
        if (section2) section2.scrollIntoView({ behavior: 'smooth' });
      }

    } catch (err: any) {
      alert("❌ Ralat mendaftar tugasan: " + err.message);
    } finally {
      setIsSubmittingAdd(false);
      setIsSubmittingExit(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #065f46', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: '#065f46', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>➕ Cipta Tugasan Baharu</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Tetapkan jenis tugasan, maklumat kelas dan parameter penilaian AI.</p>
        </div>
        <Link href="/pensyarah/dashboard" style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', border: '1px solid #cbd5e1' }}>
          🏠 Kembali ke Dashboard
        </Link>
      </header>

      {/* SEKSYEN KAWALAN JENIS & PEMBENTANGAN */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* BARIS 1: Jenis Tugasan */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#334155', minWidth: '220px' }}>1. Jenis Tugasan:</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: jenisTugasan === 'KERTAS_KERJA' ? 700 : 500, color: jenisTugasan === 'KERTAS_KERJA' ? '#065f46' : '#64748b' }}>
            <input type="radio" value="KERTAS_KERJA" checked={jenisTugasan === 'KERTAS_KERJA'} onChange={() => handleJenisChange('KERTAS_KERJA')} style={{ accentColor: '#065f46', width: '18px', height: '18px' }} />
            Kertas Kerja
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: jenisTugasan === 'KAJIAN_KES' ? 700 : 500, color: jenisTugasan === 'KAJIAN_KES' ? '#065f46' : '#64748b' }}>
            <input type="radio" value="KAJIAN_KES" checked={jenisTugasan === 'KAJIAN_KES'} onChange={() => handleJenisChange('KAJIAN_KES')} style={{ accentColor: '#065f46', width: '18px', height: '18px' }} />
            Kajian Kes / Review Artikel
          </label>
        </div>

        <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }}></div>

        {/* BARIS 2: Pembentangan */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#334155', minWidth: '220px' }}>2. Perlukan Pembentangan?</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: adaPembentangan ? 700 : 500, color: adaPembentangan ? '#065f46' : '#64748b' }}>
            <input type="radio" checked={adaPembentangan === true} onChange={() => setAdaPembentangan(true)} style={{ accentColor: '#065f46', width: '18px', height: '18px' }} />
            Ya, Perlu Bentang
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: !adaPembentangan ? 700 : 500, color: !adaPembentangan ? '#ef4444' : '#64748b' }}>
            <input type="radio" checked={adaPembentangan === false} onChange={() => setAdaPembentangan(false)} style={{ accentColor: '#ef4444', width: '18px', height: '18px' }} />
            Tidak Perlu
          </label>
        </div>

      </div>

      {aiStatusNote && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', border: '1px solid #a7f3d0', marginBottom: '20px', fontWeight: 600, fontSize: '0.9rem' }}>
          {aiStatusNote}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* SEKSYEN 1: MAKLUMAT AKADEMIK */}
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.1rem' }}>📌 1. Maklumat Kelas & Kursus</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Fakulti / Program Pengajian</label>
              <input type="text" list="list-fakulti" placeholder="Contoh: Fakulti Pengajian Kontemporari Islam" value={programPengajian} onChange={(e) => setProgramPengajian(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
              <datalist id="list-fakulti">
                {historyFakulti.map((item, idx) => <option key={idx} value={item} />)}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Kumpulan / Kumpulan Pelajar</label>
              <input type="text" list="list-kumpulan" placeholder="Contoh: IC123" value={kumpulanPelajar} onChange={(e) => setKumpulanPelajar(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
              <datalist id="list-kumpulan">
                {historyKumpulan.map((item, idx) => <option key={idx} value={item} />)}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ width: '180px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Kod Kursus</label>
              <input type="text" list="list-kod" placeholder="Contoh: CTU552" value={kodKursus} onChange={(e) => setKodKursus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
              <datalist id="list-kod">
                {historyKodKursus.map((item, idx) => <option key={idx} value={item} />)}
              </datalist>
            </div>
            
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Nama Kursus</label>
              <input type="text" list="list-nama" placeholder="Contoh: Muqaranah Fiqh" value={namaKursus} onChange={(e) => setNamaKursus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
              <datalist id="list-nama">
                {historyNamaKursus.map((item, idx) => <option key={idx} value={item} />)}
              </datalist>
            </div>

            <div style={{ width: '180px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: '#0f766e' }}>📅 Tarikh Akhir</label>
              <input type="date" value={tarikhAkhir} onChange={(e) => setTarikhAkhir(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #10b981', background: '#ecfdf5', outline: 'none', color: '#0f172a' }} />
            </div>
          </div>
        </section>

        {/* SEKSYEN 2: PERBINCANGAN & CADANGAN */}
        <section id="seksyen-skop" style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.1rem' }}>📝 2. Skop Penulisan {jenisTugasan === 'KAJIAN_KES' ? 'Kajian Kes / Review' : 'Kertas Kerja'}</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Tajuk Utama Tugasan</label>
            <input type="text" placeholder={jenisTugasan === 'KAJIAN_KES' ? "Contoh: Review Artikel Berkenaan Institusi Zakat di Malaysia" : "Contoh: Peranan Akhlak Mahmudah Dalam konteks Pembangunan Remaja"} value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #059669', background: '#ecfdf5', fontWeight: 'bold', color: '#0f172a' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Sinopsis Tajuk</label>
              <textarea placeholder="Ringkasan / sinopsis tugasan yang akan dibaca dan dirujuk oleh pelajar..." value={sinopsisTajuk} onChange={(e) => setSinopsisTajuk(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Skop & Isi Perbincangan</label>
              <textarea placeholder="Skop dan isi perbahasan khusus yang perlu dicakupi oleh pelajar..." value={skopIsiPerbincangan} onChange={(e) => setSkopIsiPerbincangan(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
            </div>
          </div>
        </section>

        {/* SEKSYEN 3: NISBAH MARKAH */}
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.1rem' }}>⚖️ 3. Nisbah Markah Penilaian Berterusan</h3>
            <span style={{ background: '#1e293b', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontWeight: 600, fontSize: '0.85rem' }}>
              Jumlah: {totalKeseluruhan} Markah
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: adaPembentangan ? '1fr 1fr' : '1fr', gap: '20px' }}>
            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Markah Teks {jenisTugasan === 'KAJIAN_KES' ? 'Kajian Kes' : 'Kertas Kerja'} (KUMPULAN)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" value={paperWeight} onChange={(e) => setPaperWeight(Number(e.target.value))} style={{ width: '100px', padding: '10px', fontSize: '1.2rem', fontWeight: 'normal', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <span style={{ fontWeight: 600, color: '#166534' }}>Mata Markah</span>
              </div>
            </div>

            {adaPembentangan && (
              <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <label style={{ display: 'block', fontWeight: 600, color: '#854d0e', marginBottom: '6px' }}>Markah Pembentangan Video (INDIVIDU)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" value={presentationWeight} onChange={(e) => setPresentationWeight(Number(e.target.value))} style={{ width: '100px', padding: '10px', fontSize: '1.2rem', fontWeight: 'normal', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  <span style={{ fontWeight: 600, color: '#854d0e' }}>Mata Markah</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SEKSYEN 4: PARAMETER AI */}
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.1rem' }}>🤖 4. Parameter Penilaian AI</h3>
            <span style={{ background: '#ecfdf5', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontWeight: 600, fontSize: '0.85rem', border: '1px solid #a7f3d0' }}>
              Jumlah Rubrik: {totalRubricScore} / {paperWeight} Mata
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {rubrics.map((rubric) => (
              <div key={rubric.id} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{rubric.id}. {rubric.title}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Sub-Markah:</span>
                      <input type="number" value={rubric.weight} onChange={(e) => handleRubricWeightChange(rubric.id, Number(e.target.value))} style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
                    </div>

                    <button type="button" onClick={() => handleGenerateKeywords(rubric.id, rubric.title)} disabled={loadingRubricId === rubric.id} style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                      {loadingRubricId === rubric.id ? '⏳ Menjana...' : '✨ Cadang Kata Kunci AI'}
                    </button>
                  </div>
                </div>

                <input type="text" value={rubric.keywords} onChange={(e) => handleRubricKeywordsChange(rubric.id, e.target.value)} placeholder="Tekan 'Cadang Kata Kunci AI' untuk jana mengikut Tajuk & Sinopsis..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#334155', fontWeight: 'normal' }} />
              </div>
            ))}
          </div>
        </section>

        {/* 2 BUTANG TINDAKAN */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleSubmit('tambah')} disabled={isSubmittingAdd || isSubmittingExit} style={{ flex: 1, minWidth: '250px', padding: '16px', background: (isSubmittingAdd || isSubmittingExit) ? '#94a3b8' : '#059669', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', cursor: (isSubmittingAdd || isSubmittingExit) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.2)', transition: 'background 0.2s' }}>
            {isSubmittingAdd ? 'Menyimpan...' : '💾 Simpan & Tambah Tugasan'}
          </button>

          <button type="button" onClick={() => handleSubmit('keluar')} disabled={isSubmittingAdd || isSubmittingExit} style={{ flex: 1, minWidth: '250px', padding: '16px', background: (isSubmittingAdd || isSubmittingExit) ? '#cbd5e1' : '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', cursor: (isSubmittingAdd || isSubmittingExit) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(30, 41, 59, 0.2)', transition: 'background 0.2s' }}>
            {isSubmittingExit ? 'Menyimpan & Keluar...' : '🚪 Simpan & Keluar'}
          </button>
        </div>

      </div>
    </div>
  );
}