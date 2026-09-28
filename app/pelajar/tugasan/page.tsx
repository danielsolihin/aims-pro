'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CarianTugasanPelajar() {
  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);

  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    fetchAllAssignments();
  }, []);

  const fetchAllAssignments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('program_pengajian, kod_kursus, nama_kursus, kumpulan_pelajar, nama_pensyarah');
        
      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanString = (str: string) => str ? str.trim() : '';
  
  const uniquePrograms = Array.from(new Set(assignments.map(a => cleanString(a.program_pengajian)).filter(Boolean))).sort();
  
  const availableCourses = Array.from(new Set(assignments.filter(a => cleanString(a.program_pengajian) === selectedProgram).map(a => cleanString(a.kod_kursus)).filter(Boolean))).sort();
  
  const availableClasses = Array.from(new Set(assignments.filter(a => cleanString(a.program_pengajian) === selectedProgram && cleanString(a.kod_kursus) === selectedCourse).map(a => cleanString(a.kumpulan_pelajar)).filter(Boolean))).sort();

  useEffect(() => { setSelectedCourse(''); setSelectedClass(''); }, [selectedProgram]);
  useEffect(() => { setSelectedClass(''); }, [selectedCourse]);

  const targetAssignment = assignments.find(a => 
    cleanString(a.program_pengajian) === selectedProgram &&
    cleanString(a.kod_kursus) === selectedCourse &&
    cleanString(a.kumpulan_pelajar) === selectedClass
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '30px 16px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .back-link { transition: all 0.2s ease; }
        .back-link:hover { color: #0284c7 !important; transform: translateX(-4px); }
      `}} />

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* ==========================================
            BUTANG KEMBALI KE LAMAN UTAMA (DITAMBAH)
            ========================================== */}
        <div style={{ marginBottom: '20px' }}>
          <Link href="/" className="back-link" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#64748b', 
            textDecoration: 'none', 
            fontWeight: 700, 
            fontSize: '0.95rem',
            padding: '8px 16px',
            background: '#fff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <span>←</span> Kembali ke Laman Utama
          </Link>
        </div>
        {/* ========================================== */}

        <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '40px 32px', borderRadius: '24px', textAlign: 'center', marginBottom: '30px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', color: '#38bdf8', padding: '6px 16px', borderRadius: '20px', display: 'inline-block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>PORTAL PELAJAR</div>
          <h1 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '2.2rem', fontWeight: 700 }}>Pendaftaran Kumpulan Projek</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '1.05rem' }}>Sila pilih hierarki kelas anda bermula dari Fakulti hingga ke Kelas Rasmi.</p>
        </header>

        <section style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>1. Fakulti / Program Pengajian</label>
              <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.95rem', background: '#f8fafc', outline: 'none' }}>
                <option value="">-- Sila Pilih Program --</option>
                {uniquePrograms.map((prog, idx) => <option key={idx} value={prog}>{prog}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: selectedProgram ? '#059669' : '#94a3b8', marginBottom: '10px' }}>2. Kod Kursus (Subjek)</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} disabled={!selectedProgram} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `2px solid ${selectedProgram ? '#34d399' : '#e2e8f0'}`, background: selectedProgram ? '#ecfdf5' : '#f1f5f9', outline: 'none' }}>
                <option value="">-- Sila Pilih Subjek --</option>
                {availableCourses.map((course, idx) => <option key={idx} value={course}>{course}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: selectedCourse ? '#0284c7' : '#94a3b8', marginBottom: '10px' }}>3. Kelas Rasmi Universiti</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedCourse} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `2px solid ${selectedCourse ? '#38bdf8' : '#e2e8f0'}`, background: selectedCourse ? '#f0f9ff' : '#f1f5f9', outline: 'none' }}>
                <option value="">-- Cth: IC123 --</option>
                {availableClasses.map((cls, idx) => <option key={idx} value={cls}>{cls}</option>)}
              </select>
            </div>
          </div>
        </section>

        {selectedProgram && selectedCourse && selectedClass && targetAssignment && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease forwards' }}>
            
            <div style={{ background: '#ecfdf5', border: '2px solid #34d399', borderRadius: '24px', padding: '28px', maxWidth: '650px', margin: '0 auto 24px auto', textAlign: 'left', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.1)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #a7f3d0', paddingBottom: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>📌</span>
                <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.2rem', fontWeight: 800 }}>Pengesahan Maklumat Kelas</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700, marginBottom: '4px' }}>Kod & Nama Kursus</div>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.1rem' }}>{targetAssignment.kod_kursus} - {targetAssignment.nama_kursus || '-'}</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, border: '3px solid #34d399', flexShrink: 0, overflow: 'hidden' }}>
                    {targetAssignment.avatar_url ? (
                      <img src={targetAssignment.avatar_url} alt="Profil" className="avatar-img" />
                    ) : (
                      targetAssignment.nama_pensyarah ? targetAssignment.nama_pensyarah.charAt(0).toUpperCase() : '👨‍🏫'
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pensyarah Anda</div>
                    <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', lineHeight: '1.2' }}>{targetAssignment.nama_pensyarah}</div>
                  </div>
                </div>
              </div>

            </div>

            <Link href={`/pelajar/tugasan/daftar?course=${selectedCourse}&class=${selectedClass}`} style={{ display: 'inline-block', background: '#059669', color: '#fff', padding: '16px 40px', borderRadius: '14px', fontWeight: 800, fontSize: '1.2rem', textDecoration: 'none', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.25)', transition: 'all 0.3s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              Seterusnya: Mendaftar Kumpulan ➔
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}