import {test,expect} from '../helpers/isolation.mjs';
test('menu public : paramètres et retour au menu',async({page})=>{
 await page.goto('/index.html');
 await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();
 await page.getByRole('button',{name:'⚙️ Paramètres'}).click();
 await expect(page.locator('#portail-titre')).toHaveText('Paramètres');
 await expect(page.getByRole('button',{name:'Mon compte et mes données'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Politique de confidentialité'})).toHaveAttribute('href','/confidentialite.html');
 await page.getByRole('button',{name:'← Retour au menu'}).click();
 await expect(page.locator('#titre-menu')).toBeVisible();
 await page.getByRole('button',{name:'⚙️ Paramètres'}).click();
 await page.getByRole('button',{name:'Ouvrir les notifications'}).click();
 await expect(page.locator('#titre-notifications')).toBeVisible();
});
