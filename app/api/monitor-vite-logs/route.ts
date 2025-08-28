import { NextResponse } from 'next/server';

declare global {
  var activeSandboxId: string | null;
}

export async function GET() {
  if (!global.activeSandboxId) {
    return NextResponse.json({ success: false, error: 'No active sandbox' }, { status: 400 });
  }
  // Placeholder: monitoring not implemented for sandboxd
  return NextResponse.json({ success: true, logs: [] });
}
