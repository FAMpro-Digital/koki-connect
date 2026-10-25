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

test('GPS autorisé utilisé comme départ du trajet', async ({page}) => {
 await page.addInitScript(()=>{
  localStorage.setItem('koki.notifications.remind-after',String(Date.now()+86400000));
  navigator.geolocation.getCurrentPosition=(ok)=>ok({coords:{latitude:15.925,longitude:-15.879,accuracy:12}});
 });
 await page.goto('/index.html');
 await page.locator('nav[aria-label="Navigation principale"] button[data-nav="transport"]').click();
 await expect.poll(()=>page.evaluate(()=>window.KokiTransport.connectedTrip().depart)).toEqual({nom:'Ma position actuelle',latitude:15.925,longitude:-15.879});
 await expect(page.locator('#transport-message')).toContainText('12 m');
});

test('refus GPS laisse le choix manuel du départ disponible', async ({page}) => {
 await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=(ok,fail)=>fail({code:1});});
 await page.goto('/index.html');
 await page.locator('nav[aria-label="Navigation principale"] button[data-nav="transport"]').click();
 await expect(page.locator('#transport-message')).toContainText('Localisation refusée');
 await expect(page.locator('#transport-depart')).toBeEnabled();
 expect(await page.evaluate(()=>window.KokiTransport.connectedTrip().depart)).toBeNull();
});

test('une réponse GPS tardive préserve le départ choisi', async ({page}) => {
 await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=ok=>{window.finishGPS=ok;};});
 await page.goto('/index.html');
 await page.locator('nav[aria-label="Navigation principale"] button[data-nav="transport"]').click();
 await expect.poll(()=>page.evaluate(()=>typeof window.finishGPS)).toBe('function');
 const value=await page.locator('#transport-depart option').evaluateAll(xs=>xs.find(x=>x.value&&x.value!=='personnalise').value);
 await page.locator('#transport-depart').selectOption(value);
 const chosen=await page.evaluate(()=>window.KokiTransport.connectedTrip().depart);
 await page.evaluate(()=>window.finishGPS({coords:{latitude:15.925,longitude:-15.879,accuracy:12}}));
 expect(await page.evaluate(()=>window.KokiTransport.connectedTrip().depart)).toEqual(chosen);
});
