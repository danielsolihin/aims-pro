import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 1. GET: Ambil senarai kumpulan & penghantaran mengikut Tugasan
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignment_id');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Sila sertakan assignment_id.' }, { status: 400 });
    }

    // Ambil data kumpulan bersama ahli, kertas kerja, dan nilai pembentangan
    const { data: groups, error } = await supabase
      .from('student_groups')
      .select(`
        id,
        group_name,
        created_at,
        assignments (*),
        paper_submissions (*),
        group_members (
          id,
          student_name,
          matrix_no,
          presentation_evaluations (*)
        )
      `)
      .eq('assignment_id', assignmentId);

    if (error) throw error;

    return NextResponse.json({ groups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST: Simpan Markah Muktamad Kertas Kerja & Pembentangan Individu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperSubmissionId, finalPaperMark, lecturerFeedback, evaluations } = body;

    // 1. Kemas kini markah kertas kerja kumpulan
    if (paperSubmissionId) {
      const { error: paperErr } = await supabase
        .from('paper_submissions')
        .update({
          final_paper_mark: parseFloat(finalPaperMark),
          lecturer_feedback: lecturerFeedback
        })
        .eq('id', paperSubmissionId);

      if (paperErr) throw paperErr;
    }

    // 2. Kemas kini markah pembentangan individu bagi setiap ahli
    if (evaluations && Array.isArray(evaluations)) {
      for (const ev of evaluations) {
        const total = 
          parseFloat(ev.intro_mark || 0) +
          parseFloat(ev.interaksi_mark || 0) +
          parseFloat(ev.kreativiti_mark || 0) +
          parseFloat(ev.soal_jawab_mark || 0) +
          parseFloat(ev.sahsiah_mark || 0);

        const { error: evErr } = await supabase
          .from('presentation_evaluations')
          .update({
            intro_mark: parseFloat(ev.intro_mark || 0),
            interaksi_mark: parseFloat(ev.interaksi_mark || 0),
            kreativiti_mark: parseFloat(ev.kreativiti_mark || 0),
            soal_jawab_mark: parseFloat(ev.soal_jawab_mark || 0),
            sahsiah_mark: parseFloat(ev.sahsiah_mark || 0),
            total_presentation_mark: total,
            comments: ev.comments || ''
          })
          .eq('id', ev.id);

        if (evErr) throw evErr;
      }
    }

    return NextResponse.json({ message: 'Markah berjaya dimuktamadkan dan disimpan!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}