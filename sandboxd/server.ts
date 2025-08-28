import express from 'express';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const app = express();
app.use(express.json({ limit: '50mb' }));

const containers = new Map<string, { port: number }>();
const IMAGE = process.env.SANDBOX_IMAGE || 'sandbox-image';

function docker(args: string[]) {
  return spawnSync('docker', args, { encoding: 'utf8' });
}

app.post('/sandbox', (_req, res) => {
  const id = randomUUID();
  const port = 5500 + Math.floor(Math.random() * 1000);
  const args = [
    'run', '-d', '--rm',
    '--name', id,
    '--security-opt', 'no-new-privileges',
    '--pids-limit', '512',
    '--cpus', '1', '--memory', '1g',
    '-p', `${port}:5173`,
    IMAGE,
    'sleep', 'infinity'
  ];
  const result = docker(args);
  if (result.status !== 0) {
    return res.status(500).json({ error: result.stderr });
  }
  containers.set(id, { port });
  res.json({ id, host: 'localhost', port });
});

app.post('/sandbox/:id/exec', (req, res) => {
  const { id } = req.params;
  const info = containers.get(id);
  if (!info) return res.status(404).json({ error: 'sandbox not found' });
  const cmd: string = req.body.cmd;
  if (!cmd) return res.status(400).json({ error: 'cmd required' });
  const result = docker(['exec', id, 'bash', '-lc', cmd]);
  res.json({ stdout: result.stdout, stderr: result.stderr, code: result.status });
});

app.put('/sandbox/:id/files', (req, res) => {
  const { id } = req.params;
  const info = containers.get(id);
  if (!info) return res.status(404).json({ error: 'sandbox not found' });
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  const temp = fs.mkdtempSync(path.join(tmpdir(), 'up-'));
  const hostPath = path.join(temp, 'file');
  fs.writeFileSync(hostPath, req.body);
  const cp = docker(['cp', hostPath, `${id}:${filePath}`]);
  fs.rmSync(temp, { recursive: true, force: true });
  if (cp.status !== 0) {
    return res.status(500).json({ error: cp.stderr });
  }
  res.json({ success: true });
});

app.get('/sandbox/:id/files', (req, res) => {
  const { id } = req.params;
  const info = containers.get(id);
  if (!info) return res.status(404).json({ error: 'sandbox not found' });
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  const result = docker(['exec', id, 'bash', '-lc', `cat ${filePath}`]);
  if (result.status !== 0) {
    return res.status(500).json({ error: result.stderr });
  }
  res.type('text/plain').send(result.stdout);
});

app.delete('/sandbox/:id', (req, res) => {
  const { id } = req.params;
  if (!containers.has(id)) return res.status(404).json({ error: 'sandbox not found' });
  docker(['rm', '-f', id]);
  containers.delete(id);
  res.json({ success: true });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`sandboxd listening on ${PORT}`));
