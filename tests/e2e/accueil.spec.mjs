import { test, expect } from '@playwright/test';

// Aucune requête ne part vers Supabase (production ou autre), la météo ou les tuiles de carte pendant les tests.
test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
});

async function ouvrir(page) {
  const erreurs = [];
  const violations = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__violations.push({ d: e.effectiveDirective, disposition: e.disposition, blocked: e.blockedURI }));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  return { erreurs, violations, lire: () => page.evaluate(() => window.__violations) };
}

test('accueil : s\'affiche, date du jour, aucune erreur de script', async ({ page }) => {
  const { erreurs } = await ouvrir(page);
  await expect(page.locator('#date-entete')).not.toBeEmpty();
  expect(erreurs).toEqual([]);
});

test('CSP stricte (Report-Only) : aucun script ni gestionnaire inline à l\'ouverture', async ({ page }) => {
  const { lire } = await ouvrir(page);
  const scripts = (await lire()).filter((v) => /^script-src/.test(v.d));
  expect(scripts).toEqual([]);
});

test('boutons de l\'accueil : Transport s\'ouvre, sans erreur', async ({ page }) => {
  const { erreurs, lire } = await ouvrir(page);
  await page.locator('[data-clic="afficherTransport()"]').first().click();
  await expect(page.locator('#vue-transport')).toBeVisible();
  expect(erreurs).toEqual([]);
  expect((await lire()).filter((v) => /^script-src/.test(v.d))).toEqual([]);
});

test('performance : Leaflet absent au démarrage, image d\'accueil légère, aucun script bloquant', async ({ page }) => {
  const urls = [];
  page.on('response', async (r) => { if (r.url().startsWith('http://127.0.0.1')) urls.push({ url: r.url(), taille: Number(r.headers()['content-length'] || 0) }); });
  await ouvrir(page);
  expect(urls.some((u) => /leaflet\.(js|css)/.test(u.url))).toBe(false);
  expect(urls.some((u) => /fampro-digital\.png/.test(u.url))).toBe(false);
  const total = urls.reduce((s, u) => s + u.taille, 0);
  expect(total).toBeLessThan(1_000_000);
  const bloquants = await page.evaluate(() => [...document.querySelectorAll('script[src]:not([defer]):not([async]):not([type=module])')].map((s) => s.getAttribute('src')));
  expect(bloquants).toEqual(['assets/leaflet/chargeur.js']);
});

test('hors ligne : l\'application se rouvre grâce au service worker', async ({ page, context }) => {
  await ouvrir(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await caches.keys()).some((k) => k.startsWith('koki-shell-')) && (await (await caches.open((await caches.keys()).find((k) => k.startsWith('koki-shell-')))).keys()).length > 10);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#date-entete')).not.toBeEmpty();
  expect(await page.evaluate(() => typeof window.KokiPortail)).toBe('object');
});
