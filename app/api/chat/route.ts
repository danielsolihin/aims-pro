import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { messages, modCarian = 'online' } = await req.json(); // Default kepada 'online' (Mod Fatwa Global)
    const latestMessage = messages[messages.length - 1].content;

    // 1. Penjanaan Embedding untuk Soalan Pengguna (1536 Dimensi)
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: latestMessage,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Carian Hibrid (Vector + Full-Text Search) di Supabase
    const isStrict = modCarian === 'strict_pdf';
    const { data: matchedFatwas, error } = await supabase.rpc('hybrid_search_fatwas', {
      query_text: latestMessage,      // Carian kata kunci FTS
      query_embedding: queryEmbedding, // Carian Vektor Semantik
      match_threshold: isStrict ? 0.25 : 0.05, 
      match_count: 5 
    });

    if (error) {
      console.error("🔴 Ralat Supabase:", error);
      throw new Error("Gagal menyambung ke Supabase: " + error.message);
    }

    const availableSources: string[] = [];
    let contextText = '';

    if (matchedFatwas && matchedFatwas.length > 0) {
      matchedFatwas.forEach((f: any) => {
        // Membina format rujukan penuh yang terperinci berserta metadata
        const namaInstitusi = f.negeri ? `[${f.negeri}] ` : '';
        const tahunFatwa = f.tahun ? ` (${f.tahun})` : '';
        const ms = f.mukasurat ? `, M/S: ${f.mukasurat}` : '';
        
        const fullSourceStr = `${namaInstitusi}Dokumen: ${f.source.replace('Dokumen PDF: ', '')}${tahunFatwa}${ms}`.trim();

        if (f.source && !availableSources.includes(fullSourceStr)) {
          availableSources.push(fullSourceStr);
        }
      });

      // Membina konteks dokumen untuk dimasukkan ke dalam prompt Gemini
      contextText = matchedFatwas.map((f: any) => 
        `[Fail: ${f.source} | Muka Surat: ${f.mukasurat || 'N/A'} | Institusi: ${f.negeri || 'N/A'}]\nTajuk: ${f.title}\nKandungan: ${f.content}`
      ).join('\n\n---\n\n');
    }

    // 3. Pembinaan System Prompt Mengikut Mod Carian
    let systemPrompt = '';

    if (isStrict) {
      // --- MOD KHUSUS PDF (STRICT RAG - ZERO HALLUCINATION) ---
      if (!contextText) {
        // Litar pintas (short-circuit) jika tiada sebarang dokumen sepadan dijumpai
        const emptyResponse = {
          tajuk: "Maklumat Tidak Dijumpai",
          bidang: "N/A",
          subTopik: "N/A",
          modTurath: false,
          senaraiMazhab: [],
          fatwaMalaysia: "TIADA DALAM DOKUMEN: Maklumat atau fatwa berkenaan isu ini tidak dijumpai di dalam mana-mana dokumen PDF/kitab yang telah dimuat naik ke dalam pangkalan data.",
          sumberRujukan: []
        };
        return new Response(JSON.stringify(emptyResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      systemPrompt = `Anda adalah enjin carian dokumen Fiqh yang KETAT dan HANYA merujuk teks dokumen.

PERATURAN MUTLAK (STRICT NO-HALLUCINATION):
1. Anda MESTI menjawab soalan pengguna HANYA berdasarkan "Kandungan Dokumen PDF" di bawah.
2. DILARANG SAMA SEKALI menggunakan pengetahuan am anda di luar teks dokumen ini.
3. Jika teks dokumen di bawah tidak mengandungi jawapan, pulangkan fatwaMalaysia: "Maklumat khusus bagi isu ini tiada di dalam dokumen PDF yang dimuat naik." dan senaraiMazhab sebagai array kosong [].

Kandungan Dokumen PDF (Rujukan Tunggal):
${contextText}

Format Jawapan JSON SAHAJA:
{
  "tajuk": "Tajuk Isu",
  "bidang": "Bidang Fiqh",
  "subTopik": "Sub-Topik",
  "modTurath": true,
  "senaraiMazhab": [
    { "nama": "Syafi'i", "hukum": "...", "statusType": "warning", "dalilArab": "...", "rujukan": "Teks PDF", "wajahDalalah": "..." }
  ],
  "fatwaMalaysia": "Huraian fatwa mengikut teks PDF sahaja.",
  "sumberRujukan": ${JSON.stringify(availableSources)}
}`;

    } else {
      // --- MOD FATWA GLOBAL & MALAYSIA (ONLINE / DEFAULT) ---
      systemPrompt = `Anda adalah pakar Perbandingan Mazhab (Muqaranah Fiqh) dan Pembantu AI Fatwa Antarabangsa & Malaysia.
Tugas anda adalah menganalisis isu pengguna secara komprehensif merangkumi:
1. Pandangan 4 Mazhab Utama (Syafi'i, Hanafi, Maliki, Hanbali).
2. Fatwa Tempatan Malaysia (MKI / Mufti Negeri-Negeri).
3. Fatwa Antarabangsa/Dunia (Al-Azhar Egypt, Majma' al-Fiqh al-Islami, AAOIFI, Fatwa Saudi Arabia, dll).

Jika terdapat maklumat daripada pangkalan data di bawah, gabungkannya secara harmoni.

Rujukan Pangkalan Data (Jika Ada):
${contextText || 'Tiada padanan pangkalan data khusus.'}

Format Jawapan JSON SAHAJA:
{
  "tajuk": "Tajuk Isu Fiqh",
  "bidang": "Contoh: Fiqh Muamalat / Ibadah",
  "subTopik": "Sub-Topik",
  "modTurath": true,
  "senaraiMazhab": [
    { "nama": "Syafi'i", "hukum": "...", "statusType": "danger/success/warning", "dalilArab": "...", "rujukan": "...", "wajahDalalah": "..." },
    { "nama": "Hanafi", "hukum": "...", "statusType": "...", "dalilArab": "...", "rujukan": "...", "wajahDalalah": "..." },
    { "nama": "Maliki", "hukum": "...", "statusType": "...", "dalilArab": "...", "rujukan": "...", "wajahDalalah": "..." },
    { "nama": "Hanbali", "hukum": "...", "statusType": "...", "dalilArab": "...", "rujukan": "...", "wajahDalalah": "..." }
  ],
  "fatwaMalaysia": "Huraian Fatwa Malaysia (MKI/Negeri) & Fatwa Antarabangsa/Dunia.",
  "sumberRujukan": ["Keputusan Muzakarah MKI Kali Ke-96 - https://e-fatwa.gov.my", "Piawaian Shariah AAOIFI No. 57"]
}

PERATURAN PENTING UNTUK sumberRujukan:
- Sertakan gabungan sumber pangkalan data (${JSON.stringify(availableSources)}) DAN senarai fatwa rasmi luaran bersama pautan URL rasmi (jika ada, cth: https://e-fatwa.gov.my atau portal rasmi mufti negeri) di dalam array sumberRujukan.`;
    }

    // 5. Panggil Google Gemini menggunakan model gemini-3.6-flash
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.6-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        // PERKARA PALING PENTING: Paksa Gemini keluar JSON sahaja
        responseMimeType: "application/json", 
      }
    });

    const result = await model.generateContent(latestMessage);
    const reply = result.response.text();

    return new Response(reply, { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("🔴 Ralat API Gemini:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}