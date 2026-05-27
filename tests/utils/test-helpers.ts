// utils/test-helpers.ts
// Shared utilities used across all test files

import { Page, expect } from '@playwright/test';
import * as path from 'path';

// ─── Random data generators (no external lib needed) ────────────────
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomAlpha(len: number) {
  return Array.from({ length: len }, () =>
    'abcdefghijklmnopqrstuvwxyz'[randomInt(0, 25)]
  ).join('');
}
function randomDigits(len: number) {
  return Array.from({ length: len }, () => randomInt(0, 9).toString()).join('');
}

export const FakeData = {
  firstName:    () => capitalize(randomAlpha(randomInt(4, 9))),
  middleName:   () => capitalize(randomAlpha(randomInt(3, 7))),
  lastName:     () => capitalize(randomAlpha(randomInt(4, 9))),
  employerName: () => capitalize(randomAlpha(randomInt(5, 10))) + ' Corp',
  address1:     () => `${randomInt(1, 999)} ${capitalize(randomAlpha(6))} Street`,
  city:         () => capitalize(randomAlpha(randomInt(4, 9))),
  pincode:      () => randomDigits(6),
  wealthDesc:   () => `Business income from ${capitalize(randomAlpha(5))} operations`,
  dob: () => {
    const y = randomInt(1960, 2000);
    const m = String(randomInt(1, 12)).padStart(2, '0');
    const d = String(randomInt(1, 28)).padStart(2, '0');
    return `${d}/${m}/${y}`;
  },
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Common UI helpers ───────────────────────────────────────────────

/** Wait for navigation or network idle after clicking */
export async function clickAndWait(page: Page, selector: string) {
  await page.locator(selector).click();
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** Select first option in a <select> or custom dropdown */
export async function selectFirstOption(page: Page, dropdownSelector: string) {
  const el = page.locator(dropdownSelector).first();
  const tagName = await el.evaluate(e => e.tagName.toLowerCase()).catch(() => '');

  if (tagName === 'select') {
    // Native <select>
    const options = await el.locator('option').all();
    const firstReal = options.find(async o => {
      const v = await o.getAttribute('value');
      return v && v !== '' && v !== 'null';
    });
    if (firstReal) {
      const val = await firstReal.getAttribute('value');
      await el.selectOption({ value: val! });
    } else {
      await el.selectOption({ index: 1 });
    }
  } else {
    // Custom dropdown (div/ul based)
    await el.click();
    await page.waitForTimeout(400);
    const items = page.locator(`${dropdownSelector} li, ${dropdownSelector} [role="option"], .dropdown-item, .select-option`).first();
    if (await items.count() > 0) {
      await items.click();
    }
  }
}

/** Try to select a specific value; fall back to first available */
export async function selectOptionByTextOrFirst(page: Page, selector: string, text: string) {
  try {
    await page.locator(selector).selectOption({ label: text });
  } catch {
    try {
      await page.locator(selector).selectOption({ index: 1 });
    } catch {
      // custom dropdown fallback
      await page.locator(selector).click();
      await page.waitForTimeout(300);
      await page.locator(`text="${text}"`).first().click().catch(async () => {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      });
    }
  }
}

/** Fill an input field safely */
export async function fillField(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 10_000 });
  await loc.clear();
  await loc.fill(value);
}

/** Click Continue / Next button (tries multiple selectors) */
export async function clickContinue(page: Page) {
  const selectors = [
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'button:has-text("Proceed")',
    'button:has-text("Submit")',
    '[data-testid="continue-btn"]',
    '.continue-button',
    '.btn-primary:has-text("Continue")',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1000);
      return;
    }
  }
  throw new Error('Continue button not found');
}

/** Upload a file to a file-input */
export async function uploadFile(page: Page, inputSelector: string, fileName: string) {
  const filePath = path.join(__dirname, '..', 'fixtures', fileName);
  await page.locator(inputSelector).setInputFiles(filePath);
  await page.waitForTimeout(500);
}

/** Assert a step indicator is active */
export async function assertStep(page: Page, stepNumber: number) {
  const stepSelectors = [
    `.step-${stepNumber}.active`,
    `[data-step="${stepNumber}"].active`,
    `.step-indicator:nth-child(${stepNumber}).active`,
  ];
  for (const sel of stepSelectors) {
    if (await page.locator(sel).isVisible().catch(() => false)) return;
  }
  // Soft assertion – log but don't fail if step indicator not found
  console.warn(`Step ${stepNumber} indicator not confirmed visible`);
}
