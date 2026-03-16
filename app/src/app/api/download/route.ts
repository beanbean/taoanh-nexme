import { NextRequest, NextResponse } from 'next/server';
import { isValidUrl, sanitizeFilename, isValidImageContentType } from '@/lib/security';

const ALLOWED_DOWNLOAD_DOMAINS = [
  'googleusercontent.com',
  'lh3.google.com',
  'lh4.google.com',
  'lh5.google.com',
  'lh6.google.com',
  'gravatar.com',
  'secure.gravatar.com',
  'avatars.githubusercontent.com',
  'github.com',
  'supabase.co',
  'nexme.vn',
];

function isAllowedDownloadUrl(urlString: string): { valid: boolean; error?: string } {
  const basicCheck = isValidUrl(urlString);
  if (!basicCheck.valid) return basicCheck;

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    const isAllowed = ALLOWED_DOWNLOAD_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return { valid: false, error: 'Domain not allowed' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const filename = request.nextUrl.searchParams.get('filename') || 'image.png';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const urlValidation = isAllowedDownloadUrl(url);
  if (!urlValidation.valid) {
    return NextResponse.json(
      { error: urlValidation.error || 'Invalid URL' },
      { status: 400 }
    );
  }

  const safeFilename = sanitizeFilename(filename);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!isValidImageContentType(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Stream the response body directly instead of buffering into blob
    if (!response.body) {
      return NextResponse.json({ error: 'Empty response body' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType || 'image/png');
    headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    headers.set('X-Content-Type-Options', 'nosniff');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(response.body, { headers });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Download timeout' }, { status: 504 });
    }
    console.error('[Download API] Error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
