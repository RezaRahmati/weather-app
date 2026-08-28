# CALYX Repo Memory

Notes from running this repo inside the CALYX cloud sandbox. Keep this file tight and current — update entries instead of stacking duplicates.

## Setup & boot

- Plain `npm install` works with Node 22 / npm 10 (no lockfile conflicts observed).
- Boot with `npm start` (create-react-app / react-scripts). Dev server binds to port 3000.
- No Docker, no backend, no database — this is a pure client-side SPA that calls the public OpenWeatherMap API directly from the browser.
- Use `.calyx/scripts/start_app.sh` to boot in the background with `BROWSER=none` (prevents react-scripts from trying to open a system browser, which fails in the sandbox) and logs to `/tmp/weather-app.log`. Server is ready when `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` returns `200` (takes roughly 20-30s after start).
- Pre-existing ESLint warnings (unused vars, missing hook deps, target=_blank rel) show up on every `npm start` — they are not build-breaking and predate this run; don't treat them as new regressions unless a change adds more of the same class.

## Gotchas

- Geolocation: `App.tsx` calls `navigator.geolocation.getCurrentPosition`; in a headless/sandboxed browser it will normally deny/error, and the app falls back to a hard-coded coordinate (lat 37.45, lon 12.52) which is fine for verification — a real weather response still comes back.
- OpenWeatherMap API key is hard-coded client-side in `src/async/getWeather.ts` and `src/components/Cart.tsx` (pre-existing in the repo, not introduced by CALYX runs). Real network calls to `api.openweathermap.org` are required for weather data — there's no mock/offline mode.
