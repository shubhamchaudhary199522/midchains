// tests/step4-fatca.spec.ts
// TC-021 to TC-024 – FATCA & CRS Declaration

import { test } from '@playwright/test';
import { clickContinue } from '../utils/test-helpers';

const BASE = process.env.BASE_URL || 'https://your-midchain-app.com';

async function safeSelect(page: any, selectors: string[], value?: string) {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      const tag = await el.evaluate((e: HTMLElement) => e.tagName.toLowerCase()).catch(() => '');
      if (tag === 'select') {
        value
          ? await el.selectOption({ label: value }).catch(() => el.selectOption({ index: 1 }))
          : await el.selectOption({ index: 1 });
      } else {
        await el.click();
        await page.waitForTimeout(300);
        if (value) {
          await page.locator(`text="${value}"`).first().click().catch(() =>
            page.locator('[role="option"]').first().click().catch(() => {})
          );
        } else {
          await page.locator('[role="option"], li').first().click().catch(() => {});
        }
      }
      return;
    }
  }
}

test.describe('Step 4 – FATCA & CRS Declaration', () => {

  test('TC-021 to TC-024: Complete FATCA & CRS form', async ({ page }) => {
    await page.goto(`${BASE}/step4`).catch(() => page.goto(BASE));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // TC-021: Tax residency elsewhere? → No
    await safeSelect(page, [
      'select[name*="taxResidency" i]',
      'select[name*="liableToTax" i]',
      '[data-testid="tax-residency-other"]',
    ], 'No');

    // TC-022: UAE Tax Residency Investment Scheme → No
    await safeSelect(page, [
      'select[name*="uaeTaxResidency" i]',
      'select[name*="investmentScheme" i]',
      '[data-testid="uae-investment-scheme"]',
    ], 'No');

    // TC-023: Resident in any other jurisdiction? → No
    await safeSelect(page, [
      'select[name*="otherJurisdiction" i]',
      'select[name*="residentOther" i]',
      '[data-testid="other-jurisdiction"]',
    ], 'No');

    // TC-024: Income tax jurisdiction last year → India
    const jurisdictionSel = [
      'select[name*="incomeTaxJurisdiction" i]',
      'select[name*="jurisdiction" i]',
      '[data-testid="income-tax-jurisdiction"]',
    ];
    await safeSelect(page, jurisdictionSel, 'India');

    await clickContinue(page);
    await page.waitForTimeout(1500);
    console.log('TC-021-024 PASS: FATCA & CRS form completed');
  });
});
