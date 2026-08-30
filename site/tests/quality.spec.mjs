import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let sourceCommit;
try {
  sourceCommit = execFileSync('git', ['rev-parse', 'v0.1.10^{commit}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

const releaseFixture = {
  tag_name: 'v0.1.10',
  assets: [
    { name: 'vram-fieldtest-linux-x86_64.tar.gz', size: 2_100_000, browser_download_url: 'https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.10/vram-fieldtest-linux-x86_64.tar.gz' },
    { name: 'vram-fieldtest-windows-x86_64.zip', size: 2_100_000, browser_download_url: 'https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.10/vram-fieldtest-windows-x86_64.zip' },
    { name: 'vram-fieldtest-macos-x86_64.tar.gz', size: 2_100_000, browser_download_url: 'https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.10/vram-fieldtest-macos-x86_64.tar.gz' },
    { name: 'SHA256SUMS', size: 800, browser_download_url: 'https://github.com/example/SHA256SUMS' },
    { name: 'latest.json', size: 800, browser_download_url: 'https://github.com/example/latest.json' },
    { name: 'PROVENANCE.json', size: 800, browser_download_url: 'https://github.com/example/PROVENANCE.json' }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ json: releaseFixture }));
  await page.route('https://api.github.com/repos/**/git/ref/tags/**', route => route.fulfill({ json: { object: { type: 'commit', sha: sourceCommit } } }));
});

test('@claim:release-download landing picks a real platform release asset', async ({ page }) => {
  await page.goto('/');
  const download = page.getByRole('link', { name: 'Download for windows' });
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute('href', /v0\.1\.10\/vram-fieldtest-windows-x86_64\.zip$/);
  await expect(page.getByText('v0.1.10 · 2 MB')).toBeVisible();
});

test('@claim:host-evidence-scope the site and docs limit coverage evidence to completed user-host runs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Detects and tests the GPU on the host where you run it.')).toBeVisible();
  await expect(page.getByText('Coverage figures come from completed user-provided runs.')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Targets 90% of reported memory');
  await page.goto('/demo');
  await expect(page.getByText('93.8% sample value')).toBeVisible();
  await expect(page.getByText('Coverage figures come only from completed user-provided runs.')).toBeVisible();
  const readme = readFileSync('README.md', 'utf8');
  const demo = readFileSync('.factory/demo.md', 'utf8');
  const helper = readFileSync('scripts/hardware-evidence.py', 'utf8');
  expect(readme).toContain("The CLI detects and tests the GPU on the user's host. Coverage figures come from completed user-provided runs. Release packages include no factory GPU-lab results.");
  expect(demo).toContain('It tests that host only. Coverage figures come from completed user-provided runs.');
  expect(helper).toContain('"evidence_kind": "user-host-completed-run"');
});

test('release update replaces a fresh cache entry from the previous version', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vram:release', JSON.stringify({
    at: Date.now(),
    data: { tag_name: 'v0.1.2', assets: [] }
  })));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Download for windows' })).toHaveAttribute('href', /v0\.1\.10\//);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vram:release')).data.tag_name)).toBe('v0.1.10');
});

