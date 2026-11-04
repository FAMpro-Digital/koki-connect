import {test,expect} from '../helpers/isolation.mjs';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('koki.notifications.remind-after',String(Date.now()+86400000)));
 await page.goto('/index.html');
 await page.waitForFunction(()=>typeof window.KokiSocialAPI==='function');
 await page.evaluate(()=>{
  let liked=false,comments=[];
  window.KokiSocialAPI=async p=>{
   if(p.p_action==='like')liked=p.p_liked;
   if(p.p_action==='comment')comments.unshift({id:'test-comment',body:p.p_text,mine:true,created_at:new Date().toISOString()});
   if(p.p_action==='delete')comments=comments.filter(c=>c.id!==p.p_comment);
   return {liked,likes:liked?1:0,total:comments.length,comments};
  };
 });
});
test('accueil, J’aime, commentaire sûr, suppression et retour',async({page})=>{
 const card=page.locator('#portail-actualites article').first();
 await expect(card.getByRole('button',{name:'♡ J’aime',exact:true})).toBeVisible();
 await card.getByRole('button',{name:'♡ J’aime',exact:true}).click();
 await expect(card.getByRole('button',{name:'♥ J’aime · 1',exact:true})).toHaveAttribute('aria-pressed','true');
 await card.getByRole('button',{name:'💬 Commenter',exact:true}).click();
 const section=page.locator('.publication-comments');
 await expect(section).toBeVisible();
 await section.getByLabel('Votre commentaire').fill('<img src=x onerror=alert(1)> Mon avis');
 await section.getByRole('button',{name:'Publier',exact:true}).click();
 await expect(section.getByText('<img src=x onerror=alert(1)> Mon avis',{exact:true})).toBeVisible();
 await expect(section.locator('img')).toHaveCount(0);
 await section.getByRole('button',{name:'Supprimer mon commentaire'}).click();
 await expect(section.getByText('Aucun commentaire pour le moment.')).toBeVisible();
 await page.getByRole('button',{name:'← Retour à l’accueil',exact:true}).click();
 await expect(page.locator('#vue-portail')).toBeHidden();
 await expect(card).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('information complète et photo en grand fermable',async({page})=>{
 await page.evaluate(()=>window.KokiPortail.detail({id:'33333333-3333-4333-8333-333333333333',titre:'Article photo',type:'Actualités',categorie:'Vie locale',resume:'Résumé court',texte:'Première partie\nDeuxième partie complète',publication:'2026-10-01T12:00:00Z',image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}));
 await expect(page.getByText('Première partie\nDeuxième partie complète',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Agrandir la photo de Article photo'}).click();
 await expect(page.getByRole('dialog',{name:'Photo en grand'})).toBeVisible();
 await page.getByRole('button',{name:'Fermer la photo'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('visiteur invité à se connecter pour participer',async({page})=>{
 await page.evaluate(()=>{window.KokiSocialAPI=async p=>{if(p.p_action){const e=Error('Connectez-vous pour aimer ou commenter.');e.code='LOGIN';throw e;}return {liked:false,likes:0,total:0,comments:[]};};});
 const card=page.locator('#portail-actualites article').first();
 await card.getByRole('button',{name:'♡ J’aime',exact:true}).click();
 await expect(card.getByRole('button',{name:'Me connecter',exact:true})).toBeVisible();
 await expect(card.getByRole('button',{name:'♡ J’aime',exact:true})).toHaveAttribute('aria-pressed','false');
});
test('texte chargé à la demande et retour possible après échec',async({page})=>{
 await page.evaluate(async()=>{window.KokiPublicFeed.detail=async id=>({id,texte:'Texte complet demandé au serveur'});await window.KokiPortail.detail({id:'33333333-3333-4333-8333-333333333333',titre:'Article léger',type:'Actualités',categorie:'Vie locale',resume:'Résumé',publication:'2026-10-01T12:00:00Z',detail_required:true});});
 await expect(page.getByText('Texte complet demandé au serveur',{exact:true})).toBeVisible();
 await page.evaluate(async()=>{window.KokiPublicFeed.detail=async()=>{throw Error('Réseau');};await window.KokiPortail.detail({id:'33333333-3333-4333-8333-333333333333',titre:'Article léger',detail_required:true});});
 await expect(page.getByText('Impossible de charger le texte complet. Vérifiez votre connexion.')).toBeVisible();
 await page.getByRole('button',{name:'Retour à l’accueil',exact:true}).click();await expect(page.locator('#vue-portail')).toBeHidden();
});

test('le résumé ouvre toute l’information et Accueil ne crée pas de flash coloré',async({page})=>{
 const card=page.locator('#portail-actualites article').first();
 await page.evaluate(async()=>{
  window.KokiPublicFeed.detail=async id=>({id,texte:'La suite complète de cette information.'});
  window.KokiPublicFeed.charger=async()=>({version:1,contenus:[{id:'33333333-3333-4333-8333-333333333333',titre:'Information complète',resume:'Contenu fictif pour les tests automatiques.',statut:'publié',type:'Actualités',categorie:'Vie locale',publication:'2026-10-01T08:00:00Z',detail_required:true}]});
  await window.KokiPortail.actualiser();
 });
 await card.getByText('Contenu fictif pour les tests automatiques.',{exact:true}).click();
 await expect(page.locator('.publication-detail')).toBeVisible();
 await expect(page.getByText('La suite complète de cette information.',{exact:true})).toBeVisible();
 const accueil=page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name:/Accueil/});
 await accueil.dispatchEvent('pointerdown',{button:0});
 await expect(page.locator('.koki-touche')).toHaveCount(0);
 await accueil.click();
 await expect(page.locator('#vue-portail')).toBeHidden();
});
test('les photos de publication et de produit restent entières',async({page})=>{
 await page.evaluate(()=>{
  const image=document.createElement('img');image.id='test-photo-portrait';image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="red"/></svg>');
  const carte=document.querySelector('#portail-actualites article');carte.prepend(image);
  const produit=document.createElement('div');produit.className='cat-media';produit.append(image.cloneNode());document.querySelector('#vue-commerce').append(produit);
 });
 await expect(page.locator('#portail-actualites #test-photo-portrait')).toHaveCSS('object-fit','contain');
 await expect(page.locator('#portail-actualites #test-photo-portrait')).toHaveCSS('aspect-ratio','auto');
 await expect(page.locator('#vue-commerce .cat-media img').last()).toHaveCSS('object-fit','contain');
});

test('aucun voile coloré au toucher ou au défilement des publications et de leurs photos',async({page})=>{
 const card=page.locator('#portail-actualites article').first();
 await expect(card).toBeVisible();
 await card.evaluate(el=>{
  const photo=document.createElement('button');photo.type='button';photo.className='publication-photo-link';photo.textContent='Photo de test';el.prepend(photo);
 });
 for(const target of [card,card.locator('p').first(),card.locator('.publication-title'),card.locator('.publication-photo-link')]){
  await target.dispatchEvent('pointerdown',{button:0,pointerType:'touch',clientX:100,clientY:200});
  await expect(page.locator('.koki-touche')).toHaveCount(0);
  await target.dispatchEvent('pointercancel',{pointerType:'touch'});
 }
 await card.locator('.publication-title').dispatchEvent('keydown',{key:'Enter'});
 await expect(page.locator('.koki-touche')).toHaveCount(0);
 await card.getByText('Contenu fictif pour les tests automatiques.',{exact:true}).click();
 await expect(page.locator('.publication-detail')).toBeVisible();
 await page.locator('.publication-detail p').first().dispatchEvent('pointerdown',{button:0,pointerType:'touch',clientX:100,clientY:200});
 await expect(page.locator('.koki-touche')).toHaveCount(0);
});
