import { NextRequest, NextResponse } from 'next/server';
import { isValidUrl, sanitizeFilename, isValidImageContentType } from '@/lib/security';

// Allowed domains for download (same as avatar for now)
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
  'supabase.co', // For Supabase storage URLs
];

function isAllowedDownloadUrl(urlString: string): { valid: boolean; error?: string } {
  // First, basic URL validation
  const basicCheck = isValidUrl(urlString);
  if (!basicCheck.valid) {
    return basicCheck;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Check if hostname ends with any allowed domain
    const isAllowed = ALLOWED_DOWNLOAD_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain not allowed. Allowed domains: ${ALLOWED_DOWNLOAD_DOMAINS.join(', ')}`
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const filename = request.nextUrl.searchParams.get('filename') || 'image.png';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Security: Validate URL to prevent SSRF
  const urlValidation = isAllowedDownloadUrl(url);
  if (!urlValidation.valid) {
    console.error('[Download API] URL validation failed:', urlValidation.error);
    return NextResponse.json(
      { error: urlValidation.error || 'Invalid URL' },
      { status: 400 }
    );
  }

  // Security: Sanitize filename to prevent path traversal
  const safeFilename = sanitizeFilename(filename);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for downloads

    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Security: Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!isValidImageContentType(contentType)) {
      console.error('[Download API] Invalid content type:', contentType);
      return NextResponse.json(
        { error: 'Invalid content type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Security: Limit file size (max 10MB for downloads)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      console.error('[Download API] File too large:', contentLength);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', blob.type || 'image/png');
    headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    // Security: Add headers to prevent XSS
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Error proxying download:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
