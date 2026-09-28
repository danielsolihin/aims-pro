import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// @ts-ignore
const PDFParser = require('pdf2json');

dotenv.config({ path: '.env.local' });

// Gunakan SERVICE_ROLE_KEY atau ANON_KEY jika SERVICE_ROLE_KEY tiada
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("🔴 RALAT: Kunci Supabase tidak dijumpai dalam .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi nyahkod kalis ralat untuk teks PDF (Mengelakkan URIError: URI malformed)
function safeDecodePdfText(encodedStr: string): string {
  try {
    return decodeURIComponent(encodedStr);
  } catch {
    try {
      // Penyahkodan alternatif bagi aksara khas / simbol tidak sah
      const binaryStr = unescape(encodedStr);
      return Buffer.from(binaryStr, 'binary').toString('utf-8');
    } catch {
      return encodedStr;
    }
  }
}

// Fungsi Pembaca PDF menggunakan pdf2json
async function extractPdfText(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1); 

    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
    
    pdfParser.on("pdfParser_dataReady", () => {
      const rawText = pdfParser.getRawTextContent();
      const text = safeDecodePdfText(rawText);
      resolve(text);
    });

    pdfParser.loadPDF(filePath);
  });
}

// Fungsi pemotongan teks (Chunking)
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  // Bersihkan teks daripada baris terputus dan ruang kosong berlebihan
  const cleanText = text.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, ' ');

  while (start < cleanText.length) {
    const end = start + chunkSize;
    const chunk = cleanText.slice(start, end).trim();
    if (chunk.length > 50) { // Abaikan perenggan yang terlalu pendek
      chunks.push(chunk);
    }
    start += chunkSize - overlap;
  }
  return chunks;
}

async function muatNaikPDF() {
  const pdfDir = path.join(process.cwd(), 'data', 'pdfs');

  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
    console.log(`📁 Folder 'data/pdfs' telah dicipta. Sila letak fail PDF di dalam folder tersebut.`);
    return;
  }

  const files = fs.readdirSync(pdfDir).filter(f => f.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.log('⚠️ Tiada fail PDF dijumpai dalam folder data/pdfs/');
    return;
  }

  console.log(`🚀 Dijumpai ${files.length} fail PDF. Mula memproses penyuapan data...\n`);

  for (const file of files) {
    console.log(`📄 Membaca fail: ${file}`);
    const filePath = path.join(pdfDir, file);

    try {
      // 1. Ekstrak teks dari fail PDF guna penyahkod selamat
      const fullText = await extractPdfText(filePath);

      if (!fullText || !fullText.trim()) {
        console.log(`⚠️ Fail ${file} tiada teks (kemungkinan dokumen imbasan/scan sahaja).`);
        continue;
      }

      // 2. Pecahkan teks panjang kepada perenggan kecil (Chunking)
      const chunks = chunkText(fullText, 1000, 200);
      console.log(`   └─ Dipecahkan kepada ${chunks.length} bahagian (chunks).`);

      // 3. Proses setiap chunk ke OpenAI dan Supabase
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const title = `${file.replace('.pdf', '')} - Bahagian ${i + 1}`;

        // Jana Vektor
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: `Tajuk: ${title}\nKandungan: ${chunk}`,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Simpan ke Supabase
        const { error } = await supabase.from('fatwas').insert({
          title: title,
          content: chunk,
          source: `Dokumen PDF: ${file}`,
          embedding: embedding,
        });

        if (error) {
          console.error(`   ❌ Gagal simpan bahagian ${i + 1}: ${error.message}`);
        } else {
          console.log(`   ✅ Bahagian ${i + 1}/${chunks.length} disimpan.`);
        }

        // Jeda 500ms untuk mengelakkan halangan Rate Limit API
        await delay(500);
      }

    } catch (err: any) {
      console.error(`🔴 Ralat semasa memproses ${file}:`, err.message || err);
    }

    console.log(`--------------------------------------------------`);
  }

  console.log('\n🎉 Selesai memuat naik semua dokumen PDF ke Supabase!');
}

muatNaikPDF();