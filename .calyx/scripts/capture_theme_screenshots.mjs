// Quick visual sanity-check script for the light/dark theme color pass.
// Boots against an already-running dev server (default http://localhost:3000)
// and saves small, pre-downscaled screenshots (safe to view directly) to /tmp.
//
// Usage: node .calyx/scripts/capture_theme_screenshots.mjs [baseUrl]

import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:3000';

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/light-home.png' });

  // Toggle to dark mode via the sun/moon icon in the Header (3rd icon button
  // in the header's icon row: github, discord, theme-toggle).
  await page.evaluate(() => {
    const toggle = document.querySelector('.flex.space-x-3 button:nth-child(3)');
    if (toggle) toggle.click();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/dark-home.png' });

  await browser.close();
};

run();
