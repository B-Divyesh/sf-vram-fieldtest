import { test, expect } from '@playwright/test';

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
