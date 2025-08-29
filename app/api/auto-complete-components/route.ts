import { NextRequest, NextResponse } from 'next/server';

// Minimal stub endpoint to avoid 404s when apply-ai-code tries to auto-complete missing components.
// This can be expanded later to actually generate and write placeholder components.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const missingImports: string[] = Array.isArray(body?.missingImports) ? body.missingImports : [];

    return NextResponse.json({
      success: false,
      message: 'auto-complete-components not implemented',
      missing: missingImports,
      components: [],
      files: 0,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

