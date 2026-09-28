import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentSubmission, assignmentSynopsis, paperRubrics } = body;

    if (!studentSubmission || !paperRubrics) {
      return NextResponse.json(
        { error: 'Maklumat jawapan pelajar atau rubrik tidak lengkap.' }, 
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Tiada API Key dijumpai di dalam fail persekitaran (.env)');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1 // Suhu sangat rendah untuk penilaian yang objektif dan ketat
      }
    });

    const prompt = `Anda adalah pemeriksa kertas kerja akademik yang pakar, objektif, dan adil.
    Tugas anda adalah menilai jawapan pelajar secara teliti BERDASARKAN KATA KUNCI RUBRIK yang telah ditetapkan oleh pensyarah.

    ARAHAN PENTING:
    1. Kenal pasti bahasa yang digunakan dalam Jawapan Pelajar (Bahasa Melayu, English, atau Arabic).
    2. Semak jawapan pelajar dan padankan dengan KATA KUNCI dalam setiap rubrik di bawah.
    3. Berikan markah (score_obtained) yang adil berdasarkan sejauh mana pelajar menyentuh kata kunci yang ditetapkan. Markah tidak boleh melebihi max_score.
    4. Tulis maklum balas (feedback) dan ulasan keseluruhan (overall_feedback) dalam BAHASA YANG SAMA dengan jawapan pelajar. (Jika Arab, gunakan Bahasa Arab Fusha).
    5. JANGAN reka kriteria pemarkahan di luar dari Rubrik Pensyarah.

    RUBRIK & KATA KUNCI PENSYARAH (Skema Pemarkahan):
    ${JSON.stringify(paperRubrics)}

    SINOPSIS TUGASAN (Konteks Soalan):
    ${assignmentSynopsis || 'Tiada sinopsis khusus disediakan.'}

    JAWAPAN PELAJAR:
    ${studentSubmission}

    FORMAT OUTPUT WAJIB (JSON Sahaja):
    {
      "detected_language": "Bahasa Melayu | English | Arabic",
      "direction": "ltr | rtl",
      "total_score": <jumlah_keseluruhan_markah>,
      "rubric_breakdown": [
        {
          "rubric_id": <id_rubrik>,
          "rubric_title": "<tajuk_rubrik>",
          "score_obtained": <nombor>,
          "max_score": <nombor>,
          "feedback": "<Ulasan membina spesifik kepada kata kunci dalam bahasa pelajar>"
        }
      ],
      "overall_feedback": "<Ulasan ringkas keseluruhan prestasi pelajar dalam bahasa pelajar>"
    }`;

    const result = await model.generateContent(prompt);
    const replyText = result.response.text();
    const parsedData = JSON.parse(replyText);

    return NextResponse.json(parsedData, { status: 200 });

  } catch (error: any) {
    console.error("Ralat Gemini (Auto-Grading):", error.message);
    return NextResponse.json(
      { error: "Berlaku ralat pada pelayan AI semasa proses penandaan." },
      { status: 500 }
    );
  }
}