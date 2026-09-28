import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nama_pensyarah,
      nama_kursus,
      kod_kursus,
      program_pengajian,
      kumpulan_pelajar,
      title,
      pengenalan,
      objektif,
      isi_perbincangan,
      penemuan_cadangan,
      paper_weight,
      presentation_weight,
      due_date,
      paper_rubrics,
      presentation_rubrics
    } = body;

    // Semakan validasi asas
    if (!nama_kursus || !kod_kursus || !program_pengajian || !kumpulan_pelajar || !title || !due_date) {
      return NextResponse.json({ error: 'Sila lengkapkan maklumat kursus, kumpulan, tajuk, dan tarikh akhir.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        nama_pensyarah,
        nama_kursus,
        kod_kursus,
        program_pengajian,
        kumpulan_pelajar,
        title,
        pengenalan,
        objektif,
        isi_perbincangan,
        penemuan_cadangan,
        paper_weight: parseInt(paper_weight || 0),
        presentation_weight: parseInt(presentation_weight || 0),
        due_date,
        paper_rubrics,
        presentation_rubrics
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Tugasan berserta maklumat kelas berjaya dicipta!', 
      assignment: data 
    }, { status: 201 });

  } catch (err: any) {
    console.error("🔴 Ralat API Cipta Tugasan:", err);
    return NextResponse.json({ error: err.message || 'Ralat pelayan.' }, { status: 500 });
  }
}