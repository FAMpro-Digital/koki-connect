import { test, expect } from './helpers/isolation.mjs';

// Boutons Retour, navigation principale et retour du focus. Isolation : helpers/isolation.mjs (Supabase simulé, rien de distant).

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__violations.push({ d: e.effectiveDirective, disposition: e.disposition }));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  return { erreurs, scripts: async () => (await page.evaluate(() => window.__violations)).filter((v) => /^script-src/.test(v.d)) };
}

// Les pages plein écran et la manière de les ouvrir (fonctions déclenchées par les data-clic de l'application).
const PAGES = [
  ['vue-transport', 'afficherTransport()'],
  ['vue-commerce', 'afficherCommerce()'],
  ['vue-menu', 'afficherMenu()'],
  ['vue-portail', 'afficherOpportunites()'],
  ['vue-notifications', 'afficherNotifications()'],
];
const ouvrirPage = (page, appel) => page.evaluate((a) => new Function(a)(), appel);
const RETOURS_SECTION = '.section > button[data-clic="fermerOpportunites()"]';

test('navigation : Accueil → Transport → Boutique → Accueil, sans erreur ni violation CSP', async ({ page }) => {
  const { erreurs, scripts } = await ouvrir(page);
  const nav = (n) => page.locator(`nav[aria-label="Navigation principale"] button[data-nav="${n}"]`);
  await nav('transport').click();
  await expect(page.locator('#vue-transport')).toBeVisible();
  await expect(nav('transport')).toHaveAttribute('aria-current', 'page');
  await nav('boutique').click();
  await expect(page.locator('#vue-commerce')).toBeVisible();
  await expect(page.locator('#vue-transport')).toBeHidden();
  await expect(nav('boutique')).toHaveAttribute('aria-current', 'page');
  await nav('accueil').click();
  await expect(page.locator('#vue-commerce')).toBeHidden();
  await expect(page.locator('#tableau-de-bord')).toBeVisible();
  await expect(nav('accueil')).toHaveAttribute('aria-current', 'page');
  expect(erreurs).toEqual([]);
  expect(await scripts()).toEqual([]);
});

for (const [id, appel] of PAGES) {
  test(`boutons Retour (${id}) : aucun doublon avec la barre du haut ; barre du haut et navigation du bas restent utilisables`, async ({ page }) => {
    const { erreurs } = await ouvrir(page);
    await ouvrirPage(page, appel);
    await expect(page.locator('#' + id)).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/page-pleine/);
    // Plus aucun bouton « Retour à l'accueil » affiché en doublon directement dans la page.
    await expect(page.locator(RETOURS_SECTION).filter({ visible: true })).toHaveCount(0);
    // La barre du haut et la barre du bas, elles, restent affichées.
    await expect(page.locator('.barre-page .barre-retour')).toBeVisible();
    await expect(page.locator('nav[aria-label="Navigation principale"] button[data-nav="accueil"]')).toBeVisible();
    expect(erreurs).toEqual([]);
  });
}

test('boutons Retour : hors page plein écran (accueil), la règle ne cache rien de la navigation', async ({ page }) => {
  await ouvrir(page);
  await expect(page.locator('body')).not.toHaveClass(/page-pleine/);
  await expect(page.locator('nav[aria-label="Navigation principale"] button[data-nav]')).toHaveCount(5);
});

for (const [id, appel] of PAGES) {
  test(`focus clavier (${id}) : après « Accueil » au clavier, le focus revient sur le raccourci Emplois & Opportunités`, async ({ page }) => {
    const { erreurs } = await ouvrir(page);
    await ouvrirPage(page, appel);
    const accueil = page.locator('nav[aria-label="Navigation principale"] button[data-nav="accueil"]');
    await accueil.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#' + id)).toBeHidden();
    const raccourci = page.locator('.raccourci[data-recherche="Emplois & Opportunités"]');
    await expect(raccourci).toBeVisible();
    await expect(raccourci).toBeFocused();
    // Défilement : la navigation de l'application restaure la position de l'étape (comportement existant) ; le focus ne doit
    // provoquer aucun saut supplémentaire (focus sans défilement), la position reste donc stable.
    const avant = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(avant);
    expect(erreurs).toEqual([]);
  });
}

test('focus clavier : jamais sur un élément masqué, aucune exception si le raccourci est masqué ou absent', async ({ page }) => {
  const { erreurs } = await ouvrir(page);
  await page.evaluate(() => { document.querySelector('.raccourci[data-recherche="Emplois & Opportunités"]').hidden = true; });
  await ouvrirPage(page, 'afficherTransport()');
  await page.evaluate(() => fermerOpportunites());
  expect(await page.evaluate(() => { const a = document.activeElement; return !a || a === document.body || !a.closest('[hidden]'); })).toBe(true);
  await page.evaluate(() => { document.querySelector('.raccourci[data-recherche="Emplois & Opportunités"]').remove(); });
  await ouvrirPage(page, 'afficherMenu()');
  await page.evaluate(() => fermerOpportunites());
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(erreurs).toEqual([]);
});
