import { NextResponse } from 'next/server';
import { execSandbox } from '@/lib/sandboxd';

declare global {
  var activeSandboxId: string | null;
}

export async function GET() {
  if (!global.activeSandboxId) {
    return NextResponse.json({ success: false, error: 'No active sandbox' }, { status: 400 });
  }
  const result = await execSandbox(global.activeSandboxId, 'tail -n 100 /tmp/vite.log || true');
  return NextResponse.json({ success: true, logs: result.stdout });
}
