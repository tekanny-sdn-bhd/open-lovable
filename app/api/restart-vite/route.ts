import { NextResponse } from 'next/server';

declare global {
  var activeSandboxId: string | null;
}

export async function POST() {
  try {
    if (!global.activeSandboxId) {
      return NextResponse.json({
        success: false,
        error: 'No active sandbox'
      }, { status: 400 });
    }
    
    console.log('[restart-vite] Forcing Vite restart...');
    
    // Kill existing Vite process and restart
    const result = await (await import('@/lib/sandboxd')).execSandbox(global.activeSandboxId, `cd /home/user/app && pkill -f vite || true && npm run dev &`);

    return NextResponse.json({
      success: true,
      message: 'Vite restarted successfully',
      output: result.stdout
    });
    
  } catch (error) {
    console.error('[restart-vite] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}