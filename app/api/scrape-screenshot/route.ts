import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    const extractValidUrl = (input: string | undefined | null): string | null => {
      if (!input || typeof input !== 'string') return null;
      const sanitized = input.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        .replace(/[\u00AB\u00BB]/g, '"')
        .replace(/[\u2039\u203A]/g, "'")
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2026]/g, '...')
        .replace(/[\u00A0]/g, ' ')
        .trim();

      const candidates = sanitized.match(/https?:\/\/[A-Za-z0-9._~%\-]+(?::\d+)?[^\s'"<>]*/gi) || [];
      for (const c of candidates) {
        try {
          const u = new URL(c);
          const host = u.hostname;
          const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
          const hasDot = host.includes('.');
          if (host === 'localhost' || isIp || hasDot) {
            return u.toString();
          }
        } catch { }
      }

      const tokens = sanitized.split(/\s+/);
      for (const t of tokens) {
        const cleaned = t.replace(/[.,;:!?]+$/, '');
        if (/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([\/:?#].*)?$/.test(cleaned)) {
          try {
            const u = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`);
            return u.toString();
          } catch { }
        }
      }
      return null;
    };

    const parsedUrl = extractValidUrl(url);
    if (!parsedUrl) {
      return NextResponse.json({ error: 'Invalid or missing URL. Please provide a valid http(s) URL.' }, { status: 400 });
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
        url: parsedUrl,
        formats: ['screenshot'], // Regular viewport screenshot, not full page
        waitFor: 3000, // Wait for page to fully load
        timeout: 30000,
        blockAds: true
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
