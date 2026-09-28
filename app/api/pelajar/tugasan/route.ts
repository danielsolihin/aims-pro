import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 1. GET: Ambil senarai tajuk bersama status penguncian & tarikh pendaftaran
export async function GET() {
  try {
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select(`
        *,
        student_groups (id, group_name, created_at)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Formatkan jawapan beserta tarikh kumpulan mendaftar
    const formattedAssignments = assignments.map((a: any) => ({
      ...a,
      is_taken: a.student_groups && a.student_groups.length > 0,
      registered_group: a.student_groups?.[0]?.group_name || null,
      registered_date: a.student_groups?.[0]?.created_at || null
    }));

    return NextResponse.json({ assignments: formattedAssignments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST: Pendaftaran Tajuk
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignment_id, group_name, members } = body;

    if (!assignment_id || !group_name || !members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Sila lengkapkan nama kumpulan dan senarai ahli.' }, { status: 400 });
    }

    // Semak sama ada tajuk telah diambil oleh kumpulan lain
    const { data: existingGroup } = await supabase
      .from('student_groups')
      .select('id')
      .eq('assignment_id', assignment_id)
      .single();

    if (existingGroup) {
      return NextResponse.json({ error: 'Maaf, tajuk ini telah pun dipilih oleh kumpulan lain.' }, { status: 400 });
    }

    // Simpan Kumpulan Baru (Timestamp dicipta secara automatik oleh Supabase)
    const { data: groupData, error: groupErr } = await supabase
      .from('student_groups')
      .insert({ 
        assignment_id: parseInt(assignment_id), 
        group_name: group_name.trim() 
      })
      .select()
      .single();

    if (groupErr) throw groupErr;

    // Simpan Ahli-Ahli Kumpulan
    for (const m of members) {
      if (!m.name || !m.matrix_no) continue;

      const { data: memberData, error: memErr } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          student_name: m.name.trim(),
          matrix_no: m.matrix_no.trim()
        })
        .select()
        .single();

      if (memErr) throw memErr;

      await supabase.from('presentation_evaluations').insert({
        group_id: groupData.id,
        student_id: memberData.id,
        video_url: '',
        intro_mark: 0,
        interaksi_mark: 0,
        kreativiti_mark: 0,
        soal_jawab_mark: 0,
        sahsiah_mark: 0,
        total_presentation_mark: 0
      });
    }

    return NextResponse.json({
      message: `Pendaftaran kumpulan "${group_name}" bagi tajuk ini berjaya disahkan!`
    }, { status: 201 });

  } catch (err: any) {
    console.error("🔴 Ralat Pendaftaran Kumpulan:", err);
    return NextResponse.json({ error: err.message || 'Gagal mendaftar kumpulan.' }, { status: 500 });
  }
}