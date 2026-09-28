import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// TAMBAH BARIS INI: Paksa Next.js untuk tidak menyimpan cache ralat lama
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'menyentuh-wanita-ajnabi';

  try {
    const { data: issue, error: issueError } = await supabase
      .from('fiqh_issues')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (issueError) {
      return NextResponse.json({ 
        success: false, 
        reason: `Supabase Issue Error: ${issueError.message} (Kod: ${issueError.code})` 
      }, { status: 500 });
    }

    if (!issue) {
      return NextResponse.json({ 
        success: false, 
        reason: 'Isu Fiqh tidak dijumpai dalam pangkalan data' 
      }, { status: 404 });
    }

    const { data: opinions, error: opinionsError } = await supabase
      .from('mazhab_opinions')
      .select('*')
      .eq('issue_id', issue.id);

    if (opinionsError) {
      return NextResponse.json({ 
        success: false, 
        reason: `Supabase Opinions Error: ${opinionsError.message}` 
      }, { status: 500 });
    }

    const { data: tarjih, error: tarjihError } = await supabase
      .from('tarjih_info')
      .select('*')
      .eq('issue_id', issue.id);

    if (tarjihError) {
      return NextResponse.json({ 
        success: false, 
        reason: `Supabase Tarjih Error: ${tarjihError.message}` 
      }, { status: 500 });
    }

    const combinedData = {
      ...issue,
      mazhab_opinions: opinions || [],
      tarjih_info: tarjih || []
    };

    return NextResponse.json({ success: true, data: combinedData });

  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      reason: `Server Error: ${err.message}` 
    }, { status: 500 });
  }
}