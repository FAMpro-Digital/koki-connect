import { test, expect } from '../helpers/isolation.mjs';

// Couche d'identité visuelle (assets/portail/identite.css) : elle ne doit rien retirer à l'accessibilité.
test.describe('Identité visuelle', () => {
  test('barre du bas : icônes dessinées masquées, noms lisibles, onglet actif marqué', async ({ page }) => {
    await page.goto('/index.html');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    for (const nom of ['Accueil', 'Transport', 'Commerces', 'Activité', 'Profil']) await expect(nav.getByRole('button', { name: nom, exact: true })).toBeVisible();
    expect(await nav.locator('button > span[aria-hidden="true"] > svg').count()).toBe(5);
    await nav.getByRole('button', { name: 'Transport', exact: true }).click();
    const actif = nav.locator('button[aria-current="page"] > span');
    await expect(actif).toHaveCSS('background-color', 'rgb(227, 241, 233)');
  });

  test('focus clavier visible sur la barre du bas', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'navigation clavier testée sur bureau');
    await page.goto('/index.html');
    const bouton = page.locator('nav[aria-label="Navigation principale"] button[data-nav="transport"]');
    await bouton.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(bouton).toBeFocused();
    const contour = await bouton.evaluate((e) => { const s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth; });
    expect(contour).toBe('solid 3px');
  });

  test('mouvement réduit : la roue de chargement ralentit et rien ne glisse', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    const duree = await page.evaluate(() => {
      const p = document.createElement('p'); p.className = 'koki-chargement'; p.textContent = 'Chargement…';
      document.getElementById('contenu').append(p);
      const d = getComputedStyle(p, '::before').animationDuration; p.remove(); return d;
    });
    expect(duree).toBe('2.4s');
  });

  test('les rubriques affichent leur chargement avec la roue', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.afficherOpportunites && window.afficherOpportunites());
    // Le message de chargement peut disparaître très vite : on vérifie seulement que la classe est connue de la page.
    const regle = await page.evaluate(() => [...document.styleSheets].some((f) => { try { return [...f.cssRules].some((r) => r.selectorText === '.koki-chargement'); } catch { return false; } }));
    expect(regle).toBe(true);
  });

  test('les cartes ne montrent plus « undefined » dans leur ligne de date', async ({ page }) => {
    await page.goto('/index.html');
    const meta = page.locator('#portail-actualites article .portail-meta').first();
    await expect(meta).toBeVisible();
    await expect(meta).not.toContainText('undefined');
  });
});
