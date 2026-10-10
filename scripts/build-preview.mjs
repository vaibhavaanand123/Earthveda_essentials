import { spawnSync } from 'node:child_process';
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  env: { ...process.env, VITE_PREVIEW_MODE: 'true' },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
