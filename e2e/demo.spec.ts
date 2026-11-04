import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = path.resolve('qa/screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

/** Collect console errors for the lifetime of a page. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

async function fresh(page: Page) {
  await page.goto('#/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Business overview' })).toBeVisible();
}

test.describe('Shell and navigation', () => {
  test('all modules load with no console errors; hard refresh keeps route', async ({ page }) => {
    const errors = trackErrors(page);
    await fresh(page);
    for (const [label, heading] of [['Finance', 'Quotations & invoices'], ['Procurement', 'Procurement requests'], ['PPE Requests', 'PPE requests'], ['Fleet & Equipment', 'Fleet & equipment'], ['Reports', 'Monthly reports'], ['People & Safety', 'People & safety'], ['Owner view', 'Owner view'], ['Settings & demo reset', 'Settings & demo reset']]) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    }
    await page.goto('#/fleet');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Fleet & equipment', level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('keyboard: Tab reaches navigation and Enter activates', async ({ page }) => {
    await fresh(page);
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand
    await page.keyboard.press('Tab'); // Overview
    await page.keyboard.press('Tab'); // Finance
    await expect(page.getByRole('link', { name: 'Finance', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Quotations & invoices', level: 1 })).toBeVisible();
  });

  test('workspace search finds records', async ({ page }) => {
    await fresh(page);
    await page.getByLabel('Search workspace').fill('FLT-002');
    await page.getByLabel('Search workspace').press('Enter');
    await expect(page.getByTestId('search-results')).toContainText('FLT-002');
  });
});

test.describe('Finance', () => {
  test('2 x R100 excl VAT = R230.00; VAT inclusive, discount, validation, convert, payment, statement, PDF', async ({ page }) => {
    const errors = trackErrors(page);
    await fresh(page);
    await page.getByTestId('new-quotation').click();
    await expect(page.getByRole('heading', { name: /Quotation Q-D/ })).toBeVisible();
    await page.getByLabel('Line 1 description').fill('Demo item');
    await page.getByLabel('Line 1 quantity').fill('2');
    await page.getByLabel('Line 1 unit price').fill('100');
    await expect(page.getByTestId('subtotal')).toHaveText('R200.00');
    await expect(page.getByTestId('vat')).toHaveText('R30.00');
    await expect(page.getByTestId('grand-total')).toHaveText('R230.00');

    // VAT inclusive: R200 gross = R173.91 + R26.09
    await page.getByTestId('vat-incl').click();
    await expect(page.getByTestId('grand-total')).toHaveText('R200.00');
    await expect(page.getByTestId('vat')).toHaveText('R26.09');
    await page.getByTestId('vat-excl').click();

    // Discount 10% -> R180 + R27 = R207
    await page.getByLabel('Line 1 discount percent').fill('10');
    await expect(page.getByTestId('discount')).toHaveText('-R20.00');
    await expect(page.getByTestId('grand-total')).toHaveText('R207.00');
    await page.getByLabel('Line 1 discount percent').fill('0');

    // Awkward rounding: 3 x 33.33 = 99.99 + 15.00 = 114.99
    await page.getByTestId('add-line').click();
    await page.getByLabel('Line 2 description').fill('Rounding check');
    await page.getByLabel('Line 2 quantity').fill('3');
    await page.getByLabel('Line 2 unit price').fill('33.33');
    await expect(page.getByTestId('grand-total')).toHaveText('R344.99');

    // Invalid input: zero qty + negative price blocks save
    await page.getByLabel('Line 2 quantity').fill('0');
    await page.getByLabel('Line 2 unit price').fill('-5');
    await page.getByTestId('save-doc').click();
    await expect(page.getByText('Quantity must be greater than zero.')).toBeVisible();
    await expect(page.getByText('Price cannot be negative.')).toBeVisible();
    await page.getByLabel('Remove line 2').click();

    // Save + issue + convert
    await page.getByTestId('save-doc').click();
    await expect(page.getByText(/saved \(this browser only\)/)).toBeVisible();
    await page.getByTestId('issue-doc').click();
    await page.getByTestId('convert-doc').click();
    await page.getByTestId('confirm-button').click();
    await expect(page.getByRole('heading', { name: /Invoice INV-D/ })).toBeVisible();
    await expect(page.getByTestId('grand-total')).toHaveText('R230.00');
    await expect(page.getByTestId('balance')).toHaveText('R230.00');
    const invoiceNumber = (await page.locator('.doc-title').textContent())!.replace('Invoice ', '').trim();

    // PDF download actually produces a file with the demo stamp and item
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-pdf').click()]);
    const file = path.join(SHOTS, download.suggestedFilename());
    await download.saveAs(file);
    const pdf = fs.readFileSync(file);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2000);
    const text = pdf.toString('latin1');
    expect(text).toContain('DEMONSTRATION / NOT A VALID TAX INVOICE');
    expect(text).toContain('Demo item');
    expect(text).toContain(invoiceNumber);

    // Partial payment
    await page.getByTestId('record-payment').click();
    await page.getByTestId('payment-amount').fill('500');
    await page.getByTestId('payment-submit').click();
    await expect(page.getByText(/exceeds the outstanding balance/)).toBeVisible();
    await page.getByTestId('payment-amount').fill('100');
    await page.getByTestId('payment-submit').click();
    await expect(page.getByTestId('paid')).toHaveText('R100.00');
    await expect(page.getByTestId('balance')).toHaveText('R130.00');

    // Statement reflects invoice + payment after reload (persistence)
    await page.reload();
    await page.getByRole('link', { name: 'Customer statement' }).click();
    await expect(page.getByTestId('statement-table')).toContainText(invoiceNumber);
    await expect(page.getByTestId('statement-table')).toContainText('R100.00');
    expect(errors).toEqual([]);
  });

  test('delete asks for confirmation', async ({ page }) => {
    await fresh(page);
    await page.goto('#/finance/quotations');
    const before = await page.getByTestId('quotation-row').count();
    await page.getByTestId('quotation-row').first().click();
    await page.getByTestId('delete-doc').click();
    await expect(page.getByRole('dialog')).toContainText('Delete');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByTestId('delete-doc').click();
    await page.getByTestId('confirm-button').click();
    await expect(page.getByTestId('quotation-row')).toHaveCount(before - 1);
  });
});

test.describe('Procurement / PPE workflow', () => {
  test('requester blocked; manager approves; finance sees approved request and raises PO; history and dashboard update', async ({ page }) => {
    await fresh(page);
    const pendingBefore = Number(await page.locator('.stat', { hasText: 'Pending approvals' }).locator('.metric-main').textContent());

    await page.goto('#/ppe');
    await page.getByTestId('role-requester').click();
    await page.getByTestId('new-request').click();
    await page.getByTestId('request-title').fill('Gloves for workshop');
    await page.getByTestId('request-department').fill('Workshop');
    await page.getByTestId('request-justification').fill('Fictional replacement of worn gloves.');
    await page.getByTestId('item-description').fill('Nitrile gloves (box)');
    await page.getByTestId('submit-request').click();
    await expect(page.locator('.doc-head .tag')).toHaveText('Awaiting review');
    await expect(page.getByTestId('approve-request')).toBeDisabled();
    await expect(page.getByTestId('reject-request')).toBeDisabled();
    await expect(page.getByText(/Requesters cannot approve or reject/).first()).toBeVisible();

    await page.getByTestId('role-manager').click();
    await expect(page.getByTestId('approve-request')).toBeEnabled();
    await page.getByTestId('approve-request').click();
    await page.getByTestId('decision-note').fill('Approved for demo.');
    await page.getByTestId('decision-confirm').click();
    await expect(page.locator('.doc-head .tag')).toHaveText('Approved');
    await expect(page.getByTestId('history')).toContainText('Approved for demo.');

    await page.getByTestId('role-finance').click();
    await expect(page.getByText(/Finance review: this request is approved/)).toBeVisible();
    await page.getByTestId('raise-po').click();
    await page.getByTestId('po-supplier').fill('Demo Safety Wear CC');
    await page.getByTestId('po-submit').click();
    await expect(page.getByTestId('history')).toContainText('Purchase order raised');
    await page.getByTestId('fulfil-request').click();
    await expect(page.locator('.doc-head .tag')).toHaveText('Fulfilled');

    await page.goto('#/');
    const pendingAfter = Number(await page.locator('.stat', { hasText: 'Pending approvals' }).locator('.metric-main').textContent());
    expect(pendingAfter).toBe(pendingBefore); // submitted then approved -> net zero pending
    await expect(page.locator('.table')).toContainText('Gloves for workshop');
  });

  test('manager cannot approve own request; owner can', async ({ page }) => {
    await fresh(page);
    await page.goto('#/procurement');
    await page.getByTestId('role-manager').click();
    await page.getByTestId('new-request').click();
    await page.getByTestId('request-title').fill('Manager self-request');
    await page.getByTestId('request-department').fill('Ops');
    await page.getByTestId('request-justification').fill('Testing separation of duties.');
    await page.getByTestId('item-description').fill('Item');
    await page.getByTestId('submit-request').click();
    await expect(page.getByTestId('approve-request')).toBeDisabled();
    await page.getByTestId('role-owner').click();
    await expect(page.getByTestId('approve-request')).toBeEnabled();
  });
});

test.describe('Fleet, reports, persistence and reset', () => {
  test('renewal due/overdue changes with dates and updates dashboard', async ({ page }) => {
    await fresh(page);
    await page.goto('#/fleet');
    const overdueBefore = Number(await page.locator('.stat', { hasText: 'Overdue' }).locator('.metric-main').textContent());
    expect(overdueBefore).toBeGreaterThan(0);
    await page.getByTestId('search').fill('FLT-003');
    await page.getByRole('link', { name: 'Open details →' }).click();
    await expect(page.getByTestId('date-licenceDue').locator('..').locator('.tag')).toHaveText('Overdue');
    await page.getByTestId('date-licenceDue').fill('2030-01-01');
    await expect(page.getByTestId('date-licenceDue').locator('..').locator('.tag')).toHaveText('On track');
    await page.getByTestId('save-asset').click();
    await page.goto('#/fleet');
    const overdueAfter = Number(await page.locator('.stat', { hasText: 'Overdue' }).locator('.metric-main').textContent());
    expect(overdueAfter).toBe(overdueBefore - 1);
  });

  test('recording a cost updates the monthly report', async ({ page }) => {
    await fresh(page);
    await page.goto('#/reports');
    const before = await page.locator('.stat', { hasText: 'Recorded costs' }).locator('.metric-main').textContent();
    await page.getByTestId('add-expense').click();
    await page.getByTestId('expense-description').fill('Test cost');
    await page.getByTestId('expense-amount').fill('123.45');
    await page.getByTestId('expense-submit').click();
    const after = await page.locator('.stat', { hasText: 'Recorded costs' }).locator('.metric-main').textContent();
    expect(after).not.toBe(before);
    await expect(page.getByTestId('expense-row').first()).toContainText('Test cost');
  });

  test('records survive reload; reset warns and restores seed', async ({ page }) => {
    await fresh(page);
    await page.goto('#/finance/customers');
    await page.getByTestId('new-customer').click();
    await page.getByTestId('customer-save').click();
    await expect(page.getByText('Customer name is required.')).toBeVisible();
    await page.getByTestId('customer-name').fill('Persistence Test Co.');
    await page.getByTestId('customer-save').click();
    await page.reload();
    await expect(page.locator('[data-testid=customer-row]', { hasText: 'Persistence Test Co.' })).toBeVisible();
    await page.goto('#/settings');
    await page.getByTestId('reset-demo').click();
    await expect(page.getByRole('dialog')).toContainText('cannot be undone');
    await page.getByTestId('confirm-button').click();
    await page.goto('#/finance/customers');
    await expect(page.locator('[data-testid=customer-row]', { hasText: 'Persistence Test Co.' })).toHaveCount(0);
  });

  test('owner view is hidden for other roles (simulated)', async ({ page }) => {
    await fresh(page);
    await page.goto('#/owner');
    await page.getByTestId('role-requester').click();
    await expect(page.getByText('Switch to the Owner role to view this page')).toBeVisible();
    await page.getByTestId('role-owner').click();
    await expect(page.getByText('Outstanding receivables')).toBeVisible();
  });
});

test.describe('Responsive viewports', () => {
  const pages: Array<[string, string]> = [['overview', '#/'], ['finance-quotation', '#/finance/quotations/quo_101'], ['fleet', '#/fleet'], ['procurement', '#/procurement'], ['reports', '#/reports']];
  for (const [w, h, name] of [[1440, 900, 'desktop-1440'], [1024, 768, 'desktop-1024'], [768, 1024, 'tablet-768'], [390, 844, 'mobile-390']] as Array<[number, number, string]>) {
    test(`${name}: no horizontal overflow, screenshots captured`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await fresh(page);
      for (const [label, route] of pages) {
        await page.goto(route);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${label} at ${w}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: path.join(SHOTS, `${name}-${label}.png`), fullPage: true });
      }
      if (w < 900) {
        await page.goto('#/');
        await page.getByRole('button', { name: 'Open navigation' }).click();
        await expect(page.getByRole('link', { name: 'Fleet & Equipment' })).toBeVisible();
        await page.screenshot({ path: path.join(SHOTS, `${name}-nav-open.png`) });
        await page.getByRole('link', { name: 'Fleet & Equipment' }).click();
        await expect(page.getByRole('heading', { name: 'Fleet & equipment', level: 1 })).toBeVisible();
      }
    });
  }
});
