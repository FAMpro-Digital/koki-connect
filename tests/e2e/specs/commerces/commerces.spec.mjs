import { test, expect } from '../../helpers/isolation.mjs';

test.describe('Boutique / Commerces et services (visiteur non connecté)', () => {
  test('la rubrique s’ouvre depuis la barre de navigation', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('nav[aria-label="Navigation principale"] button[data-nav="boutique"]').click();
    await expect(page.locator('#vue-commerce')).toBeVisible();
  });

  test('aucune commande n’est envoyée sans compte', async ({ page, journal }) => {
    await page.goto('/index.html');
    await page.locator('nav[aria-label="Navigation principale"] button[data-nav="boutique"]').click();
    await expect(page.locator('#vue-commerce')).toBeVisible();
    expect(journal.commandes.filter((c) => ['create_order', 'save_shop', 'save_product', 'save_service'].includes(c))).toEqual([]);
  });
});
