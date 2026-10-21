import { test, expect } from '../../helpers/isolation.mjs';

test.describe('Visiteur non connecté', () => {
  test('consulte les contenus publics sans session ni connexion', async ({ page, journal }) => {
    await page.goto('/index.html');
    await expect(page.locator('#vue-portail')).toBeVisible();
    for (const nom of ['transport', 'boutique', 'accueil']) {
      await page.locator('nav[aria-label="Navigation principale"] button[data-nav="' + nom + '"]').click();
    }
    const cles = await page.evaluate(() => Object.keys(localStorage));
    expect(cles.filter((c) => /auth-token/.test(c))).toEqual([]);
    expect(journal.authentifications).toBe(0);
  });
});
