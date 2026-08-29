import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = new URL(process.argv[2] || 'https://vram-fieldtest.sociobot.in');
const origin = base.origin;
const browser = await chromium.launch();
const summary = { routes: {}, consoleErrors: [], mobile: {}, offline: false, identity: {} };

try {
  for (const route of ['/', '/demo', '/report-kit', '/privacy', '/terms', '/missing-page-live-smoke']) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const expectedStatus = route.startsWith('/missing-') ? 404 : 200;
    page.on('console', message => {
      const expected404 = expectedStatus === 404 && /Failed to load resource:.*404/.test(message.text());
      if (message.type() === 'error' && !expected404) summary.consoleErrors.push(`${route}: ${message.text()}`);
    });
    page.on('pageerror', error => summary.consoleErrors.push(`${route}: ${error.message}`));
    const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle' });
    assert.equal(response.status(), expectedStatus, `${route} response status`);
    assert.equal(await page.locator('h1').count(), 1, `${route} h1 count`);
    assert.equal(await page.locator('main').count(), 1, `${route} main count`);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', `${route} language`);
    assert.ok(await page.title(), `${route} title`);
    const axe = await new AxeBuilder({ page }).analyze();
    const severe = axe.violations.filter(item => ['serious', 'critical'].includes(item.impact));
    assert.deepEqual(severe, [], `${route} serious/critical accessibility issues`);
    summary.routes[route] = { status: response.status(), seriousCritical: severe.length };
    await context.close();
  }

  const desktop = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await desktop.goto(base.href, { waitUntil: 'networkidle' });
  await desktop.keyboard.press('Tab');
  assert.equal(await desktop.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to content');
  await desktop.keyboard.press('Enter');
  assert.equal(await desktop.evaluate(() => document.activeElement?.tagName), 'MAIN');
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.goto(base.href, { waitUntil: 'networkidle' });
  summary.mobile = await mobile.evaluate(() => {
    const primary = [...document.querySelectorAll('a')].find(item => item.textContent?.trim() === 'Try it with sample data');
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      primaryHeight: primary?.getBoundingClientRect().height || 0
    };
  });
  assert.ok(summary.mobile.scrollWidth <= summary.mobile.clientWidth, '390 px page has horizontal overflow');
  assert.ok(summary.mobile.primaryHeight >= 44, 'primary touch target is shorter than 44 px');
  const mobileSession = await mobile.context().newCDPSession(mobile);
  await mobileSession.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  assert.ok(await mobile.locator('h1').isVisible(), 'h1 is hidden at 200% text');
  await mobile.close();

  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(base.href);
  const motion = await reducedPage.evaluate(() => {
    const body = getComputedStyle(document.body);
    return { scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior, animation: body.animationName, transition: body.transitionDuration };
  });
  assert.equal(motion.scrollBehavior, 'auto');
  assert.equal(motion.animation, 'none');
  assert.equal(motion.transition, '0s');
  await reduced.close();

  const demoContext = await browser.newContext();
  const demoPage = await demoContext.newPage();
  const demoOrigins = new Set();
  demoPage.on('request', request => demoOrigins.add(new URL(request.url()).origin));
  await demoPage.goto(new URL('/demo', base).href, { waitUntil: 'networkidle' });
  assert.deepEqual([...demoOrigins], [origin], 'demo made a cross-origin request');
  await demoPage.evaluate(async () => navigator.serviceWorker.ready);
  if (!await demoPage.evaluate(() => Boolean(navigator.serviceWorker.controller))) await demoPage.reload();
  await demoContext.setOffline(true);
  await demoPage.reload();
  assert.match(await demoPage.locator('h1').textContent(), /sample GPU memory report/);
  assert.ok(await demoPage.getByText('Demo — sample data, nothing is saved.').isVisible());
  summary.offline = true;
  await demoContext.close();

  const identityResponse = await fetch(new URL('/release.json', base));
  assert.equal(identityResponse.status, 200);
  const identity = await identityResponse.json();
  const commitResponse = await fetch(`https://api.github.com/repos/B-Divyesh/sf-vram-fieldtest/commits/${identity.tag}`);
  assert.equal(commitResponse.status, 200);
  const tagged = await commitResponse.json();
  assert.equal(identity.source_commit, tagged.sha, 'deployed source does not match release tag');
  summary.identity = identity;
  assert.deepEqual(summary.consoleErrors, [], 'browser console errors');
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
