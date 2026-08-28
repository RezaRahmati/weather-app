import { test, expect, Page } from '@playwright/test';
import { mockWeatherApi } from './fixtures';

// ---------------------------------------------------------------------------
// Requirement bacc87c5-2e87-48b1-975d-30d7827cf4a4
// "In light mode the colors are not cheerful"
// One test per acceptance criterion (criterionId in the test title) so each
// verdict recorded in CALYX maps 1:1 to a re-runnable, video-recorded spec.
// The OpenWeather REST calls are intercepted (see ./fixtures.ts) so that
// weather-dependent UI (temperature, Cart cards, save toggle) is
// deterministic regardless of the sandbox's outbound network access.
// ---------------------------------------------------------------------------

const SKY_500 = 'rgb(14, 165, 233)';
const SKY_600 = 'rgb(2, 132, 199)';
const DARK_BG = 'rgb(16, 24, 39)'; // #101827

const GRADIENT_STOPS_HEX = ['#e0f2fe', '#bae6fd', '#93c5fd'];
const OLD_FLAT_GRAY = 'rgb(221, 221, 221)'; // #DDDDDD

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const rgbStringToRgb = (rgb: string) => {
  const m = rgb.match(/\d+/g)!.map(Number);
  return { r: m[0], g: m[1], b: m[2] };
};

const relLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
};

const contrastRatio = (rgbA: string, rgbB: string) => {
  const a = relLuminance(rgbStringToRgb(rgbA));
  const b = relLuminance(rgbStringToRgb(rgbB));
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
};

const worstCaseContrastAgainstGradient = (textRgb: string) =>
  Math.min(
    ...GRADIENT_STOPS_HEX.map((hex) => {
      const { r, g, b } = hexToRgb(hex);
      return contrastRatio(textRgb, `rgb(${r}, ${g}, ${b})`);
    })
  );

const getThemeToggle = (page: Page) =>
  page.locator('.flex.space-x-3 button').nth(2);

const getBodyBackground = (page: Page) =>
  page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return {
      backgroundColor: cs.backgroundColor,
      backgroundImage: cs.backgroundImage,
      backgroundInline: document.body.style.background,
    };
  });

