import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

// Beritahu Next.js supaya tidak menyimpan cache untuk fungsi ini
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mockFatwas = [
  {
    title: 'Hukum Permainan Kutu (Kumpulan Wang)',
    content: 'Hukum bermain kutu secara tradisional adalah harus sekiranya mematuhi syarat iaitu tiada unsur riba, tiada penipuan, dan dipersetujui oleh semua ahli. Walau bagaimanapun, penganjuran kutu yang mengambil keuntungan atau mengenakan yuran tambahan adalah haram dan menyalahi Akta Kumpulan Wang Kutu 1971.',
    source: 'Pejabat Mufti Wilayah Persekutuan',
    category: 'Muamalat'
  },
  {
    title: 'Hukum Pelaburan Amanah Saham Bumiputera (ASB)',
    content: 'Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan telah memutuskan bahawa hukum melabur dalam Amanah Saham Bumiputera (ASB) dan Amanah Saham Nasional (ASN) adalah harus. Dividen dan bonus yang diterima adalah halal dan boleh dimanfaatkan.',
    source: 'Muzakarah Fatwa Kebangsaan',
    category: 'Kewangan & Pelaburan'
  },
  {
    title: 'Hukum Bekerja di Bank Konvensional',
    content: 'Hukum asal bekerja di institusi kewangan konvensional yang terlibat dengan sistem riba adalah haram dan hasil pendapatannya adalah syubhah. Umat Islam dinasihatkan untuk mencari pekerjaan di institusi kewangan Islam. Namun, jika dalam keadaan darurat, ia dibenarkan sementara mencari pekerjaan yang halal.',
    source: 'Pejabat Mufti Wilayah Persekutuan',
    category: 'Pekerjaan'
  }
];

export async function GET() {
  try {
    const results = [];

    for (const fatwa of mockFatwas) {
      // 1. Minta OpenAI tukar teks fatwa kepada Vektor (Embedding)
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: `${fatwa.title}. ${fatwa.content}`,
      });

      const embeddingVector = embeddingResponse.data[0].embedding;

      // 2. Simpan teks dan vektor ke dalam Supabase
      const { data, error } = await supabase
        .from('fatwa_documents')
        .insert({
          title: fatwa.title,
          content: fatwa.content,
          source: fatwa.source,
          category: fatwa.category,
          embedding: embeddingVector,
        })
        .select('title')
        .single();

      if (error) {
        console.error('Ralat simpan data:', error);
        throw new Error(error.message);
      }

      results.push(data.title);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Fatwa berjaya diproses menjadi vektor dan disimpan di Supabase!',
      inserted: results 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}