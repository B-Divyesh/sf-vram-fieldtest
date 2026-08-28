import { test, expect } from '@playwright/test';

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
