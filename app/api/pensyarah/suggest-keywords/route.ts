import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { title, pengenalan, objektif, sectionLabel } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Sila masukkan tajuk kertas kerja terlebih dahulu.' }, { status: 400 });
    }

    const prompt = `Anda adalah pakar penilai akademik Fiqh dan Syariah.
Berdasarkan maklumat tugasan berikut:
- Tajuk: ${title}
- Pengenalan: ${pengenalan || 'Tiada'}
- Objektif: ${objektif || 'Tiada'}

Tugas anda: Berikan 6 hingga 8 kata kunci (keywords) Fiqh, Syariah, istilah Arab/Turath, atau fatwa yang sangat spesifik untuk bahagian: "${sectionLabel}".
Kata kunci ini akan digunakan oleh sistem AI untuk menyemak kehadiran fakta penting dalam PDF kertas kerja pelajar.

ARAHAN FORMAT:
Pulangkan jawapan dalam format string perkataan yang dipisahkan dengan koma SAHAJA. DILARANG meletakkan nombor, bullet point, atau teks mukaddimah.
Contoh jawapan: definisi, latar belakang, muamalat, masalah, akad, shariah`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const keywordsText = result.response.text().trim().replace(/[\r\n]+/g, ' ');

    return NextResponse.json({ keywords: keywordsText });
  } catch (err: any) {
    console.error("🔴 Ralat Penjana Kata Kunci AI:", err);
    return NextResponse.json({ error: 'Gagal menjana kata kunci AI.' }, { status: 500 });
  }
}