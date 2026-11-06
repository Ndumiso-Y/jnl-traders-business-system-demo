import { expect, test } from '@playwright/test';

/**
 * Live GitHub Pages smoke test. Run with:
 *   LIVE_URL=https://ndumiso-y.github.io/jnl-traders-business-system-demo/ npx playwright test e2e/live.spec.ts
 */
test.skip(!process.env.LIVE_URL, 'LIVE_URL not set');

test('live Pages URL serves the app, assets and deep links with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const failed: string[] = [];
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

  const res = await page.goto('');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Business overview' })).toBeVisible();
  await page.getByTestId('user-switcher').selectOption('u_admin'); // super admin sees every module
  await page.getByRole('link', { name: 'Finance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quotations & invoices', level: 1 })).toBeVisible();
  await page.goto('#/admin');
  await expect(page.getByTestId('matrix')).toBeVisible();
  await page.goto('#/fleet');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Fleet & equipment', level: 1 })).toBeVisible();
  const css = await page.evaluate(() => getComputedStyle(document.querySelector('.sidebar')!).backgroundColor);
  expect(css).toBe('rgb(255, 255, 255)');
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});
