import { test, expect, Page } from '@playwright/test';
import { mockWeatherApi } from './fixtures';

// ---------------------------------------------------------------------------
// Requirement 1beb6c21-1191-462d-8ac7-76bee2e9bc94
// "Allow user to switch between Celsius and Fahrenheit"
// One test per acceptance criterion (criterionId in the test title) so each
// verdict recorded in CALYX maps 1:1 to a re-runnable, video-recorded spec.
// The OpenWeather REST calls are intercepted (see ./fixtures.ts) so that
// weather-dependent UI (temperature, Cart cards) is deterministic regardless
// of the sandbox's outbound network access. Default fixture: temp=18.5C,
// feels_like=18.0C (for city "London", used for the geolocation-based
// initial load). "Oymyakon" -> -5C/-5C, "Longyearbyen" -> 0C/0C, added to
// ./fixtures.ts to exercise the negative/zero-Celsius conversion edge case.
// ---------------------------------------------------------------------------

test.use({
  permissions: ['geolocation'],
  geolocation: { latitude: 51.5085, longitude: -0.1257 },
});

const OW_API = '**api.openweathermap.org/data/2.5/weather**';

const unitToggleC = (page: Page) => page.getByTestId('unit-toggle-c');
const unitToggleF = (page: Page) => page.getByTestId('unit-toggle-f');

const getMainTemp = async (page: Page) => {
  const text = await page.locator('span.text-5xl').innerText();
  const m = text.match(/(-?\d+)°([CF])/);
  if (!m) throw new Error(`could not parse main temp from "${text}"`);
  return { value: Number(m[1]), unit: m[2] as 'C' | 'F' };
};

const getFeelsLike = async (page: Page) => {
  const text = await page.locator('li', { hasText: 'Feels like' }).innerText();
  const m = text.match(/(-?\d+)°([CF])/);
  if (!m) throw new Error(`could not parse feels-like from "${text}"`);
  return { value: Number(m[1]), unit: m[2] as 'C' | 'F' };
};

const getCartTemp = async (page: Page) => {
  const text = await page.locator('span.mb-1', { hasText: 'Temperature:' }).innerText();
  const m = text.match(/(-?\d+)°([CF])/);
  if (!m) throw new Error(`could not parse cart temp from "${text}"`);
  return { value: Number(m[1]), unit: m[2] as 'C' | 'F' };
};

const getCartFeelsLike = async (page: Page) => {
  const text = await page.locator('span.mb-4', { hasText: 'Feels Like:' }).innerText();
  const m = text.match(/(-?\d+)°([CF])/);
  if (!m) throw new Error(`could not parse cart feels-like from "${text}"`);
  return { value: Number(m[1]), unit: m[2] as 'C' | 'F' };
};

// London fixture: temp=18.5C, feels_like=18.0C
const EXPECT_C_TEMP = 19; // Math.ceil(18.5)
const EXPECT_C_FEELS = 18; // Math.ceil(18.0)
const EXPECT_F_TEMP = 66; // Math.ceil(18.5*9/5+32) = Math.ceil(65.3)
const EXPECT_F_FEELS = 65; // Math.ceil(18.0*9/5+32) = Math.ceil(64.4)

