import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const releaseFixture = {
  tag_name: 'v0.1.2',
  assets: [
    { name: 'vram-fieldtest-linux-x86_64.tar.gz', size: 2_100_000, browser_download_url: 'https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.2/vram-fieldtest-linux-x86_64.tar.gz' },
    { name: 'vram-fieldtest-windows-x86_64.zip', size: 2_100_000, browser_download_url: 'https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.2/vram-fieldtest-windows-x86_64.zip' },
    { name: 'vram-fieldtest-macos-x86_64.tar.gz', size: 2_100_000, browser_download_url: 'https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.2/vram-fieldtest-macos-x86_64.tar.gz' },
    { name: 'SHA256SUMS', size: 800, browser_download_url: 'https://github.com/example/SHA256SUMS' },
    { name: 'latest.json', size: 800, browser_download_url: 'https://github.com/example/latest.json' },
    { name: 'PROVENANCE.json', size: 800, browser_download_url: 'https://github.com/example/PROVENANCE.json' }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ json: releaseFixture }));
});

test('@claim:release-download landing picks a real platform release asset', async ({ page }) => {
  await page.goto('/');
  const download = page.getByRole('link', { name: 'Download for windows' });
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute('href', /v0\.1\.2\/vram-fieldtest-windows-x86_64\.zip$/);
  await expect(page.getByText('v0.1.2 · 2 MB')).toBeVisible();
});

test('landing refuses a stale release instead of linking the wrong CLI', async ({ page }) => {
  await page.unroute('https://api.github.com/repos/**/releases/latest');
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ json: { ...releaseFixture, tag_name: 'v0.1.1' } }));
  await page.goto('/');
  await expect(page.getByText('Downloads are being published.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Download for/ })).toHaveCount(0);
});

test('@claim:site-offline demo reloads offline after the first visit', async ({ page, context }) => {
  await page.goto('/demo');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Read a sample GPU memory report.');
  await expect(page.getByText('Demo — sample data, nothing is saved.')).toBeVisible();
});

test('@claim:demo-privacy demo makes only same-origin requests and ignores real license storage', async ({ page }) => {
  const origins = [];
  page.on('request', request => origins.push(new URL(request.url()).origin));
  await page.addInitScript(() => localStorage.setItem('sb_license:vram-fieldtest', 'real-license'));
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  expect([...new Set(origins)]).toEqual(['http://127.0.0.1:4173']);
  await expect(page.getByText('Demo — sample data, nothing is saved.')).toBeVisible();
});

test('@claim:report-kit-output active Report Kit turns local JSON into a cover and labels', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sb_license:vram-fieldtest', 'fixture-license');
    localStorage.setItem('sb_license_check:vram-fieldtest', JSON.stringify({ at: Date.now(), valid: true }));
  });
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/report-kit');
  await page.setInputFiles('#report-file', 'examples/sample-report.json');
  await expect(page.getByText('Printable cover and batch labels are ready.')).toBeVisible();
  await expect(page.locator('.batch-labels li')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Print cover and labels' })).toBeVisible();
  expect(requests.some(url => url.includes('/verify?'))).toBeFalsy();
});

test('@claim:license-rate-limit Retry-After prevents repeated license checks', async ({ page }) => {
  let checks = 0;
  await page.route('**/api/license/verify**', route => {
    checks += 1;
    return route.fulfill({ status: 429, headers: { 'Access-Control-Expose-Headers': 'Retry-After', 'Retry-After': '120' }, body: '{}' });
  });
  await page.addInitScript(() => {
    localStorage.setItem('sb_license:vram-fieldtest', 'fixture-license');
    localStorage.setItem('sb_license_check:vram-fieldtest', JSON.stringify({ at: 0, valid: false }));
  });
  await page.goto('/');
  await expect.poll(() => checks).toBe(1);
  await page.getByText('Have a license?', { exact: true }).click();
  await page.locator('#license').fill('fixture-license');
  await page.getByRole('button', { name: 'Restore license' }).click();
  await expect(page.getByText('License checks are temporarily limited. Try again after', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => Number(localStorage.getItem('sb_license_retry:vram-fieldtest')) > Date.now())).toBeTruthy();
  expect(checks).toBe(1);
});

test('keyboard navigation, route focus, and back button work', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page).toHaveTitle('Demo — VRAM Field Test');
  await page.goBack();
  await expect(page).toHaveTitle('VRAM Field Test — Test GPU memory');
});

test('release API failure renders a calm state without console errors', async ({ page }) => {
  await page.unroute('https://api.github.com/repos/**/releases/latest');
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ json: { message: 'not published' } }));
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByText('Downloads are being published.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('unknown route is a real HTTP 404 with a usable page', async ({ page, request }) => {
  const response = await request.get('/missing-page');
  expect(response.status()).toBe(404);
  await page.goto('/missing-page');
  await expect(page).toHaveTitle('Not found — VRAM Field Test');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page is not on the bench.');
  await expect(page.getByRole('link', { name: 'Return to field test' })).toBeVisible();
});

for (const route of ['/', '/demo', '/report-kit', '/privacy', '/terms', '/missing-page']) {
  test(`accessibility has no serious or critical findings on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations.filter(item => ['serious', 'critical'].includes(item.impact));
    expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
  });
}
