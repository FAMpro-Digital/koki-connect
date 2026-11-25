import { test, expect } from '../helpers/isolation.mjs';

// Repères d'accessibilité ajoutés par la modernisation : lien d'évitement, zone <main>, boutons typés,
// pictogrammes décoratifs masqués des lecteurs d'écran et bouton Pause du bandeau « À la une ».
test.describe('Accessibilité de l’accueil', () => {
  test('le lien d’évitement apparaît au clavier et mène au contenu principal', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'navigation clavier testée sur bureau');
    await page.goto('/index.html');
    await page.keyboard.press('Tab');
    const lien = page.getByRole('link', { name: 'Aller au contenu principal' });
    await expect(lien).toBeFocused();
    await expect(lien).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenu')).toBeFocused();
  });

  test('une seule zone principale contient toutes les vues et la navigation reste dehors', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByRole('main')).toHaveCount(1);
    expect(await page.locator('body > .section').count()).toBe(0);
    await expect(page.locator('main#contenu > .section')).not.toHaveCount(0);
    await expect(page.locator('main nav[aria-label="Navigation principale"]')).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await nav.getByRole('button', { name: 'Transport' }).click();
    await expect(page.locator('#vue-transport')).toBeVisible();
    await nav.getByRole('button', { name: 'Accueil' }).click();
    await expect(page.locator('#vue-transport')).toBeHidden();
  });

  test('boutons typés et pictogrammes de la barre ignorés par les lecteurs d’écran', async ({ page }) => {
    await page.goto('/index.html');
    expect(await page.locator('#accueil-utiles button:not([type])').count()).toBe(0);
    expect(await page.locator('nav[aria-label="Navigation principale"] button > span').count()).toBeGreaterThan(0);
    expect(await page.locator('nav[aria-label="Navigation principale"] button > span:not([aria-hidden="true"])').count()).toBe(0);
  });

  test('le bandeau « À la une » propose un bouton Pause mémorisé', async ({ page }) => {
    // Deux cartes fictives suffisent à activer le défilement automatique.
    const remplir = () => page.evaluate(() => {
      document.getElementById('accueil-une').classList.remove('une-vide');
      const une = document.getElementById('portail-une');
      une.replaceChildren(...['Une A', 'Une B'].map((t) => { const d = document.createElement('article'); d.className = 'portail-card'; d.textContent = t; return d; }));
      document.dispatchEvent(new Event('koki-une'));
    });
    await page.goto('/index.html');
    await remplir();
    const bouton = page.locator('.une-pause');
    await expect(bouton).toHaveText(/Mettre en pause/);
    await bouton.click();
    await expect(bouton).toHaveText(/Relancer/);
    await page.reload();
    await remplir();
    await expect(page.locator('.une-pause')).toHaveText(/Relancer/);
  });
});