test.describe('1beb6c21 – switch between Celsius and Fahrenheit', () => {
  test.beforeEach(async ({ page }) => {
    await mockWeatherApi(page);
  });

  test('8f694d7a – visible clickable unit toggle in header on Home and Saved, styled like theme toggle', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    const group = page.getByRole('group', { name: /temperature unit toggle/i });
    await expect(group).toBeVisible();
    await expect(unitToggleC(page)).toBeVisible();
    await expect(unitToggleF(page)).toBeVisible();
    await expect(unitToggleC(page)).toBeEnabled();
    await expect(unitToggleF(page)).toBeEnabled();

    // Same container group as the theme toggle (.flex.space-x-3), i.e. same
    // placement pattern as the existing dark/light toggle.
    const themeToggleParent = page.locator('.flex.space-x-3');
    await expect(themeToggleParent).toContainText('°C');
    await expect(themeToggleParent).toContainText('°F');

    await page.screenshot({ path: 'test-results/artifacts/8f694d7a-home-toggle.png' });

    await page.goto('/#/saved');
    await page.waitForTimeout(500);
    await expect(page.getByRole('group', { name: /temperature unit toggle/i })).toBeVisible();
    await expect(unitToggleC(page)).toBeVisible();
    await expect(unitToggleF(page)).toBeVisible();
    await page.screenshot({ path: 'test-results/artifacts/8f694d7a-saved-toggle.png' });
  });

  test('c30af738 – fresh load with no stored preference shows Celsius, toggle-c active', async ({
    page,
  }) => {
    // Fresh Playwright test context => empty localStorage, no prior 'unit' key.
    await page.goto('/');
    await page.waitForTimeout(800);

    const stored = await page.evaluate(() => localStorage.getItem('unit'));
    expect(stored).toBeNull();

    await expect(unitToggleC(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(unitToggleF(page)).toHaveAttribute('aria-pressed', 'false');

    const temp = await getMainTemp(page);
    const feels = await getFeelsLike(page);
    expect(temp).toEqual({ value: EXPECT_C_TEMP, unit: 'C' });
    expect(feels).toEqual({ value: EXPECT_C_FEELS, unit: 'C' });

    await page.screenshot({ path: 'test-results/artifacts/c30af738-default-celsius.png' });
  });

  test('e958a91c – toggling C to F recomputes both values, no reload, no new API request', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    expect(await getMainTemp(page)).toEqual({ value: EXPECT_C_TEMP, unit: 'C' });
    expect(await getFeelsLike(page)).toEqual({ value: EXPECT_C_FEELS, unit: 'C' });

    // Mark the page instance so we can prove no full reload happened.
    await page.evaluate(() => {
      (window as any).__qaMarker = 'still-alive';
    });

    let apiRequestsAfterMark = 0;
    page.on('request', (req) => {
      if (req.url().includes('api.openweathermap.org/data/2.5/weather')) {
        apiRequestsAfterMark++;
      }
    });

    await unitToggleF(page).click();
    await page.waitForTimeout(500);

    expect(await getMainTemp(page)).toEqual({ value: EXPECT_F_TEMP, unit: 'F' });
    expect(await getFeelsLike(page)).toEqual({ value: EXPECT_F_FEELS, unit: 'F' });
    await expect(unitToggleF(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(unitToggleC(page)).toHaveAttribute('aria-pressed', 'false');

    // Marker survives => no full page reload was triggered by the click.
    const marker = await page.evaluate(() => (window as any).__qaMarker);
    expect(marker).toBe('still-alive');

    // No additional weather API call fired as a result of the unit toggle.
    expect(apiRequestsAfterMark).toBe(0);

    await page.screenshot({ path: 'test-results/artifacts/e958a91c-fahrenheit.png' });
  });

  test('6dfa789e – toggling F back to C reverts to original Celsius values', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    const originalTemp = await getMainTemp(page);
    const originalFeels = await getFeelsLike(page);
    expect(originalTemp).toEqual({ value: EXPECT_C_TEMP, unit: 'C' });
    expect(originalFeels).toEqual({ value: EXPECT_C_FEELS, unit: 'C' });

    await unitToggleF(page).click();
    await page.waitForTimeout(400);
    expect(await getMainTemp(page)).toEqual({ value: EXPECT_F_TEMP, unit: 'F' });

    await unitToggleC(page).click();
    await page.waitForTimeout(400);

    expect(await getMainTemp(page)).toEqual(originalTemp);
    expect(await getFeelsLike(page)).toEqual(originalFeels);
    await expect(unitToggleC(page)).toHaveAttribute('aria-pressed', 'true');

    await page.screenshot({ path: 'test-results/artifacts/6dfa789e-back-to-celsius.png' });
  });

  test('80e729a6 – Fahrenheit chosen on Home applies to Saved page Cart cards without reselecting', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    // Save the currently-loaded city (London, via geolocation fixture).
    const saveBtn = page.locator('button', { hasText: /saved/i });
    await saveBtn.click();
    await page.waitForTimeout(300);

    // Switch to Fahrenheit on Home.
    await unitToggleF(page).click();
    await page.waitForTimeout(400);
    expect(await getMainTemp(page)).toEqual({ value: EXPECT_F_TEMP, unit: 'F' });

    // Navigate to Saved — do not touch the toggle there.
    await page.goto('/#/saved');
    await page.waitForTimeout(800);

    await expect(unitToggleF(page)).toHaveAttribute('aria-pressed', 'true');
    const cartTemp = await getCartTemp(page);
    const cartFeels = await getCartFeelsLike(page);
    expect(cartTemp).toEqual({ value: EXPECT_F_TEMP, unit: 'F' });
    expect(cartFeels).toEqual({ value: EXPECT_F_FEELS, unit: 'F' });

    await page.screenshot({ path: 'test-results/artifacts/80e729a6-saved-fahrenheit.png' });
  });

  test('c9924f7e – Fahrenheit selection persists across a full browser reload (Home and Saved)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    const saveBtn = page.locator('button', { hasText: /saved/i });
    await saveBtn.click();
    await page.waitForTimeout(300);

    await unitToggleF(page).click();
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => localStorage.getItem('unit'))).toBe('F');

    // Full browser reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await expect(unitToggleF(page)).toHaveAttribute('aria-pressed', 'true');
    expect(await getMainTemp(page)).toEqual({ value: EXPECT_F_TEMP, unit: 'F' });
    expect(await getFeelsLike(page)).toEqual({ value: EXPECT_F_FEELS, unit: 'F' });
    await page.screenshot({ path: 'test-results/artifacts/c9924f7e-home-after-reload.png' });

    await page.goto('/#/saved');
    await page.waitForTimeout(800);
    await expect(unitToggleF(page)).toHaveAttribute('aria-pressed', 'true');
    expect(await getCartTemp(page)).toEqual({ value: EXPECT_F_TEMP, unit: 'F' });
    expect(await getCartFeelsLike(page)).toEqual({ value: EXPECT_F_FEELS, unit: 'F' });
    await page.screenshot({ path: 'test-results/artifacts/c9924f7e-saved-after-reload.png' });
  });

  test('40532ef7 – sub-zero and zero Celsius readings convert to Fahrenheit exactly (-5C->23F, 0C->32F)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    // Search for a cold-climate city mocked at -5C / -5C feels-like.
    await page.getByRole('button', { name: 'Get started' }).click();
    const input = page.getByPlaceholder('Bratislava', { exact: false });
    await input.fill('Oymyakon');
    await page.getByRole('button', { name: 'Go!' }).click();
    await page.waitForTimeout(600);
    await expect(page.getByText('Oymyakon', { exact: false })).toBeVisible();

    expect(await getMainTemp(page)).toEqual({ value: -5, unit: 'C' });

    await unitToggleF(page).click();
    await page.waitForTimeout(400);
    const oymyakonF = await getMainTemp(page);
    expect(oymyakonF).toEqual({ value: 23, unit: 'F' }); // Math.ceil(-5*9/5+32) = 23
    const oymyakonFeelsF = await getFeelsLike(page);
    expect(oymyakonFeelsF).toEqual({ value: 23, unit: 'F' });
    await page.screenshot({ path: 'test-results/artifacts/40532ef7-oymyakon-fahrenheit.png' });

    // Back to Celsius, then search a 0C city to confirm the zero-value case.
    await unitToggleC(page).click();
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Get started' }).click();
    await input.fill('Longyearbyen');
    await page.getByRole('button', { name: 'Go!' }).click();
    await page.waitForTimeout(600);
    await expect(page.getByText('Longyearbyen', { exact: false })).toBeVisible();

    expect(await getMainTemp(page)).toEqual({ value: 0, unit: 'C' });

    await unitToggleF(page).click();
    await page.waitForTimeout(400);
    expect(await getMainTemp(page)).toEqual({ value: 32, unit: 'F' }); // Math.ceil(0*9/5+32) = 32
    await page.screenshot({ path: 'test-results/artifacts/40532ef7-longyearbyen-fahrenheit.png' });
  });
});
