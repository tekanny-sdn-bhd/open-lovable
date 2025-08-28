import { NextResponse } from 'next/server';
import { readFile } from '@/lib/sandboxd';

declare global {
  var activeSandboxId: string | null;
  var existingFiles: Set<string>;
}

declare global {
  var activeSandboxId: string | null;
}

export async function GET() {
  if (!global.activeSandboxId) {
    return NextResponse.json({ success: false, error: 'No active sandbox' }, { status: 404 });
  }

  try {
    const sandboxId = global.activeSandboxId;
    const paths = global.existingFiles ? Array.from(global.existingFiles) : [];
    const files: Record<string, string> = {};

    for (const rel of paths) {
      try {
        const full = `/home/user/app/${rel}`;
        const content = await readFile(sandboxId!, full);
        files[rel] = content;
      } catch {
        // Skip unreadable files
      }
    }

    const manifest = { paths };

    return NextResponse.json({ success: true, files, manifest });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
