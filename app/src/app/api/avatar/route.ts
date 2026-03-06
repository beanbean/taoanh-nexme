import { NextRequest, NextResponse } from 'next/server';
import { isAllowedAvatarUrl, isValidImageContentType } from '@/lib/security';

// Avatar proxy endpoint: fetches avatar from allowed domains and returns binary image.
// Avoids CORS issues when client needs base64 conversion for render API.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const urlValidation = isAllowedAvatarUrl(url);
  if (!urlValidation.valid) {
    return NextResponse.json(
      { error: urlValidation.error || 'Invalid URL' },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!isValidImageContentType(contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const imageData = await response.arrayBuffer();

    // Limit size to 5MB
    if (imageData.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Avatar fetch timeout' }, { status: 504 });
    }
    console.error('[Avatar Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
