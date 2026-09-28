import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matrix_no = searchParams.get('matrix_no');

  if (!matrix_no) {
    return NextResponse.json({ error: 'Sila masukkan No. Matrik.' }, { status: 400 });
  }

  try {
    // Cari data pelajar bersama-sama kumpulan, tugasan, dan markah mereka
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id,
        student_name,
        matrix_no,
        groups (
          group_name,
          assignments (
            title,
            kod_kursus,
            nama_kursus,
            nama_pensyarah,
            paper_weight,
            presentation_weight
          ),
          paper_submissions (
            final_paper_mark,
            lecturer_feedback
          )
        ),
        presentation_evaluations (
          total_presentation_mark,
          comments
        )
      `)
      .ilike('matrix_no', matrix_no); // .ilike supaya tak sensitif huruf besar/kecil

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Tiada rekod penilaian ditemui untuk No. Matrik ini. Sila pastikan No. Matrik tepat atau pensyarah belum memasukkan markah.' }, { status: 404 });
    }

    return NextResponse.json({ results: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ralat pelayan.' }, { status: 500 });
  }
}