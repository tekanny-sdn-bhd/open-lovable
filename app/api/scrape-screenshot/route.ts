import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const FIRECRAWL_BASE_URL = process.env.FIRECRAWL_BASE_URL ?? 'https://api.firecrawl.dev/v1';
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    const FIRECRAWL_DISABLE_AUTH = (process.env.FIRECRAWL_DISABLE_AUTH || '').toLowerCase() === 'true';
    const isLocalBase = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/.test(FIRECRAWL_BASE_URL);

    if (!FIRECRAWL_API_KEY && !FIRECRAWL_DISABLE_AUTH && !isLocalBase) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    // Use Firecrawl API to capture screenshot
    const firecrawlResponse = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        ...(FIRECRAWL_API_KEY && !FIRECRAWL_DISABLE_AUTH ? { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` } : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['screenshot'], // Regular viewport screenshot, not full page
        waitFor: 3000, // Wait for page to fully load
        timeout: 30000,
        blockAds: true,
        actions: [
          {
            type: 'wait',
            milliseconds: 2000 // Additional wait for dynamic content
          }
        ]
      })
    });

    if (!firecrawlResponse.ok) {
      const error = await firecrawlResponse.text();
      throw new Error(`Firecrawl API error: ${error}`);
    }

    const data = await firecrawlResponse.json();
    
    if (!data.success || !data.data?.screenshot) {
      throw new Error('Failed to capture screenshot');
    }

    return NextResponse.json({
      success: true,
      screenshot: data.data.screenshot,
      metadata: data.data.metadata
    });

  } catch (error: any) {
    console.error('Screenshot capture error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to capture screenshot' 
    }, { status: 500 });
  }
}
