import { test, expect } from '../../helpers/isolation.mjs';

// CSP sans 'unsafe-inline' pour les styles : aucune rubrique ne doit dépendre d'un attribut style="…"
// ni d'une balise <style>. On ouvre chaque raccourci de l'accueil, chaque onglet et le menu.
test('aucune violation CSP (styles compris) en parcourant toutes les rubriques', async ({ page }) => {
  const violations = [];
  page.on('console', (m) => { if (/content security policy/i.test(m.text()) && !/report.?only/i.test(m.text())) violations.push(m.text()); });
  const reponse = await page.goto('/index.html');
  expect(reponse.headers()['content-security-policy']).not.toContain("'unsafe-inline'");
  const accueil = () => page.locator('nav[aria-label="Navigation principale"] button[data-nav="accueil"]').click();
  const tuiles = await page.locator('button.raccourci').evaluateAll((els) => els.map((e) => e.dataset.recherche));
  expect(tuiles.length).toBe(8);
  for (const nom of tuiles) {
    await accueil();
    await page.locator('button.raccourci[data-recherche="' + nom + '"]').click();
    await page.waitForTimeout(300);
  }
  for (const nom of ['transport', 'boutique', 'activite', 'profil', 'accueil']) {
    await page.locator('nav[aria-label="Navigation principale"] button[data-nav="' + nom + '"]').click();
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.waitForTimeout(300);
  expect(violations).toEqual([]);
});

test('les styles sortis de index.html sont bien appliqués', async ({ page }) => {
  await page.goto('/index.html');
  const fond = await page.locator('button.raccourci[data-recherche="Transport"]').evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(fond).toBe('rgb(36, 93, 136)'); // #245d88, couleur du contrat Rubriques
  const corps = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(corps).toBe('rgb(244, 247, 245)'); // #f4f7f5
  const carte = await page.locator('#carte-koki').evaluate((e) => getComputedStyle(e).height);
  expect(carte).toBe('440px');
  // Les url(…) de la feuille déplacée sont relatives à assets/portail/ : l'image d'en-tête doit se charger.
  const fondEntete = await page.locator('header.entete-koki').evaluate((e) => getComputedStyle(e).backgroundImage);
  const url = /url\("([^"]+entete-horizontal\.webp)"\)/.exec(fondEntete)?.[1];
  expect(url, fondEntete).toBeTruthy();
  expect((await page.request.get(url)).ok()).toBe(true);
});
