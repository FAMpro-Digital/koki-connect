const test=require('node:test'),assert=require('node:assert/strict');
const U=n=>`${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const PRO=U(1),SHOP=U(2),RIZ=U(3),SUCRE=U(4),SERVICE=U(5),ORPHAN=U(6),PENDING=U(7),SHOP2=U(8),HIDDEN=U(9);
const OLD_PHOTO='55555555-5555-4555-8555-555555555555/'+U('a')+'.jpg',NEW_PHOTO=U('b')+'/'+U('c')+'.webp';
function rows(){return [
 {id:PRO,kind:'professionnels',statut:'Actif',nom:'Épicerie Diop',categorie:'Alimentation',type:'Les deux',telephone:'+221771234567',whatsapp:'+221781234567',village:'Coki',horaires:'Lundi–samedi',owner_id:'SECRET-OWNER',moderation:{note:'secret'},modification:{nom:'Nom non validé'},merchant_submission:true,email:'prive@example.test',localisation:{latitude:15.5,longitude:-15.99}},
 {id:SHOP,kind:'boutiques',statut:'Actif',parent_id:PRO,nom:'Boutique du marché',village:'Ouarak',whatsapp:'+221761234567',photos:[OLD_PHOTO]},
 {id:RIZ,kind:'produits',statut:'Disponible',parent_id:SHOP,nom:'Riz parfumé 5 kg',categorie:'Alimentation',prix:4500,ancien_prix:5000,stock:8,photos:[NEW_PHOTO,'https://evil.test/x.jpg','../../etc/passwd'],image_path:NEW_PHOTO,client_id:'SECRET-CLIENT'},
 {id:SUCRE,kind:'produits',statut:'Épuisé',parent_id:SHOP,nom:'Sucre 1 kg',categorie:'Alimentation',prix:800,ancien_prix:700,stock:0},
 {id:SERVICE,kind:'services',statut:'Disponible',parent_id:PRO,nom:'Livraison à domicile',categorie:'Transport et livraison',tarif:'devis',zone:'Koki et environs'},
 {id:ORPHAN,kind:'produits',statut:'Disponible',parent_id:U('f'),nom:'Produit orphelin',prix:100,stock:1},
 {id:SHOP2,kind:'boutiques',statut:'À valider',parent_id:PRO,nom:'Boutique non validée'},
 {id:HIDDEN,kind:'produits',statut:'Disponible',parent_id:SHOP2,nom:'Produit de boutique non validée',prix:100,stock:3},
 {id:PENDING,kind:'professionnels',statut:'En attente',nom:'Fiche en attente',telephone:'+221770000000'}
];}
const load=async()=>{const S=await import('../assets/business/catalogue-state.mjs');return {S,idx:S.indexCatalogue(rows())};};

test('publication : seules les fiches publiables et leur chaîne approuvée sont gardées',async()=>{
 const {idx}=await load();const ids=idx.liste.map(x=>x.id).sort();
 assert.deepEqual(ids,[PRO,SHOP,RIZ,SUCRE,SERVICE].sort());
 for(const id of [ORPHAN,SHOP2,HIDDEN,PENDING])assert.equal(idx.get(id),null,id);
});
test('confidentialité : aucun champ privé ni modification non validée, chemins photo contrôlés',async()=>{
 const {idx}=await load();const text=JSON.stringify(idx.liste);
 for(const s of ['SECRET-OWNER','SECRET-CLIENT','secret','Nom non validé','prive@example.test','merchant_submission','owner_id','client_id','evil.test','passwd'])assert.ok(!text.includes(s),s);
 assert.deepEqual(idx.get(RIZ).photos,[NEW_PHOTO]);assert.deepEqual(idx.get(SHOP).photos,[OLD_PHOTO],'ancienne photo (dossier du compte) conservée');
 assert.equal(idx.get(SUCRE).ancien_prix,undefined,'ancien prix incohérent ignoré');
 const bad=(await import('../assets/business/catalogue-state.mjs')).indexCatalogue([{id:PRO,kind:'professionnels',statut:'Actif',nom:'X',telephone:'12',localisation:{latitude:200,longitude:0}}]);
 assert.equal(bad.get(PRO).telephone,undefined);assert.equal(bad.get(PRO).localisation,undefined);
});
test('recherche : nom, métier, catégorie et village, sans accents ni majuscules',async()=>{
 const {S,idx}=await load();const names=o=>S.filtrer(idx,o).map(x=>x.nom);
 assert.deepEqual(names({kind:'produits',query:'riz'}),['Riz parfumé 5 kg']);
 assert.deepEqual(names({kind:'professionnels',query:'EPICERIE'}),['Épicerie Diop']);
 assert.deepEqual(names({kind:'produits',query:'ouarak'}),['Riz parfumé 5 kg','Sucre 1 kg'],'village de la boutique');
 assert.deepEqual(names({kind:'services',query:'livraison koki'}),['Livraison à domicile']);
 assert.deepEqual(names({kind:'produits',query:'diop'}),['Riz parfumé 5 kg','Sucre 1 kg'],'nom du commerce');
 assert.deepEqual(names({kind:'produits',query:'introuvable'}),[]);
});
test('filtres : catégorie, village, disponibles, tri par prix, compteurs',async()=>{
 const {S,idx}=await load();const names=o=>S.filtrer(idx,o).map(x=>x.nom);
 assert.deepEqual(names({kind:'produits',disponibles:true}),['Riz parfumé 5 kg']);
 assert.deepEqual(names({kind:'produits',tri:'prix'}),['Sucre 1 kg','Riz parfumé 5 kg']);
 assert.deepEqual(names({kind:'produits',tri:'prix-desc'}),['Riz parfumé 5 kg','Sucre 1 kg']);
 assert.deepEqual(names({kind:'professionnels',village:'Coki'}),['Épicerie Diop']);assert.deepEqual(names({kind:'boutiques',village:'Coki'}),[]);
 assert.deepEqual(S.categories(idx,'produits'),['Alimentation']);assert.deepEqual(S.villages(idx,'produits'),['Ouarak']);
 assert.deepEqual(S.compter(idx,{query:''}),{professionnels:1,boutiques:1,produits:2,services:1});
});
test('contacts : appel et WhatsApp vérifiés, WhatsApp de la boutique en priorité',async()=>{
 const {S,idx}=await load();const c=S.contacts(idx.get(RIZ),idx);
 assert.equal(c.appel,'tel:+221771234567');assert.equal(c.whatsapp,'https://wa.me/221761234567');assert.equal(c.vendeur,'Épicerie Diop');assert.equal(c.boutique,'Boutique du marché');
 assert.equal(S.contacts(idx.get(SERVICE),idx).whatsapp,'https://wa.me/221781234567','sans boutique : WhatsApp de la fiche');
 const sansWa=S.indexCatalogue([{id:PRO,kind:'professionnels',statut:'Actif',nom:'X',telephone:'77 123 45 67'}]);assert.equal(S.contacts(sansWa.get(PRO),sansWa).whatsapp,'https://wa.me/221771234567','repli sur le téléphone normalisé');
});
test('commande WhatsApp : produit, prix et quantité préremplis ; épuisé = pas de commande',async()=>{
 const {S,idx}=await load();const url=S.lienCommande(idx.get(RIZ),idx,3);
 assert.ok(url.startsWith('https://wa.me/221761234567?text='));const msg=decodeURIComponent(url.split('?text=')[1]);
 assert.ok(msg.startsWith('Bonjour Boutique du marché'));assert.ok(msg.includes('Riz parfumé 5 kg × 3'));assert.ok(msg.includes('4 500 FCFA'));
 assert.ok(decodeURIComponent(S.lienCommande(idx.get(RIZ),idx,99).split('?text=')[1]).includes('× 8'),'quantité limitée au stock');
 assert.equal(S.lienCommande(idx.get(SUCRE),idx),null);assert.equal(S.disponible(idx.get(SUCRE)),false);assert.equal(S.etiquetteDisponibilite(idx.get(SUCRE)),'Épuisé');
 assert.ok(decodeURIComponent(S.lienDevis(idx.get(SERVICE),idx)).includes('devis via Koki Connect pour : Livraison à domicile'));
 assert.equal(S.promotion(idx.get(RIZ)),10);assert.match(S.lienCarte(idx.get(SERVICE),idx),/^https:\/\/www\.openstreetmap\.org\/\?mlat=15\.5&mlon=-15\.99/);
});
test('fiches liées : boutique → produits, commerce → boutiques et services',async()=>{
 const {idx}=await load();assert.deepEqual(idx.enfants(SHOP,'produits').map(x=>x.id).sort(),[RIZ,SUCRE].sort());
 assert.deepEqual(idx.enfants(PRO,'boutiques').map(x=>x.id),[SHOP]);assert.equal(idx.vendeur(idx.get(RIZ)).id,PRO);assert.equal(idx.boutique(idx.get(RIZ)).id,SHOP);
});
test('interface : retour, onglets, liens externes sûrs, panier et demandes internes conservés',()=>{
 const fs=require('node:fs');const ui=fs.readFileSync('assets/business/catalogue.mjs','utf8'),rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
 for(const label of ['Commerces','Boutiques','Produits','Services'])assert.ok(fs.readFileSync('assets/business/catalogue-state.mjs','utf8').includes(`label:'${label}'`));
 assert.match(ui,/a\.rel='noopener noreferrer'/);assert.match(ui,/history\.pushState/);assert.match(ui,/'← Retour'/);assert.match(fs.readFileSync('index.html','utf8'),/id="vue-commerce"[^>]*>\s*<button type="button" onclick="fermerOpportunites\(\)">← Retour à l’accueil/);
 assert.doesNotMatch(ui,/innerHTML/,'aucun HTML injecté depuis les données');
 assert.match(rt,/async function addToCart\(/);assert.match(rt,/async function requestService\(/);assert.match(rt,/api\.order\(/,'commande interne conservée');
});
