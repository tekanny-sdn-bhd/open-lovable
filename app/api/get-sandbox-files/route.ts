import { NextResponse } from 'next/server';

declare global {
  var activeSandboxId: string | null;
}

export async function GET() {
  if (!global.activeSandboxId) {
    return NextResponse.json({ success: false, error: 'No active sandbox' }, { status: 404 });
  }
  return NextResponse.json({ success: false, error: 'get-sandbox-files not implemented' }, { status: 501 });
}
