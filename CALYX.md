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
