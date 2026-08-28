import { Page, Route } from '@playwright/test';

// Canned OpenWeather API response, used to make the app's weather-dependent
// UI (temperature, save button, Cart card) deterministic and testable without
// relying on outbound network access from the sandbox.
export const makeWeatherFixture = (
  name: string,
  country = 'GB',
  temp = 18.5,
  feels_like = 18.0
) => ({
  coord: { lon: -0.1257, lat: 51.5085 },
  weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
  main: {
    temp,
    feels_like,
    temp_min: 17,
    temp_max: 20,
    pressure: 1012,
    sea_level: 1012,
    grnd_level: 1008,
    humidity: 60,
    visibility: 10000,
  },
  wind: { speed: 3.1, deg: 200, gust: 4.0 },
  clouds: { all: 0 },
  dt: '1700000000',
  sys: { type: 2, id: 2000, country, sunrise: 1699999999, sunset: 1700000000 },
  timezone: 0,
  id: 2643743,
  name,
  cod: 200,
});

// Per-city overrides used by the unit-toggle QA spec to exercise sub-zero and
// zero Celsius readings (the default fixture above is a fixed 18.5/18.0C,
// which can never surface a negative-Fahrenheit-formula edge case).
const CITY_OVERRIDES: Record<string, { country?: string; temp: number; feels_like: number }> = {
  Oymyakon: { country: 'RU', temp: -5, feels_like: -5 },
  Longyearbyen: { country: 'SJ', temp: 0, feels_like: 0 },
};

// Intercepts all calls to the OpenWeather REST endpoint and fulfills them
// with a deterministic fixture, keyed off the `q=<city>` query param when
// present (falls back to "London" for the geolocation-based lookup on load).
export const mockWeatherApi = async (page: Page) => {
  await page.route('**api.openweathermap.org/data/2.5/weather**', async (route: Route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q');
    const cityName = q || 'London';
    const override = CITY_OVERRIDES[cityName];
    const body = override
      ? makeWeatherFixture(cityName, override.country ?? 'GB', override.temp, override.feels_like)
      : makeWeatherFixture(cityName);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
};
