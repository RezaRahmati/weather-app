# CALYX repo memory

## Setup (2024, verified working)
- Node v22.22.0 / npm 10.9.4 in the sandbox works fine with this CRA app.
- `npm install` completes cleanly (only npm audit warnings, no blockers).
- Boot with: `BROWSER=none nohup npm run start > /tmp/app.log 2>&1 &` then wait
  ~15-20s. Dev server listens on `http://localhost:3000`.
- No backend/services to run — it's a static CRA app that calls the public
  OpenWeather API directly from the browser and uses `navigator.geolocation`
  (falls back to a hardcoded coord in `App.tsx` if geolocation is denied/unavailable,
  e.g. in a headless sandbox).
- Pre-existing ESLint warnings on `npm start` (target=_blank rel, array-callback-return,
  react-hooks/exhaustive-deps) are unrelated to any CALYX work — do not "fix" them
  unless a requirement asks for it.
- No CLAUDE.md/AGENTS.md/CONTRIBUTING.md in this repo; only README.md (basic install
  instructions) — nothing that overrides the generic CALYX workflow.
- Theme: `App.tsx` holds a boolean `theme` in state and toggles Tailwind's `dark`
  class per-page (dark mode via `darkMode: 'class'` in tailwind.config.js). Light
  mode is the default (no `dark:` prefix) styles.
- Visual verification: `playwright` is not a project dependency; it's not preinstalled
  either. `npm install --no-save playwright` + `npx playwright install chromium --with-deps`
  works in this sandbox (no docker needed) — takes ~1-2 min to download the browser.
  A reusable screenshot helper lives at `.calyx/scripts/capture_theme_screenshots.mjs`
  (viewport 1000x700, well under the 1500px screenshot-viewing limit) — run it with
  `node .calyx/scripts/capture_theme_screenshots.mjs http://localhost:3000` while the
  dev server is up; it saves `/tmp/light-home.png` and `/tmp/dark-home.png` and clicks
  the theme toggle via `.flex.space-x-3 button:nth-child(3)` in the Header (order:
  github, discord, theme-toggle icon buttons).
- The app calls the public OpenWeather API from the browser; in a sandboxed run with
  no outbound network/geolocation you'll see "Error: couldn't find weather" on Home —
  expected, unrelated to styling/theme work, and does not block visual verification of
  colors/layout.
- Gotcha for QA/Playwright automation: `App.tsx` calls `navigator.geolocation.getCurrentPosition`
  on load. In a headless browser context with no geolocation permission decision, this can
  leave requests outstanding indefinitely. If a QA/automation agent's browser session hangs
  (stuck mid tool-call for a very long time with no reply), this is the likely cause. Fix:
  create the Playwright context with `{ permissions: ['geolocation'], geolocation: { latitude, longitude } }`
  so geolocation resolves immediately, and prefer `waitUntil: 'domcontentloaded'` over
  `'networkidle'` for page.goto, with explicit per-action timeouts.

## Celsius/Fahrenheit unit toggle (2024)
- Unit preference lives in a new redux slice `src/store/slices/unitSlice.ts`
  (`state.unit.unit`, values `'C' | 'F'`), persisted to `localStorage['unit']`.
  Default is `'C'` when nothing is stored. Shared across Home and Saved pages
  since both read the same redux store — no prop drilling needed.
- Conversion helper: `src/helpers/convertTemp.ts` — `convertTemp(celsiusValue, unit)`,
  uses `Math.ceil` for both units (`Math.ceil(c)` for C, `Math.ceil(c*9/5+32)` for F).
  This mirrors the app's pre-existing Celsius rounding behavior exactly.
- UI: Header now has a two-button segmented control next to the theme toggle,
  inside the same `.flex.space-x-3` group as the last child (so the pre-existing
  `.flex.space-x-3 button:nth-child(3)` selector for the theme toggle in
  `light-mode-colors.spec.ts` still resolves correctly — the unit toggle is a
  `<div>` sibling *after* the 3 buttons, not another button among them).
  Test hooks: `[data-testid="unit-toggle-c"]` / `[data-testid="unit-toggle-f"]`,
  each with `aria-pressed` reflecting the active unit.
- Toggling unit does NOT refetch weather — it only recomputes the display from
  the already-fetched Celsius data in redux, so `mockWeatherApi` route-call
  counts are unaffected by toggling.
- For a sub-zero-temperature test fixture, extend `e2e/fixtures.ts`'s
  `makeWeatherFixture`/`mockWeatherApi` to vary `main.temp`/`main.feels_like`
  by requested city name (e.g. a `-5`°C fixture) rather than adding a second
  mock helper.
