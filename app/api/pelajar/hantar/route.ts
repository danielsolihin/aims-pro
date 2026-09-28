import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const groupId = formData.get('group_id');
    const program = formData.get('program') || 'N/A';
    const textTitle = formData.get('text_title') || '';
    const textContent = formData.get('text_content') || '';
    const textReferences = formData.get('text_references') || '';
    const memberVideos = formData.get('member_videos');
    
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID diperlukan.' }, { status: 400 });
    }

    let parsedVideos = null;
    if (memberVideos) {
      try { parsedVideos = JSON.parse(memberVideos.toString()); } catch(e){}
    }

    // Isikan nilai placeholder untuk pdf_url bagi melepasi syarat NOT NULL
    const pdfUrlValue = textTitle.toString().trim() !== '' 
      ? `Teks Dalam Talian: ${textTitle}` 
      : 'Teks Dalam Talian';

    // Semak jika rekod kumpulan sudah wujud
    const { data: existingRecord } = await supabase
      .from('paper_submissions')
      .select('id')
      .eq('group_id', Number(groupId))
      .single();

    if (existingRecord) {
      // Kemaskini rekod sedia ada
      const { error: updateError } = await supabase
        .from('paper_submissions')
        .update({
          pdf_url: pdfUrlValue,
          text_title: textTitle.toString(),
          text_content: textContent.toString(),
          text_references: textReferences.toString(),
          member_videos: parsedVideos
        })
        .eq('group_id', Number(groupId));
        
      if (updateError) throw updateError;
    } else {
      // Tambah rekod baharu
      const { error: insertError } = await supabase
        .from('paper_submissions')
        .insert([{
          group_id: Number(groupId),
          program: program.toString(),
          pdf_url: pdfUrlValue,
          text_title: textTitle.toString(),
          text_content: textContent.toString(),
          text_references: textReferences.toString(),
          member_videos: parsedVideos
        }]);
        
      if (insertError) throw insertError;
    }

    return NextResponse.json({ message: 'Kertas kerja berjaya disimpan!' }, { status: 200 });

  } catch (error: any) {
    console.error("Ralat API Hantar:", error);
    return NextResponse.json({ error: error.message || "Gagal menyimpan di pangkalan data." }, { status: 500 });
  }
}