test.describe('bacc87c5 – light mode colors are cheerful', () => {
  test.beforeEach(async ({ page }) => {
    await mockWeatherApi(page);
  });

  test('7868d2cf – light-mode background is no longer flat #DDDDDD, is a vibrant gradient', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const bg = await getBodyBackground(page);
    expect(bg.backgroundColor).not.toBe(OLD_FLAT_GRAY);
    // Old code set a flat solid color; new code sets a multi-stop gradient.
    expect(bg.backgroundImage).toContain('gradient');
    expect(bg.backgroundInline).not.toContain('#DDDDDD');
    for (const hex of GRADIENT_STOPS_HEX) {
      const { r, g, b } = hexToRgb(hex);
      expect(bg.backgroundImage).toContain(`rgb(${r}, ${g}, ${b})`);
    }
    await page.screenshot({ path: 'test-results/artifacts/7868d2cf-light-bg.png' });
  });

  test('4dce0660 – dark-mode background is unchanged, exactly #101827', async ({ page }) => {
    await page.goto('/');
    await getThemeToggle(page).click();
    await page.waitForTimeout(400);
    const bg = await getBodyBackground(page);
    expect(bg.backgroundColor).toBe(DARK_BG);
    expect(bg.backgroundImage).toBe('none');
    await page.screenshot({ path: 'test-results/artifacts/4dce0660-dark-bg.png' });
  });

  test('d45adc16 – Header "Get started" and Modal "Go!" use vibrant accent, not gray, with hover change', async ({
    page,
  }) => {
    await page.goto('/');
    const getStarted = page.getByRole('button', { name: 'Get started' });
    await expect(getStarted).toHaveClass(/bg-sky-500/);
    await expect(getStarted).not.toHaveClass(/bg-gray-200/);
    const beforeHover = await getStarted.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(beforeHover).toBe(SKY_500);
    await getStarted.hover();
    await page.waitForTimeout(200);
    const afterHover = await getStarted.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(afterHover).toBe(SKY_600);
    expect(afterHover).not.toBe(beforeHover);

    await getStarted.click();
    const modalGo = page.getByRole('button', { name: 'Go!' });
    await expect(modalGo).toBeVisible();
    await expect(modalGo).toHaveClass(/bg-sky-500/);
    await expect(modalGo).not.toHaveClass(/bg-gray-200/);
    const modalBefore = await modalGo.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(modalBefore).toBe(SKY_500);
    await modalGo.hover();
    await page.waitForTimeout(200);
    const modalAfter = await modalGo.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(modalAfter).toBe(SKY_600);
    await page.screenshot({ path: 'test-results/artifacts/d45adc16-modal.png' });
  });

  test('e994dcca – Home save button + Saved page Cart save/delete + More info link use the same accent, not gray', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);
    const saveBtn = page.locator('button', { hasText: /saved/i });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveClass(/bg-sky-500/);
    await expect(saveBtn).not.toHaveClass(/bg-gray-200/);
    const saveBg = await saveBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(saveBg).toBe(SKY_500);
    // Click to add it to saved, then verify the Saved page's Cart controls.
    await saveBtn.click();
    await page.waitForTimeout(300);

    await page.goto('/#/saved');
    await page.waitForTimeout(800);
    const moreInfo = page.getByRole('link', { name: /more info/i });
    const cartSaveBtn = page.locator('div.flex.justify-between > button');
    await expect(moreInfo).toBeVisible();
    await expect(cartSaveBtn).toBeVisible();
    await expect(moreInfo).toHaveClass(/bg-sky-500/);
    await expect(moreInfo).not.toHaveClass(/bg-gray-200/);
    await expect(cartSaveBtn).toHaveClass(/bg-sky-500/);
    await expect(cartSaveBtn).not.toHaveClass(/bg-gray-200/);
    const moreInfoBg = await moreInfo.evaluate((el) => getComputedStyle(el).backgroundColor);
    const cartBtnBg = await cartSaveBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(moreInfoBg).toBe(SKY_500);
    expect(cartBtnBg).toBe(SKY_500);
    await page.screenshot({ path: 'test-results/artifacts/e994dcca-saved-cart.png' });
  });

  test('fa66ff22 – body/heading text remains legible against new light-mode colors', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    // Text sitting directly on the new gradient body background (Home page).
    const cityLine = page.locator('span.mb-5.font-semibold');
    const cityColor = await cityLine.evaluate((el) => getComputedStyle(el).color);
    const cityContrast = worstCaseContrastAgainstGradient(cityColor);
    console.log(`[contrast] city/heading text vs gradient (worst stop): ${cityContrast.toFixed(2)}:1`);

    const tempLine = page.locator('span.text-5xl');
    const tempColor = await tempLine.evaluate((el) => getComputedStyle(el).color);
    const tempContrast = worstCaseContrastAgainstGradient(tempColor);
    console.log(`[contrast] large temperature text vs gradient (worst stop): ${tempContrast.toFixed(2)}:1`);

    // Button label text (white) against the new sky-500 accent background.
    const saveBtn = page.locator('button', { hasText: /saved/i });
    const saveBtnTextColor = await saveBtn.evaluate((el) => getComputedStyle(el).color);
    const saveBtnBg = await saveBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    const btnContrast = contrastRatio(saveBtnTextColor, saveBtnBg);
    console.log(`[contrast] "Add to saved" button label (white) vs sky-500 fill: ${btnContrast.toFixed(2)}:1`);
    await saveBtn.screenshot({ path: 'test-results/artifacts/fa66ff22-save-button.png' });

    // Contact page text against the gradient background too.
    await page.goto('/#/contact');
    await page.waitForTimeout(300);
    const contactHeading = page.locator('div.text-gray-700').first();
    const contactColor = await contactHeading.evaluate((el) => getComputedStyle(el).color);
    const contactContrast = worstCaseContrastAgainstGradient(contactColor);
    console.log(`[contrast] Contact page body text vs gradient (worst stop): ${contactContrast.toFixed(2)}:1`);

    await page.screenshot({ path: 'test-results/artifacts/fa66ff22-text-legibility.png' });

    // WCAG 2.1 AA reference thresholds: 4.5:1 normal text, 3:1 large text / UI components.
    expect.soft(cityContrast, 'heading text vs gradient background').toBeGreaterThanOrEqual(4.5);
    expect.soft(tempContrast, 'large temperature text vs gradient background').toBeGreaterThanOrEqual(3);
    expect.soft(contactContrast, 'Contact page text vs gradient background').toBeGreaterThanOrEqual(4.5);
    expect.soft(btnContrast, 'white button label vs sky-500 fill (WCAG AA normal-text minimum)').toBeGreaterThanOrEqual(4.5);
  });

  test('ebbd8378 – same accent color used consistently across Header/Home/Saved-Cart/Modal', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    const headerBtn = page.getByRole('button', { name: 'Get started' });
    const headerBg = await headerBtn.evaluate((el) => getComputedStyle(el).backgroundColor);

    const homeSaveBtn = page.locator('button', { hasText: /saved/i });
    const homeBg = await homeSaveBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Add the currently-loaded city to saved so a Cart card exists on /saved.
    await homeSaveBtn.click();
    await page.waitForTimeout(300);

    await headerBtn.click();
    const modalGo = page.getByRole('button', { name: 'Go!' });
    const modalBg = await modalGo.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.keyboard.press('Escape').catch(() => {});

    await page.goto('/#/saved');
    await page.waitForTimeout(800);
    const cartMoreInfo = page.getByRole('link', { name: /more info/i });
    const cartBtn = page.locator('div.flex.justify-between > button');
    const cartMoreInfoBg = await cartMoreInfo.evaluate((el) => getComputedStyle(el).backgroundColor);
    const cartBtnBg = await cartBtn.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(new Set([headerBg, homeBg, modalBg, cartMoreInfoBg, cartBtnBg]).size).toBe(1);
    expect(headerBg).toBe(SKY_500);
  });

  test('7882aab8 – toggling theme repeatedly still works with no console errors, all 3 routes render in both modes', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    const toggle = getThemeToggle(page);

    for (let i = 0; i < 4; i++) {
      await toggle.click();
      await page.waitForTimeout(200);
    }

    // Navigate via the SPA nav links (not page.goto, which would reload and
    // reset in-memory theme state) so we exercise the real toggle+navigate
    // user flow across all 3 routes in both light and dark mode.
    const navLinks: Record<string, string> = { '/': 'Home', '/saved': 'Saved', '/contact': 'Contact' };
    for (const [, linkName] of Object.entries(navLinks)) {
      for (const wantDark of [false, true]) {
        const bg = await getBodyBackground(page);
        const isDark = bg.backgroundColor === DARK_BG;
        if (isDark !== wantDark) {
          await toggle.click();
          await page.waitForTimeout(200);
        }
        await page.getByRole('link', { name: linkName, exact: true }).first().click();
        await page.waitForTimeout(300);
        await expect(page.locator('header')).toBeVisible();
      }
    }

    const relevantErrors = errors.filter((e) => !/Failed to load resource/i.test(e));
    expect(relevantErrors, `console/page errors seen: ${relevantErrors.join('\n')}`).toEqual([]);
  });

  test('c6755468 – search modal and add/remove-saved interactions keep working', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Search modal: open, type a city, submit -> weather updates + navigates home.
    await page.getByRole('button', { name: 'Get started' }).click();
    const input = page.getByPlaceholder('Bratislava', { exact: false });
    await input.fill('Paris');
    await page.getByRole('button', { name: 'Go!' }).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL('http://localhost:3000/#/');
    await expect(page.getByText('Paris', { exact: false })).toBeVisible();

    // Add to saved toggles button label via IsSaved.
    const saveBtn = page.locator('button', { hasText: /saved/i });
    await expect(saveBtn).toContainText(/add to saved/i);
    await saveBtn.click();
    await page.waitForTimeout(400);
    await expect(saveBtn).toContainText(/delete from saved/i);

    // Saved page shows the card; remove via its own save/delete button.
    await page.goto('/#/saved');
    await page.waitForTimeout(800);
    const cartBtn = page.locator('div.flex.justify-between > button');
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText("You don't have saved weather")).toBeVisible();
  });
});
