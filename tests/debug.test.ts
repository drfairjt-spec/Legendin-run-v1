// tests/debug.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';

const TEST_PORT = 3199;
const TEMP_DB = join(process.cwd(), 'tmp-test.db');
const TEMP_UPLOADS = join(process.cwd(), 'tmp-test-uploads');

if (existsSync(TEMP_DB)) rmSync(TEMP_DB);
if (existsSync(TEMP_UPLOADS)) {
  try { rmSync(TEMP_UPLOADS, { recursive: true, force: true }); } catch {}
}

const serverLog: string[] = [];
const serverProcess = spawn('node', ['--import', 'tsx', 'server.ts'], {
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    DB_PATH: TEMP_DB,
    UPLOAD_ROOT: TEMP_UPLOADS,
    JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    NODE_ENV: 'development'
  },
  stdio: 'pipe'
});

serverProcess.stdout?.on('data', (d) => {
  const text = d.toString();
  serverLog.push(`[stdout] ${text}`);
  console.log(`[stdout] ${text}`);
});
serverProcess.stderr?.on('data', (d) => {
  const text = d.toString();
  serverLog.push(`[stderr] ${text}`);
  console.error(`[stderr] ${text}`);
});
serverProcess.on('exit', (code) => {
  const msg = `[server exited with code ${code}]`;
  serverLog.push(msg);
  console.log(msg);
});

// Wait a bit then check if we see the "Server running" message
await new Promise(resolve => setTimeout(resolve, 3000));

const serverStarted = serverLog.some(line => line.includes('Server running on http://'));
console.log(`Server started flag: ${serverStarted}`);
console.log(`Full log: ${serverLog.join('\n')}`);

if (!serverStarted) {
  console.error('Server did not start properly!');
  process.exit(1);
}

// Wait for server to start
async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch (err) {
      // console.log(`waitForServer attempt failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms.\nLogs:\n${serverLog.join('')}`);
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
    await t.test('POST /api/auth/register', async () => {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'تست کاربر',
          phone: '09121112233',
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
  });
} finally {
  serverProcess.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (existsSync(TEMP_DB)) {
    try { rmSync(TEMP_DB); } catch {}
  }
  if (existsSync(TEMP_UPLOADS)) {
    try { rmSync(TEMP_UPLOADS, { recursive: true, force: true }); } catch {}
  }
}