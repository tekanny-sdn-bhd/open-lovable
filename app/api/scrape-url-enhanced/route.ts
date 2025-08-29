import { NextRequest, NextResponse } from 'next/server';

// Function to sanitize smart quotes and other problematic characters
function sanitizeQuotes(text: string): string {
  return text
    // Replace smart single quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    // Replace smart double quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Replace other quote-like characters
    .replace(/[\u00AB\u00BB]/g, '"') // Guillemets
    .replace(/[\u2039\u203A]/g, "'") // Single guillemets
    // Replace other problematic characters
    .replace(/[\u2013\u2014]/g, '-') // En dash and em dash
    .replace(/[\u2026]/g, '...') // Ellipsis
    .replace(/[\u00A0]/g, ' '); // Non-breaking space
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    // Extract a valid URL from potentially free-form input (e.g., "Help me clone https://example.com")
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

      // 1) Try to find all http(s) tokens and pick the first parseable, valid host
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

      // 2) Fallback: look for a bare domain token and prepend https://
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
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing URL. Please provide a valid http(s) URL.'
      }, { status: 400 });
    }

    console.log('[scrape-url-enhanced] Scraping with Firecrawl:', parsedUrl);

    const FIRECRAWL_BASE_URL = process.env.FIRECRAWL_BASE_URL ?? 'https://api.firecrawl.dev/v1';
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    const FIRECRAWL_DISABLE_AUTH = (process.env.FIRECRAWL_DISABLE_AUTH || '').toLowerCase() === 'true';
    const isLocalBase = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/.test(FIRECRAWL_BASE_URL);

    if (!FIRECRAWL_API_KEY && !FIRECRAWL_DISABLE_AUTH && !isLocalBase) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    // Make request to Firecrawl API with maxAge for 500% faster scraping
    const firecrawlResponse = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        ...(FIRECRAWL_API_KEY && !FIRECRAWL_DISABLE_AUTH ? { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` } : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: parsedUrl,
        formats: ['markdown', 'html'],
        waitFor: 3000,
        timeout: 30000,
        blockAds: true,
        maxAge: 3600000, // Use cached data if less than 1 hour old (500% faster!)
      })
    });

    if (!firecrawlResponse.ok) {
      const error = await firecrawlResponse.text();
      throw new Error(`Firecrawl API error: ${error}`);
    }

    const data = await firecrawlResponse.json();

    if (!data.success || !data.data) {
      throw new Error('Failed to scrape content');
    }

    const { markdown, html, metadata } = data.data;

    // Sanitize the markdown content
    const sanitizedMarkdown = sanitizeQuotes(markdown || '');

    // Extract structured data from the response
    const title = metadata?.title || '';
    const description = metadata?.description || '';

    // Format content for AI
    const formattedContent = `
Title: ${sanitizeQuotes(title)}
Description: ${sanitizeQuotes(description)}
URL: ${parsedUrl}

Main Content:
${sanitizedMarkdown}
    `.trim();

    return NextResponse.json({
      success: true,
      url: parsedUrl,
      content: formattedContent,
      structured: {
        title: sanitizeQuotes(title),
        description: sanitizeQuotes(description),
        content: sanitizedMarkdown,
        url: parsedUrl
      },
      metadata: {
        scraper: 'firecrawl-enhanced',
        timestamp: new Date().toISOString(),
        contentLength: formattedContent.length,
        cached: data.data.cached || false, // Indicates if data came from cache
        ...metadata
      },
      message: 'URL scraped successfully with Firecrawl (with caching for 500% faster performance)'
    });

  } catch (error) {
    console.error('[scrape-url-enhanced] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
