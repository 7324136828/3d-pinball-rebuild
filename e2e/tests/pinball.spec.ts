import { expect, test, type Page } from '@playwright/test';

interface Snapshot {
  gameMode: number; paused: boolean; time: number; score: number;
  playerCount: number; playerScores: number[]; plungerCharge: number;
  balls: { x: number; y: number; active: boolean }[];
  flippers: { angle: number }[];
}
interface Harness {
  state(): Snapshot;
  advance(seconds: number): Snapshot;
  setBall(ball: { x: number; y: number; vx: number; vy: number }): Snapshot;
  finishGame(scores?: number[]): Snapshot;
}
declare global { interface Window { __pinballTest?: Harness } }

async function openTable(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start new flight' })).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('canvas')).toBeVisible();
}
async function start(page: Page, names = ['Test Cadet']) {
  await page.getByLabel('Crew size').selectOption(String(names.length));
  for (const [index, name] of names.entries()) await page.getByLabel(`Pilot ${index + 1} name`).fill(name);
  await page.getByRole('button', { name: 'Start new flight' }).click();
  await expect(page.getByText('IN FLIGHT', { exact: true })).toBeVisible();
  await page.locator('canvas').focus();
}
async function state(page: Page) { return page.evaluate(() => window.__pinballTest!.state()); }

test('loads the real table and leaves idle or abandoned games out of the rankings', async ({ page, request }, testInfo) => {
  const before = await (await request.get('/api/leaderboard')).json();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openTable(page);
  expect((await state(page)).gameMode).toBe(2);
  await start(page, ['Abandoned Cadet']);
  await page.getByRole('button', { name: 'Restart flight' }).click();
  await expect(page.getByText('IN FLIGHT', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Table ready', { exact: true })).toBeVisible();
  const after = await (await request.get('/api/leaderboard')).json();
  expect(after.total).toBe(before.total);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
});

test('keyboard flippers, held launch, pause, blur and camera control the live engine', async ({ page }) => {
  await openTable(page);
  await start(page);
  await page.evaluate(() => window.__pinballTest!.advance(6));
  const initial = await state(page);
  await page.keyboard.down('z');
  const held = await page.evaluate(() => window.__pinballTest!.advance(0.15));
  expect(held.flippers[0].angle).not.toBe(initial.flippers[0].angle);
  await page.keyboard.up('z');
  await page.keyboard.down('Space');
  const charged = await page.evaluate(() => window.__pinballTest!.advance(3));
  expect(charged.plungerCharge).toBeGreaterThan(0.25);
  await page.keyboard.up('Space');
  const launched = await page.evaluate(() => window.__pinballTest!.advance(0.5));
  expect(Math.hypot(launched.balls[0].x - initial.balls[0].x, launched.balls[0].y - initial.balls[0].y)).toBeGreaterThan(2);
  await page.keyboard.press('p');
  await expect(page.getByRole('button', { name: 'Resume flight' })).toBeVisible();
  const paused = await state(page);
  const still = await page.evaluate(() => window.__pinballTest!.advance(2));
  expect(still.time).toBe(paused.time);
  await page.getByRole('button', { name: 'Resume flight' }).click();
  await page.getByRole('button', { name: 'Switch to overhead view' }).click();
  await expect(page.getByRole('button', { name: 'Switch to cabinet view' })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: 'Resume flight' })).toBeVisible();
});

test('real drain timers reach game over and automatically save the score', async ({ page, request }) => {
  await openTable(page);
  await start(page, ['Natural Drain Cadet']);
  await page.evaluate(() => window.__pinballTest!.advance(6));
  // Launch every served ball so the original launch ball-saver can expire.
  for (let i = 0; i < 40 && (await state(page)).gameMode === 1; i++) {
    await page.keyboard.down('Space');
    await page.evaluate(() => window.__pinballTest!.advance(3));
    await page.keyboard.up('Space');
    await page.evaluate(() => {
      const engine = window.__pinballTest!;
      engine.advance(12);
      engine.setBall({ x: 0, y: 13.3, vx: 0, vy: 25 });
      engine.advance(0.15);
      engine.advance(8);
    });
  }
  expect((await state(page)).gameMode).toBe(2);
  await expect(page.getByText('Flight complete. Score recorded.', { exact: true })).toBeVisible();
  const ranking = await (await request.get('/api/leaderboard?limit=100')).json();
  expect(ranking.entries.filter((entry: { player_name: string }) => entry.player_name === 'Natural Drain Cadet')).toHaveLength(1);
});

test('multiplayer billion-point scores persist and appear in React rankings after reload', async ({ page, request }) => {
  await openTable(page);
  await start(page, ['Orbit Alpha', 'Orbit Beta']);
  expect((await state(page)).playerCount).toBe(2);
  await page.evaluate(() => window.__pinballTest!.finishGame([3_000_000_500, 750_000]));
  await expect(page.getByText('Flight complete. Score recorded.', { exact: true })).toBeVisible();
  const ranking = await (await request.get('/api/leaderboard?limit=100')).json();
  expect(ranking.entries.find((entry: { player_name: string }) => entry.player_name === 'Orbit Alpha').score).toBe(3_000_000_500);
  expect(ranking.entries.find((entry: { player_name: string }) => entry.player_name === 'Orbit Beta').score).toBe(750_000);
  await page.reload();
  await page.getByRole('button', { name: 'Rankings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The leaderboard' })).toBeVisible();
  const leaderboard = page.locator('.ranking-page table');
  await expect(leaderboard.getByText('Orbit Alpha', { exact: true })).toBeVisible();
  await expect(leaderboard.getByText('3,000,000,500', { exact: true })).toBeVisible();
});

test('retry after a lost completion response keeps one database entry', async ({ page, request }) => {
  await openTable(page);
  await start(page, ['Retry Cadet']);
  let attempts = 0;
  await page.route('**/api/games/*/complete', async route => {
    attempts++;
    if (attempts === 1) {
      const response = await route.fetch();
      expect(response.ok()).toBeTruthy();
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Simulated lost response' }) });
    } else await route.continue();
  });
  await page.evaluate(() => window.__pinballTest!.finishGame([125_000]));
  await expect(page.getByRole('button', { name: 'Retry saving score' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry saving score' }).click();
  await expect(page.getByText('Flight complete. Score recorded.', { exact: true })).toBeVisible();
  const ranking = await (await request.get('/api/leaderboard?limit=100')).json();
  expect(ranking.entries.filter((entry: { player_name: string }) => entry.player_name === 'Retry Cadet')).toHaveLength(1);
  expect(attempts).toBe(2);
});

test('mobile controls fit the screen and pointer hold/release charges the plunger', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTable(page);
  await start(page, ['Touch Cadet']);
  await page.evaluate(() => window.__pinballTest!.advance(6));
  const button = page.getByRole('button', { name: 'Hold to launch', exact: true });
  await button.scrollIntoViewIfNeeded();
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const charged = await page.evaluate(() => window.__pinballTest!.advance(3));
  expect(charged.plungerCharge).toBeGreaterThan(0.25);
  await page.mouse.up();
  const launched = await page.evaluate(() => window.__pinballTest!.advance(0.5));
  expect(launched.plungerCharge).toBeLessThan(charged.plungerCharge);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
});
