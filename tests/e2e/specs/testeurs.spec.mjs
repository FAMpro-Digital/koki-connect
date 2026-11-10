import {test,expect} from '../helpers/isolation.mjs';
test('retour structuré sans envoi automatique ni injection',async({page})=>{
 await page.goto('/tests-application.html');
 for(const [id,value] of Object.entries({appareil:'iPhone',navigateur:'Safari',etapes:'<img src=x onerror=alert(1)> Ouvrir boutique',attendu:'Photos visibles',observe:'Photo absente'}))await page.locator('#'+id).fill(value);
 await page.getByRole('button',{name:'Préparer mon message'}).click();
 await expect(page.locator('#message-prepare')).toBeVisible();
 await expect(page.locator('#apercu-message img')).toHaveCount(0);
 const link=await page.getByRole('link',{name:'Ouvrir WhatsApp'}).getAttribute('href');
 expect(link).toContain('https://wa.me/221772875252?text=');
 expect(decodeURIComponent(link)).toContain('Résultat observé : Photo absente');
 await expect(page.getByRole('status')).toContainText('Message préparé');
 await page.locator('#observe').fill('Autre résultat');
 await expect(page.locator('#message-prepare')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('champs composés seulement d’espaces refusés',async({page})=>{
 await page.goto('/tests-application.html');
 for(const id of ['appareil','navigateur','etapes','attendu','observe'])await page.locator('#'+id).fill('   ');
 await page.getByRole('button',{name:'Préparer mon message'}).click();
 await expect(page.locator('#message-prepare')).toBeHidden();
});
test('blocage confirmé et réversible des commentaires',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(async()=>{
  let blocked=false;
  window.KokiSocialAPI=async p=>{if(p.p_action==='block')blocked=true;if(p.p_action==='unblock_all')blocked=false;return {blocking_available:true,blocked_count:blocked?1:0,likes:0,liked:false,total:blocked?0:1,comments:blocked?[]:[{id:'comment-test',body:'Commentaire du membre',mine:false,created_at:'2026-11-09T10:00:00Z'}]};};
  const host=document.createElement('section');host.id='comments-test';document.body.append(host);await window.KokiSocial.comments({id:'content-test'},host);
 });
 page.on('dialog',dialog=>dialog.accept());
 const host=page.locator('#comments-test');
 await host.getByRole('button',{name:'Bloquer ce membre',exact:true}).click();
 await expect(host.getByText('Commentaire du membre',{exact:true})).toHaveCount(0);
 await host.getByRole('button',{name:'Réafficher les commentaires des membres bloqués'}).click();
 await expect(host.getByText('Commentaire du membre',{exact:true})).toBeVisible();
});
