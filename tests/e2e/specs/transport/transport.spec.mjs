import { test, expect } from '../../helpers/isolation.mjs';

test.describe('Transport (visiteur non connecté)', () => {
  test('la rubrique s’ouvre depuis l’accueil et depuis la barre de navigation', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('button.raccourci[data-recherche="Transport"]').click();
    await expect(page.locator('#vue-transport')).toBeVisible();
  });

  test('aucune demande de course n’est envoyée sans compte', async ({ page, journal }) => {
    await page.goto('/index.html');
    await page.locator('nav[aria-label="Navigation principale"] button[data-nav="transport"]').click();
    await expect(page.locator('#vue-transport')).toBeVisible();
    // Aucune écriture ne doit partir : ni devis, ni réservation.
    expect(journal.commandes.filter((c) => ['quote', 'reserve_ride', 'transition'].includes(c))).toEqual([]);
  });
});
