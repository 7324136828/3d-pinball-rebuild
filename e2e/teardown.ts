import { rmSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

export default function teardown() {
  const directory = process.env.PINBALL_E2E_TEMP;
  if (directory && dirname(resolve(directory)) === resolve(tmpdir()) && basename(directory).startsWith('pinball-e2e-')) {
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
