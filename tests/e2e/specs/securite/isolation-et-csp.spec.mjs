import { test, expect } from '../../helpers/isolation.mjs';

test.describe('Isolation et en-têtes de sécurité', () => {
  test('aucune violation de la politique CSP de vercel.json au chargement et en navigant', async ({ page }) => {
    // Politique appliquée = échec. Politique « Report-Only » (migration en cours) = simple constat joint au rapport.
    const violations = [];
    const constats = [];
    page.on('console', (m) => {
      if (!/content security policy/i.test(m.text())) return;
      (/report.?only/i.test(m.text()) ? constats : violations).push(m.text());
    });
    await page.goto('/index.html');
    for (const nom of ['transport', 'boutique', 'accueil']) {
      await page.locator('nav[aria-label="Navigation principale"] button[data-nav="' + nom + '"]').click();
    }
    for (const c of new Set(constats)) test.info().annotations.push({ type: 'CSP report-only', description: c.slice(0, 300) });
    expect(violations).toEqual([]);
  });

  test('la page est servie avec les en-têtes de sécurité attendus', async ({ page }) => {
    const reponse = await page.goto('/index.html');
    const h = reponse.headers();
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['strict-transport-security']).toBeTruthy();
    expect(h['content-security-policy']).toContain("object-src 'none'");
  });

  test('toute la configuration Supabase de la page vise l’hôte fictif', async ({ page }) => {
    const config = await (await page.request.get('/assets/portail/backend.json')).json();
    expect(config.url).toBe('https://kokifictif000000000000.supabase.co');
    expect(config.publishableKey).toMatch(/^sb_publishable_/);
  });
});
