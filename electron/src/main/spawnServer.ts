import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';

/**
 * prod 启动后端：fork 一个 Node 子进程运行打包后的 server。
 * dev 模式由 `electron-vite` 之外的 dev 流程另行启动后端（`npm run dev:server`）。
 */
export function spawnServer(): ChildProcess {
  const serverEntry = join(__dirname, '../../server/dist/main.js');
  const child = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      DB_TYPE: 'sqlite',
      DB_SQLITE_PATH: join(process.env.USER_DATA_DIR || '.', 'app.db'),
      PORT: '7001',
    },
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log(`[spawnServer] Nest exit code=${code}`);
  });
  return child;
}

export async function waitForHealth(opts: { url: string; timeoutMs: number }) {
  const start = Date.now();
  while (Date.now() - start < opts.timeoutMs) {
    try {
      const res = await fetch(opts.url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`后端健康检查超时（${opts.timeoutMs}ms）`);
}
