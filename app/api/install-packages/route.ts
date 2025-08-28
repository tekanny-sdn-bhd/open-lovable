import { NextRequest, NextResponse } from 'next/server';
import { execSandbox } from '@/lib/sandboxd';

declare global {
  var activeSandboxId: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { packages } = await request.json();
    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json({ success: false, error: 'Packages array is required' }, { status: 400 });
    }
    if (!global.activeSandboxId) {
      return NextResponse.json({ success: false, error: 'No active sandbox available' }, { status: 400 });
    }
    const pkgList = packages.join(' ');
    const result = await execSandbox(global.activeSandboxId, `cd /home/user/app && pnpm add ${pkgList}`);
    return NextResponse.json({ success: result.code === 0, output: result.stdout, error: result.stderr });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
