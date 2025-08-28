// Prefer SANDBOX_URL (external sandboxd), fallback to legacy SANDBOXD_URL
const BASE_URL = process.env.SANDBOX_URL || process.env.SANDBOXD_URL || 'http://localhost:7070';
const API_KEY = process.env.SANDBOX_API_KEY;

function authHeaders(extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  return headers;
}

export interface SandboxInfo {
  id: string;
  host?: string;
  port?: number;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { headers: authHeaders() });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createSandbox(preset: 'node' | 'node+playwright' = 'node'): Promise<SandboxInfo> {
  const res = await fetch(`${BASE_URL}/sandbox`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ preset })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sandbox create failed: ${res.status} ${text}`);
  }
  return res.json();
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export async function execSandbox(id: string, cmd: string, opts?: { cwd?: string; timeoutMs?: number }): Promise<ExecResult> {
  const res = await fetch(`${BASE_URL}/sandbox/${id}/exec`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ cmd, cwd: opts?.cwd, timeoutMs: opts?.timeoutMs })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'exec failed');
  }
  return data;
}

export async function writeFile(id: string, filePath: string, content: string | Uint8Array | Buffer) {
  const res = await fetch(`${BASE_URL}/sandbox/${id}/files?path=${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'text/plain' }),
    body: content as any
  });
  if (!res.ok) {
    throw new Error(`write failed: ${await res.text()}`);
  }
}

export async function readFile(id: string, filePath: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/sandbox/${id}/files?path=${encodeURIComponent(filePath)}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`read failed: ${res.status}`);
  }
  return res.text();
}

export async function exposePort(id: string, port: number): Promise<{ url: string }> {
  const res = await fetch(`${BASE_URL}/sandbox/${id}/expose`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ port })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`expose failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function deleteSandbox(id: string) {
  await fetch(`${BASE_URL}/sandbox/${id}`, { method: 'DELETE', headers: authHeaders() });
}
