import {test,expect} from '../helpers/isolation.mjs';
test('inscription professionnelle : e-mail et mot de passe seulement',async({page})=>{
 await page.goto('/index.html');await page.evaluate(async()=>{const {accountPanel}=await import('/assets/business/ui.mjs');const host=document.createElement('section');host.id='registration-test';document.body.append(host);accountPanel(host,{enabled:true,identity:async()=>{throw Error('Non connecté');},signup:async(email,password,options)=>{window.registrationSent={email,options};}},async()=>{},{intention:()=> 'Chauffeur',retour:()=>location.href});});
 const host=page.locator('#registration-test');await host.getByRole('button',{name:'Créer mon compte professionnel',exact:true}).click();
 await expect(host.getByLabel('Nom du chauffeur')).toHaveCount(0);await expect(host.getByLabel('Numéro de téléphone')).toHaveCount(0);
 await host.getByLabel('Adresse e-mail',{exact:true}).fill('chauffeur@example.invalid');await host.getByLabel('Mot de passe (8 caractères minimum)',{exact:true}).fill('abcdefgh');await host.getByLabel('Confirmer le mot de passe',{exact:true}).fill('abcdefgh');
 await host.getByRole('button',{name:'Créer mon compte professionnel',exact:true}).click();
 await expect(host.getByText(/Compte créé/)).toBeVisible();const data=await page.evaluate(()=>window.registrationSent);expect(data.email).toBe('chauffeur@example.invalid');expect(data.options.registration).toBeUndefined();
});
