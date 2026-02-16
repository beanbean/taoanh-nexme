import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const filename = request.nextUrl.searchParams.get('filename') || 'image.png';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', blob.type || 'image/png');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Error proxying download:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
