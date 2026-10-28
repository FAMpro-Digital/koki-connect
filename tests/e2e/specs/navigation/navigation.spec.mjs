import { test, expect } from '../../helpers/isolation.mjs';

test.describe('Navigation principale', () => {
  test('ouverture de l’application et barre de navigation', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveTitle(/Koki Connect/);
    await expect(page.locator('#tableau-de-bord')).toBeVisible();
    await expect(page.locator('#vue-portail')).toBeHidden();
    const boutons = page.locator('nav[aria-label="Navigation principale"] button[data-nav]');
    await expect(boutons).toHaveCount(5);
    await expect(boutons).toHaveText([/Accueil/, /Transport/, /Boutique/, /Activité/, /Profil/]);
  });

  test('passage Accueil → Transport → Boutique → Accueil', async ({ page }) => {
    await page.goto('/index.html');
    const nav = (nom) => page.locator('nav[aria-label="Navigation principale"] button[data-nav="' + nom + '"]');

    await nav('transport').click();
    await expect(page.locator('#vue-transport')).toBeVisible();
    await expect(page.locator('#vue-portail')).toBeHidden();

    await nav('boutique').click();
    await expect(page.locator('#vue-commerce')).toBeVisible();
    await expect(page.locator('#vue-transport')).toBeHidden();

    await nav('accueil').click();
    await expect(page.locator('#tableau-de-bord')).toBeVisible();
    await expect(page.locator('#vue-portail')).toBeHidden();
  });

  test('le flux public est demandé à l’ouverture', async ({ page, journal }) => {
    await page.goto('/index.html');
    await expect.poll(() => journal.flux, { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test('la recherche de l’accueil accepte une saisie sans erreur', async ({ page }) => {
    await page.goto('/index.html');
    const champ = page.getByRole('searchbox', { name: 'Que recherchez-vous à Koki ?' });
    await champ.fill('boutique');
    await expect(champ).toHaveValue('boutique');
  });
});
