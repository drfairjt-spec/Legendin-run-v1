// tests/api.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

const TEST_PORT = 3199;
const TEMP_DB = join(process.cwd(), `tmp-test-${randomUUID()}.db`);
const TEMP_UPLOADS = join(process.cwd(), `tmp-test-uploads-${randomUUID()}`);

// Cleanup previous test artifacts
if (existsSync(TEMP_DB)) {
  try { rmSync(TEMP_DB); } catch {}
}
if (existsSync(TEMP_UPLOADS)) {
  try { rmSync(TEMP_UPLOADS, { recursive: true, force: true }); } catch {}
}

const serverLog: string[] = [];
const isWindows = process.platform === 'win32';
const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    DB_PATH: TEMP_DB,
    UPLOAD_ROOT: TEMP_UPLOADS,
    JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    NODE_ENV: 'development'
  },
  stdio: 'pipe',
  shell: isWindows,
  windowsHide: true
});

serverProcess.stdout?.on('data', (d) => { serverLog.push(`stdout: ${d.toString()}`); });
serverProcess.stderr?.on('data', (d) => { serverLog.push(`stderr: ${d.toString()}`); });

// Wait for server to start with detailed logging
async function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms.\nLogs:\n${serverLog.join('\n')}`);
}

try {
  await waitForServer(`http://127.0.0.1:${TEST_PORT}/api/services`);

  test('API tests for Phase 0', async (t) => {
    await t.test('GET /api/services', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/services`);
      assert.strictEqual(res.ok, true);
    });

    await t.test('GET /api/users does not leak phones', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/users`);
      const users = await res.json() as any[];
      assert.strictEqual(res.ok, true);
      assert.ok(users.length > 0);
      for (const u of users) {
        assert.strictEqual(u.phone, undefined);
      }
    });

    let token = '';
    const uniquePhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
    await t.test('POST /api/auth/register', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'تست کاربر',
          phone: uniquePhone,
          password: 'securepassword123',
          role: 'artist'
        })
      });
      const data = await res.json() as any;
      assert.strictEqual(res.status, 201);
      assert.ok(data.token);
      token = data.token;
    });

    await t.test('POST /api/posts security', async () => {
      const resNoToken = await fetch(`http://127.0.0.1:${TEST_PORT}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'تست پست' })
      });
      assert.strictEqual(resNoToken.status, 401);

      const resWithToken = await fetch(`http://127.0.0.1:${TEST_PORT}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: 'تست پست امن' })
      });
      assert.strictEqual(resWithToken.status, 201);
      const postData = await resWithToken.json() as any;
      assert.ok(postData.id);
    });

    await t.test('POST /api/chat security', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })
      });
      assert.strictEqual(res.status, 401);
    });
  });
} finally {
  serverProcess.kill('SIGTERM');
  if (isWindows) {
    try {
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
    } catch {}
  }
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    if (existsSync(TEMP_DB)) rmSync(TEMP_DB);
    if (existsSync(`${TEMP_DB}-shm`)) rmSync(`${TEMP_DB}-shm`);
    if (existsSync(`${TEMP_DB}-wal`)) rmSync(`${TEMP_DB}-wal`);
  } catch {}
  try {
    if (existsSync(TEMP_UPLOADS)) rmSync(TEMP_UPLOADS, { recursive: true, force: true });
  } catch {}
}