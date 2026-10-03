import { defineConfig, devices } from '@playwright/test';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const isMacOS = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const e2eRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(e2eRoot, '..');
const frontendRoot = join(projectRoot, 'frontend');
const localPython = join(
  projectRoot,
  '.venv',
  isWindows ? 'Scripts/python.exe' : 'bin/python',
);
const python = existsSync(localPython)
    ? localPython
    : isWindows
      ? 'python'
      : 'python3';
const backendUrl = 'http://127.0.0.1:8001';
const frontendUrl = 'http://127.0.0.1:5174';
// Use a unique system-temp database rather than the user's rankings.
const temporaryRoot = process.env.PINBALL_E2E_TEMP || mkdtempSync(join(tmpdir(), 'pinball-e2e-'));
process.env.PINBALL_E2E_TEMP = temporaryRoot;
const testDatabase = join(temporaryRoot, 'pinball.db');
const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  ),
);

export default defineConfig({
  testDir: './tests',
  globalTeardown: './teardown.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: isMacOS
    ? [
        {
          name: 'safari-webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Edge'],
            channel: process.env.CI || process.env.PLAYWRIGHT_BROWSER === 'chromium' ? undefined : 'msedge',
          },
        },
      ],
  webServer: [
    {
      command: `"${python}" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001`,
      cwd: projectRoot,
      env: {
        ...environment,
        PINBALL_DB_PATH: testDatabase,
        PINBALL_STATIC_DIR: '',
        CORS_ORIGINS: frontendUrl,
      },
      url: `${backendUrl}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `${isWindows ? 'npm.cmd' : 'npm'} run dev -- --host 127.0.0.1 --port 5174 --strictPort`,
      cwd: frontendRoot,
      env: {
        ...environment,
        VITE_BACKEND_URL: backendUrl,
        BACKEND_URL: backendUrl,
        VITE_ENABLE_TEST_HOOKS: '1',
      },
      url: frontendUrl,
      reuseExistingServer: false,
    },
  ],
});
