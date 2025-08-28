const BASE_URL = process.env.SANDBOXD_URL || 'http://localhost:4000';

export interface SandboxInfo {
  id: string;
  host: string;
  port: number;
}

export async function createSandbox(): Promise<SandboxInfo> {
  const res = await fetch(`${BASE_URL}/sandbox`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`sandbox create failed: ${res.status}`);
  }
  return res.json();
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export async function execSandbox(id: string, cmd: string): Promise<ExecResult> {
  const res = await fetch(`${BASE_URL}/sandbox/${id}/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'exec failed');
  }
  return data;
}

export async function writeFile(id: string, filePath: string, content: string) {
  const res = await fetch(`${BASE_URL}/sandbox/${id}/files?path=${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: content
  });
  if (!res.ok) {
    throw new Error(`write failed: ${await res.text()}`);
  }
}

export async function readFile(id: string, filePath: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/sandbox/${id}/files?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    throw new Error(`read failed: ${res.status}`);
  }
  return res.text();
}

export async function deleteSandbox(id: string) {
  await fetch(`${BASE_URL}/sandbox/${id}`, { method: 'DELETE' });
}
