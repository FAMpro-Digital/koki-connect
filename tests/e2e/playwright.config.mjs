// Tests Playwright locaux (une seule configuration, utilisée par `npm run test:e2e` et par le workflow Qualité).
// Le site statique est servi sur 127.0.0.1 par serve-static.mjs : backend.json et la CSP y visent un hôte Supabase FICTIF,
// jamais la production. Tout accès distant est bloqué et Supabase est simulé par helpers/isolation.mjs.
// Aucun test de charge : une seule session de navigateur par test.
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.KOKI_E2E_PORT || 4173);

export default defineConfig({
  testDir: '.',
  testMatch: ['*.spec.mjs', 'specs/**/*.spec.mjs'],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:' + PORT,
    serviceWorkers: 'block', // pas de copie hors ligne qui masquerait une régression (accueil.spec l'autorise pour son test hors ligne)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'fr-SN',
    timezoneId: 'Africa/Dakar',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node serve-static.mjs',
    url: 'http://127.0.0.1:' + PORT + '/index.html',
    reuseExistingServer: false,
    timeout: 20_000,
    env: { KOKI_E2E_PORT: String(PORT) },
  },
});
