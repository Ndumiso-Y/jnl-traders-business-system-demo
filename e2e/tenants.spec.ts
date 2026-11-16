import { expect, test, type Page } from '@playwright/test';

async function signInAs(page: Page, userId: string) { await page.getByTestId('user-switcher').selectOption(userId); }
async function fresh(page: Page) {
  await page.goto('#/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Business overview' })).toBeVisible();
}
const stat = async (page: Page, label: string) => (await page.locator('.stat', { hasText: label }).first().locator('.metric-main').textContent())!.trim();

test.describe('Properties & tenants', () => {
  test('module is gated: property manager and owner see it, finance clerk does not', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_property');
    await page.getByRole('link', { name: 'Properties & Tenants' }).click();
    await expect(page.getByRole('heading', { name: 'Properties & tenants', level: 1 })).toBeVisible();
    await expect(page.getByTestId('property-row')).toHaveCount(3);
    await signInAs(page, 'u_finance');
    await page.goto('#/tenants');
    await expect(page.getByTestId('no-access')).toBeVisible();
    await signInAs(page, 'u_owner');
    await page.goto('#/tenants');
    await expect(page.getByRole('heading', { name: 'Properties & tenants', level: 1 })).toBeVisible();
  });

  test('seeded arrears show; recording rent reduces the balance and the arrears stat', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_property');
    await page.goto('#/tenants?tab=ledger&tenant=ten_3');
    const balanceBefore = await stat(page, 'Balance');
    expect(balanceBefore).not.toBe('R0.00');
    await expect(page.locator('.stat', { hasText: 'Balance' }).first()).toContainText('in arrears');
    const arrearsBefore = await stat(page, 'Rent arrears');
    await page.getByTestId('record-rent').click();
    await page.getByTestId('rent-amount').fill('0');
    await page.getByTestId('rent-submit').click();
    await expect(page.getByText('Enter an amount greater than zero.')).toBeVisible();
    await page.getByTestId('rent-amount').fill('8900');
    await page.getByTestId('rent-submit').click();
    await expect(page.getByTestId('rent-ledger')).toContainText('Payment received');
    const balanceAfter = await stat(page, 'Balance');
    expect(balanceAfter).not.toBe(balanceBefore);
    expect(await stat(page, 'Rent arrears')).not.toBe(arrearsBefore);
    await page.reload();
    expect(await stat(page, 'Balance')).toBe(balanceAfter);
  });

  test('add a tenant to a vacant unit with validation; occupancy and rent roll update; lease flag shows', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_property');
    await page.goto('#/tenants?tab=tenants');
    const occupancyBefore = await stat(page, 'Occupancy');
    await page.getByTestId('add-tenant').click();
    await page.getByTestId('tenant-save').click();
    await expect(page.getByText(/Enter a fictional tenant name/)).toBeVisible();
    await expect(page.getByText('Choose a unit.')).toBeVisible();
    await page.getByTestId('tenant-name').fill('Tenant T-0199');
    await page.getByTestId('tenant-unit').selectOption('unit_11'); // vacant Flat 4
    await page.getByTestId('tenant-lease-start').fill('2026-01-01');
    await page.getByTestId('tenant-lease-end').fill('2025-12-01');
    await page.getByTestId('tenant-save').click();
    await expect(page.getByText('Lease end must be after the start.')).toBeVisible();
    await page.getByTestId('tenant-lease-end').fill('2026-12-31');
    await page.getByTestId('tenant-save').click();
    await expect(page.locator('[data-testid=tenant-row]', { hasText: 'Tenant T-0199' })).toBeVisible();
    await expect(page.locator('[data-testid=tenant-row]', { hasText: 'Tenant T-0199' })).toContainText(/Ending soon|Lease expired|Lease on track/);
    expect(await stat(page, 'Occupancy')).not.toBe(occupancyBefore);
    await page.getByTestId('tab-properties').click();
    await page.getByTestId('property-row').nth(2).click();
    await expect(page.locator('[data-testid=unit-row]', { hasText: 'Tenant T-0199' })).toHaveCount(1); // tenant now shown against the unit
  });

  test('rent statement PDF downloads with the demo stamp and the tenant reference', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_property');
    await page.goto('#/tenants?tab=ledger&tenant=ten_1');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('rent-statement-pdf').click()]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(Buffer.from(c));
    const text = Buffer.concat(chunks).toString('latin1');
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('DEMONSTRATION / NOT A VALID TAX INVOICE');
    expect(text).toContain('TEN-D001');
  });

  test('older saved data (v2) gains properties, tenants and the module grant', async ({ page }) => {
    await fresh(page);
    await signInAs(page, 'u_owner');
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('jnl-bms-demo-v1')!);
      delete raw.state.properties; delete raw.state.units; delete raw.state.tenants; delete raw.state.rentPayments;
      raw.state.users = raw.state.users.filter((u: { id: string }) => u.id !== 'u_property').map((u: { modules: string[] }) => ({ ...u, modules: u.modules.filter((m) => m !== 'tenants') }));
      raw.version = 2;
      localStorage.setItem('jnl-bms-demo-v1', JSON.stringify(raw));
    });
    await page.reload();
    await expect(page.getByRole('link', { name: 'Properties & Tenants' })).toBeVisible();
    await page.goto('#/tenants');
    await expect(page.getByTestId('property-row')).toHaveCount(3);
  });
});
