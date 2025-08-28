import { NextRequest, NextResponse } from 'next/server';
import { execSandbox } from '@/lib/sandboxd';

// Get active sandbox from global state (in production, use a proper state management solution)
declare global {
  var activeSandboxId: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();
    
    if (!command) {
      return NextResponse.json({ 
        success: false, 
        error: 'Command is required' 
      }, { status: 400 });
    }
    
    if (!global.activeSandboxId) {
      return NextResponse.json({
        success: false,
        error: 'No active sandbox'
      }, { status: 400 });
    }
    
    console.log(`[run-command] Executing: ${command}`);
    
    const result = await execSandbox(global.activeSandboxId!, `cd /home/user/app && ${command}`);
    const output = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
    
    return NextResponse.json({
      success: true,
      output,
      message: 'Command executed successfully'
    });
    
  } catch (error) {
    console.error('[run-command] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}