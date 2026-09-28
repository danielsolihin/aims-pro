import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Membenarkan semua permintaan diteruskan tanpa sekatan log masuk
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Mengecualikan laluan berikut daripada sebarang gangguan middleware:
     * - _next/static (fail sistem Next.js)
     * - _next/image (fail imej teroptimum)
     * - favicon.ico (ikon tapak web)
     * - Semua jenis fail gambar (svg, png, jpg, dll)
     * - api (PENTING: Membebaskan laluan /api/chat kita daripada ralat 404)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};