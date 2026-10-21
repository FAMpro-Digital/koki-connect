import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'rapports', open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4173', serviceWorkers: 'allow' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: { command: 'node tests/e2e/serveur.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, cwd: '../..' },
});
