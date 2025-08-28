import { NextRequest, NextResponse } from 'next/server';

declare global {
  var activeSandboxId: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();
    if (!files || typeof files !== 'object') {
      return NextResponse.json({ success: false, error: 'Files object is required' }, { status: 400 });
    }
    if (!global.activeSandboxId) {
      return NextResponse.json({ success: false, error: 'No active sandbox' }, { status: 404 });
    }
    const imports = new Set<string>();
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)?(?:from\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue;
      if (!filePath.match(/\.(jsx?|tsx?)$/)) continue;
      let match;
      while ((match = importRegex.exec(content)) !== null) imports.add(match[1]);
      while ((match = requireRegex.exec(content)) !== null) imports.add(match[1]);
    }
    const packages = Array.from(imports).filter(imp => !imp.startsWith('.') && !imp.startsWith('/'))
      .map(pkg => pkg.startsWith('@') ? pkg.split('/').slice(0,2).join('/') : pkg.split('/')[0]);
    const uniquePackages = [...new Set(packages)];
    if (uniquePackages.length === 0) {
      return NextResponse.json({ success: true, packagesInstalled: [], message: 'No new packages to install' });
    }
    const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/install-packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packages: uniquePackages })
    });
    const data = await resp.json();
    return NextResponse.json({ success: true, packagesInstalled: uniquePackages, installResult: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
