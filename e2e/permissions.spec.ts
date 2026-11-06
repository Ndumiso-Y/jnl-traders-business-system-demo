import { expect, test, type Page } from '@playwright/test';

async function signInAs(page: Page, userId: string) {
  await page.getByTestId('user-switcher').selectOption(userId);
}
async function fresh(page: Page) {
  await page.goto('#/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Business overview' })).toBeVisible();
}
const nav = (page: Page) => page.locator('.sidebar nav').first().locator('.nav-item').allTextContents();

test.describe('Users & permissions (simulated)', () => {
  test('module-scoped visibility: finance sees finance, HR sees HR, fleet sees fleet', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_finance');
    let items = await nav(page);
    expect(items).toContain('Finance');
    expect(items).not.toContain('Fleet & Equipment');
    expect(items).not.toContain('People & Safety');
    expect(items).not.toContain('Owner view');
    await page.goto('#/fleet');
    await expect(page.getByTestId('no-access')).toBeVisible();

    await signInAs(page, 'u_hr');
    items = await nav(page);
    expect(items).toContain('People & Safety');
    expect(items).not.toContain('Finance');
    await page.goto('#/people');
    await expect(page.getByTestId('tab-hr')).toBeVisible();
    await page.goto('#/finance/quotations');
    await expect(page.getByTestId('no-access')).toBeVisible();

    await signInAs(page, 'u_fleet');
    items = await nav(page);
    expect(items).toContain('Fleet & Equipment');
    expect(items).not.toContain('Finance');
    expect(items).not.toContain('Reports');
    await page.goto('#/fleet');
    await expect(page.getByRole('heading', { name: 'Fleet & equipment', level: 1 })).toBeVisible();
  });

  test('super admin sees everything and grants or revokes module access', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_admin');
    const items = await nav(page);
    for (const label of ['Overview', 'Finance', 'Procurement', 'PPE Requests', 'Fleet & Equipment', 'Reports', 'People & Safety', 'Owner view', 'Users & permissions']) expect(items).toContain(label);

    await page.goto('#/admin');
    await expect(page.getByTestId('matrix')).toBeVisible();
    // Grant Fleet to the Finance Clerk, revoke Finance from them
    await page.getByTestId('perm-u_finance-fleet').check();
    await page.getByTestId('perm-u_finance-finance').uncheck();
    await signInAs(page, 'u_finance');
    const after = await nav(page);
    expect(after).toContain('Fleet & Equipment');
    expect(after).not.toContain('Finance');
    await page.goto('#/finance/quotations');
    await expect(page.getByTestId('no-access')).toBeVisible();
    await page.goto('#/fleet');
    await expect(page.getByRole('heading', { name: 'Fleet & equipment', level: 1 })).toBeVisible();

    // Change survives reload
    await page.reload();
    expect(await nav(page)).not.toContain('Finance');
  });

  test('non-admins cannot open or edit the permission matrix; owner sees it read-only only if granted', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_owner');
    await page.goto('#/admin');
    await expect(page.getByTestId('no-access')).toBeVisible();
    await signInAs(page, 'u_admin');
    await page.goto('#/admin');
    await page.getByTestId('perm-u_owner-admin').check();
    await signInAs(page, 'u_owner');
    await page.goto('#/admin');
    await expect(page.getByText('Read-only.')).toBeVisible();
    await expect(page.getByTestId('perm-u_finance-fleet')).toBeDisabled();
  });

  test('approval right can be granted and revoked by the super admin', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_admin');
    await page.goto('#/admin');
    await page.getByTestId('perm-u_requester-approve').check();
    await signInAs(page, 'u_requester');
    await page.goto('#/ppe/requests/req_034'); // submitted by the supervisor, not the requester
    await expect(page.getByTestId('approve-request')).toBeEnabled();
    await signInAs(page, 'u_admin');
    await page.goto('#/admin');
    await page.getByTestId('perm-u_requester-approve').uncheck();
    await signInAs(page, 'u_requester');
    await page.goto('#/ppe/requests/req_034');
    await expect(page.getByTestId('approve-request')).toBeDisabled();
  });

  test('add and remove a demo user; cannot remove yourself', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_admin');
    await page.goto('#/admin');
    await page.getByTestId('add-user').click();
    await page.getByTestId('user-save').click();
    await expect(page.getByText(/Enter a fictional name/)).toBeVisible();
    await page.getByTestId('user-name').fill('Demo Site Clerk');
    await page.getByTestId('user-title').fill('Site office');
    await page.getByTestId('user-save').click();
    await expect(page.locator('[data-testid=user-row]', { hasText: 'Demo Site Clerk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Demo Super Admin' })).toBeDisabled();
    await page.getByRole('button', { name: 'Remove Demo Site Clerk' }).click();
    await page.getByTestId('confirm-button').click();
    await expect(page.locator('[data-testid=user-row]', { hasText: 'Demo Site Clerk' })).toHaveCount(0);
  });

  test('old saved data without users migrates to the new permission model', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_owner'); // forces the store to persist once
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('jnl-bms-demo-v1')!);
      delete raw.state.users;
      delete raw.state.settings.currentUserId;
      raw.state.settings.role = 'finance';
      raw.version = 1;
      localStorage.setItem('jnl-bms-demo-v1', JSON.stringify(raw));
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Business overview' })).toBeVisible();
    await expect(page.getByTestId('user-switcher')).toHaveValue('u_finance');
    expect(await nav(page)).toContain('Finance');
  });
});
