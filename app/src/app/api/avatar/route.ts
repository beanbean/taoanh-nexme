import { NextRequest, NextResponse } from 'next/server';
import { isAllowedAvatarUrl, isValidImageContentType } from '@/lib/security';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    console.error('[Avatar API] Missing url parameter');
    return NextResponse.json({ error: 'Missing url parameter', dataUrl: '' }, { status: 400 });
  }

  // Security: Validate URL to prevent SSRF
  const urlValidation = isAllowedAvatarUrl(url);
  if (!urlValidation.valid) {
    console.error('[Avatar API] URL validation failed:', urlValidation.error);
    return NextResponse.json(
      { error: urlValidation.error || 'Invalid URL', dataUrl: '' },
      { status: 400 }
    );
  }

  console.log('[Avatar API] Fetching avatar from:', url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Avatar API] Failed to fetch, status:', response.status);
      return NextResponse.json({ error: 'Failed to fetch image', dataUrl: '' }, { status: response.status });
    }

    // Security: Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!isValidImageContentType(contentType)) {
      console.error('[Avatar API] Invalid content type:', contentType);
      return NextResponse.json(
        { error: 'Invalid content type. Only images are allowed.', dataUrl: '' },
        { status: 400 }
      );
    }

    // Security: Limit file size (max 5MB for avatars)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      console.error('[Avatar API] File too large:', contentLength);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.', dataUrl: '' },
        { status: 400 }
      );
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = blob.type || 'image/jpeg';

    const dataUrl = `data:${mimeType};base64,${base64}`;
    console.log('[Avatar API] Successfully converted to data URL, mimeType:', mimeType, 'size:', base64.length);

    return NextResponse.json({
      base64,
      mimeType,
      dataUrl
    });
  } catch (error) {
    console.error('[Avatar API] Error proxying avatar:', error);
    // Return empty dataUrl on error instead of throwing
    return NextResponse.json({ error: 'Failed to fetch avatar', details: String(error), dataUrl: '' }, { status: 200 });
  }
}
