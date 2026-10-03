// Real UI screenshots; run through tools/capture_screenshots.py with its isolated demo database.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect as baseExpect, request } from '@playwright/test';

const expect = baseExpect.configure({ timeout: 45_000 });

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'screenshot');
const baseURL = process.env.PINBALL_CAPTURE_URL;
assert.equal(process.env.PINBALL_CAPTURE_ISOLATED, '1', 'Use python tools/capture_screenshots.py to protect your rankings.');
assert.match(baseURL ?? '', /^http:\/\/127\.0\.0\.1:\d+$/, 'Capture requires the local temporary stack.');

async function launchBrowser() {
  const selected = process.env.PINBALL_CAPTURE_BROWSER || 'auto';
  const candidates = selected === 'auto'
    ? process.platform === 'win32' ? ['msedge', 'chromium'] : ['chromium']
    : [selected];
  let lastError;
  for (const candidate of candidates) {
    try {
      const browser = await chromium.launch({
        headless: true,
        ...(candidate === 'msedge' ? { channel: 'msedge' } : {}),
      });
      console.log('[screenshots] Using headless ' + candidate + '.');
      return browser;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error('No screenshot browser is available. In e2e/, run npx playwright install chromium. ' + lastError?.message);
}

async function seedDemoRankings() {
  const api = await request.newContext({ baseURL });
  try {
    const initial = await api.get('/api/leaderboard');
    assert(initial.ok());
    assert.equal((await initial.json()).total, 0, 'Capture database must start empty.');
    for (const [name, score] of [
      ['Nova', 24_876_500], ['Orbit', 19_240_500], ['Vega', 14_785_000],
      ['Cassini', 12_550_000], ['Aurora', 9_145_000], ['Atlas', 6_402_500],
    ]) {
      const started = await api.post('/api/games', { data: { player_names: [name] } });
      assert.equal(started.status(), 201);
      const game = await started.json();
      const completed = await api.post('/api/games/' + game.id + '/complete', {
        data: { scores: [score], duration_ms: 300_000 },
      });
      assert(completed.ok());
    }
  } finally {
    await api.dispose();
  }
}

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function openTable(page) {
  await page.goto(baseURL);
  await expect(page).toHaveTitle('Modern 3D Pinball · Space Cadet');
  await expect(page.getByRole('button', { name: 'Start new flight' })).toBeEnabled({ timeout: 60_000 });
  await expect(page.locator('canvas')).toBeVisible();
  assert.equal(await page.evaluate(() => window.__pinballTest === undefined), true, 'Screenshots must use ordinary UI controls.');
}

async function startAndLaunch(page, name) {
  await page.getByLabel('Pilot 1 name').fill(name);
  await page.getByRole('button', { name: 'Start new flight' }).click();
  await expect(page.getByText('IN FLIGHT', { exact: true })).toBeVisible();
  await page.locator('canvas').focus();
  await expect(page.locator('.launch-hint')).toBeVisible({ timeout: 30_000 });
  await page.keyboard.down('Space');
  try {
    await page.waitForFunction(() => {
      const displayed = document.querySelector('.power > div:first-child > span:last-child')?.textContent ?? '';
      return Number.parseInt(displayed, 10) >= 35;
    }, null, { timeout: 10_000 });
  } finally {
    await page.keyboard.up('Space');
  }
  await expect(page.locator('.launch-hint')).toBeHidden();
  // Let the real ball move after release; no engine hooks or synthetic UI state.
  await page.waitForTimeout(350);
  await page.keyboard.down('z');
  await page.keyboard.down('/');
  await page.waitForTimeout(100);
}

async function save(page, filename) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, filename), fullPage: true, animations: 'disabled' });
  await page.keyboard.up('z');
  await page.keyboard.up('/');
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  console.log('[screenshots] Saved screenshot/' + filename + ' (' + dimensions.width + '×' + dimensions.height + ').');
}

await mkdir(output, { recursive: true });
await seedDemoRankings();
const browser = await launchBrowser();
try {
  if (process.env.PINBALL_CAPTURE_RANKINGS_ONLY !== '1') {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1,
      locale: 'en-US', timezoneId: 'America/New_York', reducedMotion: 'reduce',
    });
    const desktop = await desktopContext.newPage();
    const desktopErrors = watchErrors(desktop);
    await openTable(desktop);
    await startAndLaunch(desktop, 'Nova');
    await save(desktop, 'desktop-gameplay.png');
    assert.deepEqual(desktopErrors, [], 'Desktop page reported runtime errors.');
    await desktopContext.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
      locale: 'en-US', timezoneId: 'America/New_York', reducedMotion: 'reduce',
    });
    const mobile = await mobileContext.newPage();
    const mobileErrors = watchErrors(mobile);
    await openTable(mobile);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile layout overflows horizontally.');
    assert.equal(await mobile.evaluate(() => {
      const brand = document.querySelector('.brand').getBoundingClientRect();
      const nav = document.querySelector('.site-header nav').getBoundingClientRect();
      return brand.right <= nav.left || nav.right <= brand.left || brand.bottom <= nav.top || nav.bottom <= brand.top;
    }), true, 'Mobile branding and navigation overlap.');
    await startAndLaunch(mobile, 'Orbit');
    await save(mobile, 'mobile-gameplay.png');
    assert.deepEqual(mobileErrors, [], 'Mobile page reported runtime errors.');
    await mobileContext.close();
  }

  const rankingContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
    locale: 'en-US', timezoneId: 'America/New_York', reducedMotion: 'reduce',
  });
  const rankingPage = await rankingContext.newPage();
  const rankingErrors = watchErrors(rankingPage);
  await openTable(rankingPage);
  await rankingPage.getByRole('button', { name: 'Rankings', exact: true }).click();
  await expect(rankingPage.getByRole('heading', { name: 'The leaderboard' })).toBeVisible();
  await expect(rankingPage.locator('.ranking-page table').getByText('Nova', { exact: true })).toBeVisible();
  await expect(rankingPage.locator('.ranking-page tbody tr')).toHaveCount(6);
  await save(rankingPage, 'rankings.png');
  assert.deepEqual(rankingErrors, [], 'Rankings page reported runtime errors.');
} finally {
  await browser.close();
}
