import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

let sourceCommit;
try {
  sourceCommit = execFileSync('git', ['rev-parse', 'v0.1.5^{commit}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

test('@claim:mobile-first-action mobile layout keeps the sample action inside the first 390 by 844 screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/');
  const primary = page.getByRole('link', { name: 'Try it with sample data' });
  const box = await primary.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
});

test('mobile layout, controls, and 200% text remain usable', async ({ page }) => {
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/');
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  const primary = page.getByRole('link', { name: 'Try it with sample data' });
  expect((await primary.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(primary).toBeVisible();
});

test('published mobile download target is at least 44 CSS pixels high', async ({ page }) => {
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ json: {
    tag_name: 'v0.1.5',
    assets: [
      { name: 'vram-fieldtest-linux-x86_64.tar.gz', size: 2_100_000, browser_download_url: 'https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.5/vram-fieldtest-linux-x86_64.tar.gz' },
      { name: 'SHA256SUMS' }, { name: 'latest.json' }, { name: 'PROVENANCE.json' }
    ]
  } }));
  await page.route('https://api.github.com/repos/**/git/ref/tags/**', route => route.fulfill({ json: { object: { type: 'commit', sha: sourceCommit } } }));
  await page.goto('/');
  const download = page.getByRole('link', { name: 'Download for linux' });
  await expect(download).toBeVisible();
  const box = await download.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('all demo controls and footer links meet the 44 CSS pixel touch target', async ({ page }) => {
  await page.goto('/demo');
  for (const target of await page.locator('a:visible, button:visible, summary:visible, input:visible').all()) {
    const box = await target.boundingBox();
    expect(box.width, await target.textContent()).toBeGreaterThanOrEqual(44);
    expect(box.height, await target.textContent()).toBeGreaterThanOrEqual(44);
  }
  const reset = await page.getByRole('button', { name: 'Reset demo' }).boundingBox();
  const terms = await page.getByRole('link', { name: 'Terms' }).boundingBox();
  expect(reset.height).toBeGreaterThanOrEqual(44);
  expect(terms.width).toBeGreaterThanOrEqual(44);
});

test('disclosure focus rings are designed and meet 3 to 1 contrast', async ({ page }) => {
  await page.route('https://api.github.com/repos/**/releases/latest', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/');
  for (const label of ['Technical details', 'Have a license?']) {
    const summary = page.getByText(label, { exact: true });
    await summary.focus();
    const style = await summary.evaluate(element => {
      const parse = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = rgb => {
        const linear = rgb.map(channel => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      };
      const computed = getComputedStyle(element);
      const foreground = luminance(parse(computed.outlineColor));
      let parent = element;
      let background = [244, 234, 214];
      while (parent) {
        const color = getComputedStyle(parent).backgroundColor;
        if (color && color !== 'rgba(0, 0, 0, 0)') {
          background = parse(color);
          break;
        }
        parent = parent.parentElement;
      }
      const backgroundLuminance = luminance(background);
      return {
        width: parseFloat(computed.outlineWidth),
        contrast: (Math.max(foreground, backgroundLuminance) + 0.05) / (Math.min(foreground, backgroundLuminance) + 0.05)
      };
    });
    expect(style.width).toBeGreaterThanOrEqual(3);
    expect(style.contrast).toBeGreaterThanOrEqual(3);
  }
});
