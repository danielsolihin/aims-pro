import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Nyahkod teks PDF dengan selamat
function safeDecodePdfText(encodedStr: string): string {
  try { 
    return decodeURIComponent(encodedStr); 
  } catch { 
    try {
      const binaryStr = unescape(encodedStr);
      return Buffer.from(binaryStr, 'binary').toString('utf-8');
    } catch {
      return encodedStr;
    }
  }
}

interface PageData { mukasurat: number; text: string; }

// Ekstrak PDF mengikut Muka Surat
function extractPagesFromBuffer(buffer: Buffer): Promise<PageData[]> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    const PDFParser = require('pdf2json');
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const pagesInfo = pdfData.formImage?.Pages || pdfData.Pages || [];
        const extracted: PageData[] = [];
        
        pagesInfo.forEach((page: any, index: number) => {
          let pageStr = '';
          if (page.Texts) {
            page.Texts.forEach((t: any) => {
              if (t.R && t.R[0]) pageStr += safeDecodePdfText(t.R[0].T) + ' ';
            });
          }
          if (pageStr.trim().length > 0) {
            extracted.push({ mukasurat: index + 1, text: pageStr });
          }
        });
        
        resolve(extracted.length > 0 ? extracted : [{ mukasurat: 1, text: safeDecodePdfText(pdfParser.getRawTextContent()) }]);
      } catch (e) {
        resolve([{ mukasurat: 1, text: safeDecodePdfText(pdfParser.getRawTextContent()) }]);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

// Chunking mengikut Muka Surat
function chunkPages(pages: PageData[], chunkSize = 1000, overlap = 200) {
  const chunks: { text: string; mukasurat: number }[] = [];
  
  for (const page of pages) {
    const cleanText = page.text.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ');
    let start = 0;
    while (start < cleanText.length) {
      const end = start + chunkSize;
      const chunkStr = cleanText.slice(start, end).trim();
      if (chunkStr.length > 50) {
        chunks.push({ text: chunkStr, mukasurat: page.mukasurat });
      }
      start += chunkSize - overlap;
    }
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tahunStr = formData.get('tahun') as string;
    const negeriStr = formData.get('negeri') as string;

    const tahun = tahunStr ? parseInt(tahunStr) : null;
    const negeri = negeriStr ? negeriStr.trim() : null;

    if (!file) {
      return NextResponse.json({ error: 'Sila pilih fail PDF.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pages = await extractPagesFromBuffer(buffer);
    const chunks = chunkPages(pages, 1000, 200);
    const fileName = file.name;
    let successCount = 0;

    console.log(`\n📄 [Upload Admin] Memproses: ${fileName}`);
    console.log(`📄 [Upload Admin] Dikesan ${pages.length} muka surat | ${chunks.length} bahagian (chunks).`);

    for (let i = 0; i < chunks.length; i++) {
      const { text, mukasurat } = chunks[i];
      const title = `${fileName.replace('.pdf', '')} - MS ${mukasurat} (Bhgn ${i + 1})`;

      // 1. Jana embedding OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: `Tajuk: ${title}\nKandungan: ${text}`,
      });

      // 2. Simpan ke Supabase
      const { error } = await supabase.from('fatwas').insert({
        title: title,
        content: text,
        source: `Dokumen PDF: ${fileName}`,
        embedding: embeddingResponse.data[0].embedding,
        mukasurat: mukasurat,
        tahun: tahun,
        negeri: negeri
      });

      if (!error) {
        successCount++;
      } else {
        // Cetak ralat secara langsung ke Terminal VS Code jika Supabase menolak data
        console.error(`🔴 Ralat Simpan Chunk ${i + 1}/${chunks.length}:`);
        console.error(`   Mesej: ${error.message}`);
        console.error(`   Kod Ralat: ${error.code}`);
        console.error(`   Butiran: ${error.details || 'Tiada'}`);
      }
    }

    console.log(`✅ [Upload Admin] Selesai! Berjaya menyimpan ${successCount}/${chunks.length} bahagian ke Supabase.\n`);

    return NextResponse.json({
      message: `Berjaya memproses ${fileName}`,
      totalChunks: chunks.length,
      savedChunks: successCount,
      fileName,
    });
  } catch (err: any) {
    console.error("🔴 Ralat Pelayan API Admin Upload:", err);
    return NextResponse.json({ error: err.message || 'Ralat semasa memproses PDF.' }, { status: 500 });
  }
}