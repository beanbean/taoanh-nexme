import { NextRequest, NextResponse } from 'next/server';
import type { RenderRequest, RenderResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequest = await request.json();

    // Debug: log avatar info (only first few chars)
    const data = body.data as any;
    if (data.avatar_url !== undefined) {
      const avatarPreview = String(data.avatar_url || '').substring(0, 50);
      console.log('[Render API] Personal avatar_url length:', data.avatar_url?.length || 0, 'preview:', avatarPreview);
    }
    if (data.players) {
      data.players.forEach((p: any, i: number) => {
        const avatarPreview = String(p.avatar || '').substring(0, 50);
        console.log(`[Render API] Team player[${i}] avatar length:`, p.avatar?.length || 0, 'preview:', avatarPreview);
      });
    }

    const renderApiUrl = process.env.RENDER_API_URL;
    const renderApiKey = process.env.RENDER_API_KEY;

    if (!renderApiUrl || !renderApiKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const url = `${renderApiUrl}?api_key=${renderApiKey}`;

    console.log('[Render API] Sending to:', url);
    console.log('[Render API] Body size:', JSON.stringify(body).length, 'bytes');

    // Debug: log the full request body to see what data is being sent
    console.log('[Render API] Request body template:', body.template);
    const dataPayload = body.data as any;
    if (dataPayload.avatar_url) {
      console.log('[Render API] avatar_url present, first 100 chars:', dataPayload.avatar_url.substring(0, 100));
    } else {
      console.log('[Render API] WARNING: avatar_url is missing in payload!');
    }
    console.log('[Render API] Full data keys:', Object.keys(dataPayload));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Render API] Error response:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to render image' },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[Render API] Result:', JSON.stringify(result));

    const renderResponse: RenderResponse = {
      success: true,
      image_url: result.image_url || result.url,
      filename: result.filename,
    };

    return NextResponse.json(renderResponse);
  } catch (error) {
    console.error('Error in render API route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
