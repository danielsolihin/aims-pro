'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CiptaTugasanPage() {
  const router = useRouter();

  // STATE BORANG 1: MAKLUMAT KURSUS
  const [programPengajian, setProgramPengajian] = useState('');
  const [kumpulanPelajar, setKumpulanPelajar] = useState('');
  const [kodKursus, setKodKursus] = useState('');
  const [title, setTitle] = useState('');
  
  // STATE BORANG 2: SKOP TUGASAN (Yang tertinggal sebelum ini)
  const [isiPerbincangan, setIsiPerbincangan] = useState('');
  const [penemuanCadangan, setPenemuanCadangan] = useState('');

  // STATE BORANG 3: MARKAH
  const [paperWeight, setPaperWeight] = useState<number>(30);
  const [presentationWeight, setPresentationWeight] = useState<number>(30);

  // STATE BORANG 4: PARAMETER RUBRIK AI
  const [rubrics, setRubrics] = useState([
    { id: 1, title: 'Pendahuluan & Latar Belakang', weight: 5, keywords: 'definisi, latar belakang, penyataan masalah, muamalat, objektif' },
    { id: 2, title: 'Isi Kandungan & Dalil Fiqh', weight: 10, keywords: 'mal, taqabud, gharar, riba, mazhab, syafi\'i, turath, dalil' },
    { id: 3, title: 'Perbincangan & Muqaranah Mazhab', weight: 8, keywords: 'analisis, mufti, fatwa, mki, aaoifi, perbandingan, isu kontemporari' },
    { id: 4, title: 'Rumusan & Cadangan', weight: 4, keywords: 'kesimpulan, cadangan, implikasi, iktibar, penutup' },
    { id: 5, title: 'Rujukan & Format Turath', weight: 3, keywords: 'apa style, jilid, penerbit, kitab, jurnal, bahan ilmiah' }
  ]);

  const [loadingRubricId, setLoadingRubricId] = useState<number | null>(null);
  const [aiStatusNote, setAiStatusNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FUNGSI JANAN KATA KUNCI AI (Lancar & Tanpa Popup Ralat)
  const handleGenerateKeywords = async (rubricId: number, rubricTitle: string) => {
    setLoadingRubricId(rubricId);
    setAiStatusNote(null);

    try {
      // Pastikan ia fetch ke /api/generate-keywords yang telah dibaiki
      const res = await fetch('/api/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubricName: rubricTitle, courseTitle: title })
      });

      const data = await res.json();

      if (data && data.keywords) {
        setRubrics(prev => prev.map(r => r.id === rubricId ? { ...r, keywords: data.keywords } : r));
        
        if (data.source === 'ai') {
          setAiStatusNote(`✨ Kata kunci AI (Gemini) berjaya dijana untuk: ${rubricTitle}`);
        } else {
          setAiStatusNote(`💡 Kata kunci cadangan automatik diisi untuk: ${rubricTitle}`);
        }
      }
    } catch (error) {
      console.warn("Gagal menghubungi API, guna sandaran lokal:", error);
      
      const fallbackKeywords: Record<string, string> = {
        'pendahuluan': 'definisi, latar belakang, penyataan masalah, muamalat, objektif',
        'kandungan': 'mal, taqabud, gharar, riba, mazhab, syafi\'i, turath, dalil',
        'perbincangan': 'analisis, mufti, fatwa, mki, aaoifi, perbandingan, isu kontemporari',
        'rumusan': 'kesimpulan, cadangan, implikasi, iktibar, penutup',
        'rujukan': 'apa style, jilid, penerbit, kitab, jurnal, bahan ilmiah'
      };
      
      const matchedFallback = Object.keys(fallbackKeywords).find(k => 
        rubricTitle.toLowerCase().includes(k.toLowerCase())
      );
      const defaultKeywords = matchedFallback ? fallbackKeywords[matchedFallback] : 'definisi, analisis, perbincangan, perbandingan, rujukan, kesimpulan';

      setRubrics(prev => prev.map(r => r.id === rubricId ? { ...r, keywords: defaultKeywords } : r));
      setAiStatusNote(`💡 Kata kunci cadangan automatik diisi untuk: ${rubricTitle}`);
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
  const totalKeseluruhan = paperWeight + presentationWeight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programPengajian || !kumpulanPelajar || !title) {
      alert("⚠️ Sila lengkapkan maklumat program, kumpulan dan tajuk tugasan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const lectName = session?.user?.user_metadata?.full_name || 'Pensyarah Kursus';

      // Simpan kesemua data termasuk medan tambahan ke Supabase
      const { error } = await supabase.from('assignments').insert({
        program_pengajian: programPengajian,
        kumpulan_pelajar: kumpulanPelajar,
        kod_kursus: kodKursus,
        title: title,
        isi_perbincangan: isiPerbincangan,
        penemuan_cadangan: penemuanCadangan,
        nama_pensyarah: lectName,
        paper_weight: paperWeight,
        presentation_weight: presentationWeight,
        paper_rubrics: rubrics
      });

      if (error) throw error;

      alert("🎉 Tugasan baharu berjaya didaftarkan!");
      router.push('/pensyarah/penilaian');
    } catch (err: any) {
      alert("❌ Ralat mendaftar tugasan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #065f46', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: '#065f46', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>➕ Cipta Tugasan Baharu</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Tetapkan maklumat kelas dan parameter penilaian AI.</p>
        </div>
        <Link href="/pensyarah/dashboard" style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', border: '1px solid #cbd5e1' }}>
          🏠 Kembali ke Dashboard
        </Link>
      </header>

      {aiStatusNote && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', border: '1px solid #a7f3d0', marginBottom: '20px', fontWeight: 600, fontSize: '0.9rem' }}>
          {aiStatusNote}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* SEKSYEN 1: MAKLUMAT AKADEMIK */}
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.1rem' }}>📌 1. Maklumat Kelas & Kursus</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Program Pengajian</label>
              <input type="text" required placeholder="Contoh: Sarjana Muda Pengurusan Halal" value={programPengajian} onChange={(e) => setProgramPengajian(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Kumpulan / Kumpulan Pelajar</label>
              <input type="text" required placeholder="Contoh: IC123" value={kumpulanPelajar} onChange={(e) => setKumpulanPelajar(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Kod Kursus</label>
              <input type="text" placeholder="Contoh: CTU552" value={kodKursus} onChange={(e) => setKodKursus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Tajuk Utama Tugasan</label>
              <input type="text" required placeholder="Contoh: Isu Gangguan Seksual Dikalangan Masyarakat" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
            </div>
          </div>
        </section>

        {/* SEKSYEN 2: PERBINCANGAN & CADANGAN (Kini Dikembalikan!) */}
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.1rem' }}>📝 2. Skop Penulisan Kertas Kerja</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Isi Perbincangan</label>
              <textarea placeholder="Skop perbahasan..." value={isiPerbincangan} onChange={(e) => setIsiPerbincangan(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Penemuan & Cadangan</label>
              <textarea placeholder="Hasil resolusi..." value={penemuanCadangan} onChange={(e) => setPenemuanCadangan(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'normal' }} />
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Markah Kertas Kerja (KUMPULAN)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" value={paperWeight} onChange={(e) => setPaperWeight(Number(e.target.value))} style={{ width: '100px', padding: '10px', fontSize: '1.2rem', fontWeight: 'normal', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <span style={{ fontWeight: 600, color: '#166534' }}>Mata Markah</span>
              </div>
            </div>

            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fef08a' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#854d0e', marginBottom: '6px' }}>Markah Pembentangan Video (INDIVIDU)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" value={presentationWeight} onChange={(e) => setPresentationWeight(Number(e.target.value))} style={{ width: '100px', padding: '10px', fontSize: '1.2rem', fontWeight: 'normal', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <span style={{ fontWeight: 600, color: '#854d0e' }}>Mata Markah</span>
              </div>
            </div>
          </div>
        </section>

        {/* SEKSYEN 4: PARAMETER AI & KATA KUNCI */}
        <section style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.1rem' }}>🤖 4. Parameter Penilaian Kertas Kerja (AI Auto-Grading)</h3>
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

                <input type="text" value={rubric.keywords} onChange={(e) => handleRubricKeywordsChange(rubric.id, e.target.value)} placeholder="Masukkan kata kunci dipisahkan dengan koma..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#334155', fontWeight: 'normal' }} />
              </div>
            ))}
          </div>
        </section>

        {/* BUTANG HANTAR */}
        <button type="submit" disabled={isSubmitting} style={{ padding: '16px', background: isSubmitting ? '#94a3b8' : '#065f46', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(6, 95, 70, 0.2)' }}>
          {isSubmitting ? 'Mendaftar Tugasan...' : '💾 Simpan & Daftar Tugasan Baharu'}
        </button>

      </form>

    </div>
  );
}