test('regression: landing refuses an expected release tag from another commit', async ({ page }) => {
  await page.unroute('https://api.github.com/repos/**/git/ref/tags/**');
  await page.route('https://api.github.com/repos/**/git/ref/tags/**', route => route.fulfill({ json: { object: { type: 'commit', sha: '0'.repeat(40) } } }));
  await page.goto('/');
  await expect(page.getByText('Downloads are being published.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Download for/ })).toHaveCount(0);
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

test('@claim:demo-privacy demo makes only same-origin requests and isolates its resettable storage', async ({ page }) => {
  const origins = [];
  page.on('request', request => origins.push(new URL(request.url()).origin));
  await page.addInitScript(() => {
    localStorage.setItem('sb_license:vram-fieldtest', 'real-license');
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    const removeItem = Storage.prototype.removeItem;
    window.__storageAccesses = [];
    Storage.prototype.getItem = function(key) {
      window.__storageAccesses.push({ operation: 'read', key });
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function(key, value) {
      window.__storageAccesses.push({ operation: 'write', key });
      return setItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function(key) {
      window.__storageAccesses.push({ operation: 'remove', key });
      return removeItem.call(this, key);
    };
  });
  await page.goto('/?demo=1');
  await page.waitForLoadState('networkidle');
  expect([...new Set(origins)]).toEqual(['http://127.0.0.1:4173']);
  await expect(page.getByText('Demo — sample data, nothing is saved.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('demo:vram-fieldtest'))).toContain('Example GPU 12 GB');
  expect(await page.evaluate(() => window.__storageAccesses.filter(access => access.key !== 'demo:vram-fieldtest'))).toEqual([]);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('sb_license:')))).toEqual(['sb_license:vram-fieldtest']);
  expect(await page.evaluate(() => window.__storageAccesses.filter(access => access.key !== 'demo:vram-fieldtest'))).toEqual([]);
});

test('@claim:no-account core demo opens without credentials or account storage', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Read a sample GPU memory report.');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes('account') || key.startsWith('sb_license:')))).toEqual([]);
});

test('@claim:report-kit-output active Report Kit creates labels locally without uploading report contents', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sb_license:vram-fieldtest', 'fixture-license');
    localStorage.setItem('sb_license_check:vram-fieldtest', JSON.stringify({ at: Date.now(), valid: true }));
  });
  const requests = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await page.goto('/report-kit');
  const requestsBeforeUpload = requests.length;
  await page.setInputFiles('#report-file', 'examples/sample-report.json');
  await expect(page.getByText('Printable cover and batch labels are ready.')).toBeVisible();
  await expect(page.locator('.batch-labels li')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Print cover and labels' })).toBeVisible();
  expect(requests.slice(requestsBeforeUpload)).toEqual([]);
  expect(requests.some(request => request.url.includes('/verify?'))).toBeFalsy();
  expect(requests.some(request => (request.body || '').includes('Example GPU 12 GB'))).toBeFalsy();
});

test('Report Kit replaces malformed JSON parser text with a recovery instruction', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sb_license:vram-fieldtest', 'fixture-license');
    localStorage.setItem('sb_license_check:vram-fieldtest', JSON.stringify({ at: Date.now(), valid: true }));
  });
  await page.goto('/report-kit');
  await page.locator('#report-file').setInputFiles({
    name: 'report.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{oops')
  });
  await expect(page.locator('#kit-note')).toHaveText('This file could not be read. Choose a valid VRAM Field Test report.json file.');
  await expect(page.locator('#kit-note')).not.toContainText('Expected property');
});

test('@claim:report-kit-operator-gate Report Kit has no checkout until its Sociobot mapping is configured', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Report Kit' })).toBeVisible();
  await expect(page.getByText('Checkout is unavailable until an operator configures its Sociobot product mapping.')).toBeVisible();
  await expect(page.locator('a[href*="/checkout"]')).toHaveCount(0);
  await expect(page.getByText('The core test and report files stay free.')).toBeVisible();
  await page.goto('/report-kit');
  await expect(page.getByRole('heading', { level: 2, name: 'Report Kit checkout is not available.' })).toBeVisible();
  await expect(page.locator('a[href*="/checkout"]')).toHaveCount(0);
});

test('@claim:license-storage a license token is stored only after the visitor restores it', async ({ page }) => {
  await page.route('**/api/license/verify**', route => route.fulfill({ json: { valid: false, reason: 'invalid' } }));
  await page.goto('/');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:vram-fieldtest'))).toBeNull();
  await page.getByText('Have an operator-issued license?', { exact: true }).click();
  await page.locator('#license').fill('fixture-license');
  await page.getByRole('button', { name: 'Restore license' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sb_license:vram-fieldtest'))).toBe('fixture-license');
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
  await page.getByText('Have an operator-issued license?', { exact: true }).click();
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

test('keyboard opens and closes both disclosure controls', async ({ page }) => {
  await page.goto('/');
  for (const label of ['Technical details', 'Have an operator-issued license?']) {
    const summary = page.getByText(label, { exact: true });
    const details = summary.locator('..');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(details).not.toHaveAttribute('open', '');
  }
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
  await expect(page).toHaveTitle('Page not found — VRAM Field Test');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.');
  await expect(page.getByRole('link', { name: 'Return to field test' })).toBeVisible();
});

test('@claim:route-metadata every physical route has its own crawlable metadata before JavaScript', async ({ request }) => {
  const expected = {
    '/': ['VRAM Field Test — Test GPU memory', 'Test GPU memory and save a clear report before you buy or resell.'],
    '/demo': ['Demo — VRAM Field Test', 'View a bundled GPU memory test report with sample data that is never saved.'],
    '/report-kit': ['Report Kit — VRAM Field Test', 'Turn a local VRAM Field Test report into a printable cover and batch labels.'],
    '/privacy': ['Privacy — VRAM Field Test', 'Read how VRAM Field Test stores local reports and optional license data.'],
    '/terms': ['Terms — VRAM Field Test', 'Read the safety, license, and warranty terms for VRAM Field Test.'],
    '/missing-page': ['Page not found — VRAM Field Test', 'This VRAM Field Test page could not be found.']
  };
  for (const [route, [title, description]] of Object.entries(expected)) {
    const response = await request.get(route);
    const html = await response.text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`name="description" content="${description}"`);
    expect(html).toContain(`property="og:title" content="${title}"`);
    expect(html).toContain(`name="twitter:title" content="${title}"`);
  }
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
