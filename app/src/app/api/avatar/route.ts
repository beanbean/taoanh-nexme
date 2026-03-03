import { NextRequest, NextResponse } from 'next/server';
import { isAllowedAvatarUrl } from '@/lib/security';

// Lightweight avatar URL validation endpoint.
// Returns the validated URL directly — no fetching or base64 conversion.
// The external render API (render.nexme.vn) handles avatar fetching.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter', url: '' }, { status: 400 });
  }

  const urlValidation = isAllowedAvatarUrl(url);
  if (!urlValidation.valid) {
    return NextResponse.json(
      { error: urlValidation.error || 'Invalid URL', url: '' },
      { status: 400 }
    );
  }

  return NextResponse.json({ url });
}
