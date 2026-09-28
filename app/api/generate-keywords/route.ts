import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

function generateDynamicFallback(rubricName: string, title: string, synopsis: string, skop: string): string {
  const stopWords = new Set(['dalam', 'dan', 'yang', 'dengan', 'pada', 'untuk', 'secara', 'mengenai', 'terhadap', 'ia', 'tentang', 'bagaimana', 'membina', 'membincangkan']);
  const combinedText = `${title} ${synopsis} ${skop}`.toLowerCase();
  
  const words = combinedText
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  const uniqueTitleKeywords = Array.from(new Set(words));
  let baseRubricTerms: string[] = [];
  const lowerRubric = (rubricName || '').toLowerCase();
  
  if (lowerRubric.includes('pendahuluan') || lowerRubric.includes('latar belakang')) {
    baseRubricTerms = ['definisi', 'latar belakang', 'konsep', 'objektif'];
  } else if (lowerRubric.includes('isi') || lowerRubric.includes('dalil')) {
    baseRubricTerms = ['dalil', 'hukum', 'pandangan ulama', 'prinsip'];
  } else if (lowerRubric.includes('perbincangan') || lowerRubric.includes('muqaranah')) {
    baseRubricTerms = ['analisis', 'perbandingan', 'isu kontemporari', 'implikasi'];
  } else if (lowerRubric.includes('rumusan') || lowerRubric.includes('cadangan')) {
    baseRubricTerms = ['kesimpulan', 'cadangan', 'iktibar', 'resolusi'];
  } else {
    baseRubricTerms = ['rujukan', 'sumber', 'bahan ilmiah', 'format'];
  }

  return Array.from(new Set([...baseRubricTerms, ...uniqueTitleKeywords])).slice(0, 8).join(', ');
}

export async function POST(req: Request) {
  let rubricName = '';
  let courseTitle = '';
  let synopsis = '';
  let skop = '';
  
  try {
    const body = await req.json();
    rubricName = body.rubricName || '';
    courseTitle = body.courseTitle || '';
    synopsis = body.synopsis || '';
    skop = body.skop || '';

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Tiada API Key dijumpai dalam .env');

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: "application/json", 
        temperature: 0.1 
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    const prompt = `You are a strict academic evaluator.
    TASK:
    1. Analyze the provided COURSE TITLE, SYNOPSIS, and SCOPE.
    2. Detect the exact language used in those texts (Arabic, English, or Malay).
    3. Generate 6 to 8 precise academic keywords for the evaluation rubric: "${rubricName}".
    4. CRITICAL RULE: The generated keywords MUST be completely translated into the DETECTED LANGUAGE. 
       - If the title is Arabic, keywords MUST be Arabic (Fusha) and direction "rtl".
       - If the title is English, keywords MUST be English and direction "ltr".
       - If the title is Malay, keywords MUST be Malay and direction "ltr".

    COURSE TITLE: "${courseTitle}"
    SYNOPSIS: "${synopsis}"
    SCOPE: "${skop}"

    OUTPUT STRICTLY VALID JSON:
    { 
      "detected_language": "Arabic" | "English" | "Bahasa Melayu",
      "direction": "rtl" | "ltr",
      "keywords": "keyword1, keyword2, keyword3" 
    }`;

    const result = await model.generateContent(prompt);
    let replyText = result.response.text();
    
    const jsonMatch = replyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format AI tidak sah");
    
    const parsedData = JSON.parse(jsonMatch[0]);
    const keywords = parsedData.keywords || '';
    
    const isArabic = /[\u0600-\u06FF]/.test(keywords);
    const detected_language = isArabic ? "Arabic" : (parsedData.detected_language || 'Bahasa Melayu');
    const direction = isArabic ? "rtl" : "ltr";

    if (keywords && keywords.length > 3) {
      return NextResponse.json({ keywords, detected_language, direction, source: 'ai' });
    } else {
      throw new Error('Jawapan AI kosong');
    }

  } catch (error: any) {
    console.error(">>> RALAT GEMINI API:", error.message);
    
    // PERUBAHAN SEMENTARA UNTUK DEBUGGING: 
    // Memaparkan ralat sebenar ke dalam kotak input di antaramuka
    return NextResponse.json({ 
      keywords: "RALAT API: " + error.message, 
      detected_language: 'RALAT',
      direction: 'ltr',
      source: 'fallback',
    });
  }
}