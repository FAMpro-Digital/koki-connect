import {test,expect} from '../helpers/isolation.mjs';
test('Profil reste accessible avec une ancienne copie du module professionnel',async({page})=>{
 await page.route('**/assets/business/pro-space.mjs',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('export function logoCompte','function logoCompte')});});
 await page.goto('/index.html');await page.locator('nav[aria-label="Navigation principale"] button[data-nav="profil"]').click();
 await expect(page.locator('#profil-compte')).toBeVisible();await expect(page.getByText('Espace connecté momentanément indisponible. Rechargez la page.')).toHaveCount(0);
});
test('Profil attend la fin du chargement du module connecté',async({page})=>{
 await page.goto('/index.html');await page.evaluate(()=>{window.savedPro=window.KokiPro;window.KokiPro=undefined;setTimeout(()=>{window.KokiPro=window.savedPro;},0);});
 await page.locator('nav[aria-label="Navigation principale"] button[data-nav="profil"]').click();await expect(page.locator('#profil-compte')).toBeVisible();
});
