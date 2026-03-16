import { NextRequest, NextResponse } from 'next/server';
import type { RenderRequest, RenderResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequest = await request.json();

    const renderApiUrl = process.env.RENDER_API_URL;
    const renderApiKey = process.env.RENDER_API_KEY;

    if (!renderApiUrl || !renderApiKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const url = `${renderApiUrl}?api_key=${renderApiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Render API] Error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to render image' },
        { status: response.status }
      );
    }

    const result = await response.json();

    const renderResponse: RenderResponse = {
      success: true,
      image_url: result.image_url || result.url,
      filename: result.filename,
    };

    return NextResponse.json(renderResponse);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Render API timeout' },
        { status: 504 }
      );
    }
    console.error('[Render API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
