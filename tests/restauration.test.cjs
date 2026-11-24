// Restaurants & Traiteurs (cahier des charges v1.0, novembre 2026) : vue du catalogue existant.
// Catalogue dans Koki Connect, commande sur WhatsApp ; aucun paiement, aucune commande enregistrée.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../assets/business/commerce-contract.js');
const etat=import('../assets/business/catalogue-state.mjs');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const rows=[
 {id:id(1),kind:'professionnels',statut:'Actif',nom:'Chez Awa',categorie:'Restaurants',telephone:'+221771234567',whatsapp:'+221771234567',village:'Koki'},
 {id:id(2),kind:'boutiques',statut:'Actif',parent_id:id(1),nom:'Restaurant Chez Awa',categorie:'Restaurants',whatsapp:'77 765 43 21',village:'Koki',horaires:'Tous les jours 8h-22h'},
 {id:id(3),kind:'produits',statut:'Disponible',parent_id:id(2),nom:'Thiéboudienne',categorie:'Déjeuner',prix:2500,stock:10},
 {id:id(4),kind:'produits',statut:'Disponible',parent_id:id(2),nom:'Bissap',categorie:'Boissons',prix:500},
 {id:id(5),kind:'produits',statut:'Épuisé',parent_id:id(2),nom:'Café Touba',categorie:'Petit-déjeuner',prix:200,stock:0},
 {id:id(6),kind:'produits',statut:'Disponible',parent_id:id(2),nom:'Plat du jour',prix:1500},
 {id:id(7),kind:'professionnels',statut:'Actif',nom:'Traiteur Fall',categorie:'Traiteurs',telephone:'+221781112233',village:'Ouarak'},
 {id:id(8),kind:'services',statut:'Disponible',parent_id:id(7),nom:'Buffet de mariage',categorie:'Mariages',tarif:'devis'},
 {id:id(9),kind:'professionnels',statut:'Actif',nom:'Quincaillerie Diop',categorie:'Boutique et quincaillerie',telephone:'+221770000001',village:'Koki'},
 {id:id(10),kind:'boutiques',statut:'Actif',parent_id:id(9),nom:'Quincaillerie Diop',categorie:'Boutique et quincaillerie'},
 {id:id(11),kind:'produits',statut:'Disponible',parent_id:id(10),nom:'Eau minérale',categorie:'Boissons',prix:300},
 {id:id(12),kind:'professionnels',statut:'Actif',nom:'Dibiterie Ndiaye',categorie:'Restauration',village:'Pallene'},
 {id:id(13),kind:'boutiques',statut:'Actif',parent_id:id(12),nom:'Dibiterie Ndiaye',categorie:'Restauration'},
 {id:id(14),kind:'produits',statut:'Disponible',parent_id:id(13),nom:'Dibi mouton',categorie:'Grillades',prix:3000},
 {id:id(15),kind:'produits',statut:'Masqué',parent_id:id(2),nom:'Plat masqué',prix:100},
 {id:id(16),kind:'boutiques',statut:'À valider',parent_id:id(1),nom:'Annexe non validée',categorie:'Restaurants'}
];
const texteWa=url=>decodeURIComponent(new URL(url).searchParams.get('text'));

test('contrat : six catégories professionnelles, ancienne « Restauration » reconnue',()=>{
 assert.deepEqual([...C.categoriesRestauration],['Restaurants','Traiteurs','Fast-food et restauration rapide','Pâtisseries','Boulangeries','Vente de boissons']);
 for(const c of C.categoriesRestauration)assert.ok(C.categoriesCommerce.includes(c),c+' proposé à l’inscription');
 assert.ok(C.estRestauration('Restauration'));assert.ok(C.estRestauration(' Traiteurs '));assert.ok(!C.estRestauration('Maison'));assert.ok(!C.estRestauration(null));
 assert.equal(C.categoriesMenu.length,9);assert.ok(C.categoriesMenu.includes('Prestations événementielles'));
 assert.deepEqual([...C.typesPrestations],['Mariages','Baptêmes','Cérémonies religieuses','Anniversaires','Réceptions','Séminaires','Repas sur commande']);
});

test('message de commande conforme au cahier des charges, sans promesse de confirmation',()=>{
 const m=C.messageCommandeRestauration({produit:'Thiéboudienne',prix:2500,boutique:'Chez Awa',quantite:2});
 assert.equal(m,'Bonjour Chez Awa,\n\nJe souhaite passer une commande depuis KOKI CONNECT.\n\nProduit : Thiéboudienne\nPrix : '+C.formaterPrix(2500)+'\nQuantité : 2\n\nMerci de me confirmer la disponibilité et les modalités de commande.');
 assert.doesNotMatch(m,/confirmée|payée|paiement effectué/i);
 assert.match(C.messageCommandeRestauration({produit:'Plat',quantite:0}),/Quantité : 1/);
 assert.doesNotMatch(C.messageCommandeRestauration({produit:'Plat'}),/Prix :/,'prix inconnu : pas de ligne prix');
 assert.match(C.messageDevisRestauration({prestation:'Buffet de mariage',professionnel:'Traiteur Fall'}),/^Bonjour Traiteur Fall,\n\nJe souhaite demander un devis depuis KOKI CONNECT\.\n\nPrestation : Buffet de mariage/);
});

test('vue restauration : seuls les établissements de restauration publiés',async()=>{
 const S=await etat;const idx=S.indexCatalogue(rows);
 const b=S.filtrer(idx,{kind:'boutiques',restauration:true}).map(x=>x.nom).sort();
 assert.deepEqual(b,['Dibiterie Ndiaye','Restaurant Chez Awa'],'boutique non validée et quincaillerie exclues');
 const p=S.filtrer(idx,{kind:'produits',restauration:true}).map(x=>x.nom);
 assert.ok(p.includes('Thiéboudienne')&&p.includes('Dibi mouton')&&p.includes('Café Touba'));
 assert.ok(!p.includes('Eau minérale'),'des boissons vendues par un autre commerce ne sont pas de la restauration');
 assert.ok(!p.includes('Plat masqué'),'contenu masqué jamais public');
 assert.deepEqual(S.filtrer(idx,{kind:'services',restauration:true}).map(x=>x.nom),['Buffet de mariage']);
 assert.ok(S.filtrer(idx,{kind:'produits'}).some(x=>x.nom==='Eau minérale'),'le catalogue général est inchangé');
 assert.deepEqual(S.categories(idx,'boutiques',true),['Restaurants','Restauration']);
 assert.deepEqual(S.villages(idx,'produits',true),['Koki','Pallene']);
 assert.deepEqual(S.compter(idx,{restauration:true}),{professionnels:3,boutiques:2,produits:5,services:1});
});

test('menu : plats rangés dans l’ordre des rubriques, puis « Autres »',async()=>{
 const S=await etat;const idx=S.indexCatalogue(rows);
 const m=S.menu(idx,id(2));
 assert.deepEqual(m.map(g=>g.categorie),['Petit-déjeuner','Déjeuner','Boissons','Autres']);
 assert.deepEqual(m.find(g=>g.categorie==='Déjeuner').produits.map(x=>x.nom),['Thiéboudienne']);
 assert.ok(!m.flatMap(g=>g.produits).some(x=>x.nom==='Plat masqué'));
});

test('WhatsApp : bon numéro (boutique d’abord), message restauration, produit épuisé jamais commandable',async()=>{
 const S=await etat;const idx=S.indexCatalogue(rows);
 const u=S.lienCommande(idx.get(id(3)),idx,3);
 assert.ok(u.startsWith('https://wa.me/221777654321?text='),'numéro WhatsApp de la boutique, sans + ni espace');
 const t=texteWa(u);assert.match(t,/^Bonjour Restaurant Chez Awa,\n\nJe souhaite passer une commande depuis KOKI CONNECT\./);
 assert.ok(t.includes('Produit : Thiéboudienne\nPrix : '+C.formaterPrix(2500)+'\nQuantité : 3'));
 assert.equal(S.lienCommande(idx.get(id(5)),idx),null,'épuisé');
 assert.match(texteWa(S.lienCommande(idx.get(id(11)),idx)),/je souhaite commander via Koki Connect/,'autres commerces : message habituel inchangé');
 const d=S.lienDevis(idx.get(id(8)),idx);assert.ok(d.startsWith('https://wa.me/221781112233?text='),'traiteur sans WhatsApp : son téléphone');
 assert.match(texteWa(d),/Je souhaite demander un devis depuis KOKI CONNECT\.\n\nPrestation : Buffet de mariage/);
 assert.equal(S.lienCommande(idx.get(id(14)),idx),null,'aucun numéro valide : pas de lien');
});

test('accueil : cartes des établissements (boutiques et traiteurs sans boutique)',async()=>{
 const S=await etat;const idx=S.indexCatalogue(rows);
 assert.deepEqual(S.etablissementsRestauration(idx).map(x=>x.nom).sort(),['Dibiterie Ndiaye','Restaurant Chez Awa','Traiteur Fall']);
});

test('interface : WhatsApp direct sans compte ni panier pour la restauration ; autres commerces inchangés',()=>{
 const cat=fs.readFileSync(__dirname+'/../assets/business/catalogue.mjs','utf8');
 assert.match(cat,/if\(estRestaurant\(x,idx\)\)\{const w=lienCommande\(x,idx,1\);if\(w\)\{const a=direct\('Commander sur WhatsApp'/);
 assert.match(cat,/if\(principal&&resto\)actions\.append\(direct\(/);
 assert.match(cat,/else if\(principal\)actions\.append\(contact\(x\.kind==='produits'\?'Commander sur WhatsApp'/,'compte toujours exigé hors restauration');
 assert.match(cat,/ajouterPanier&&!resto/);assert.match(cat,/requestService&&!resto/);
 assert.match(cat,/const avecPanier=!!panier&&!f\.restauration;/);
 assert.match(cat,/n’a pas encore indiqué de numéro WhatsApp valide/);
 const app=fs.readFileSync(__dirname+'/../assets/portail/app.js','utf8'),html=fs.readFileSync(__dirname+'/../index.html','utf8');
 assert.match(html,/id="accueil-restaurants"[\s\S]*?Restaurants &amp; Traiteurs[\s\S]*?data-clic="afficherRestaurants\(\)"/);
 assert.match(app,/window\.afficherRestaurants=afficherRestaurants;/);
 assert.doesNotMatch(cat+app,/paiement (effectué|confirmé)|commande confirmée/i);
});

test('suggestions visibles sous les champs catégorie (sans dépendre du datalist du téléphone)',async()=>{
 const {filtrerSuggestions}=await import('../assets/business/pro-space.mjs');
 const liste=[...C.categoriesCommerce,...C.metiers];
 const vide=filtrerSuggestions(liste,'');assert.equal(vide.length,14);
 for(const c of C.categoriesRestauration)assert.ok(vide.includes(c),c+' visible sans rien taper');
 assert.deepEqual(filtrerSuggestions(liste,'patis'),['Pâtisseries'],'sans accent ni casse');
 assert.deepEqual(filtrerSuggestions(liste,'traiteurs'),[],'valeur déjà choisie : plus de suggestions');
 assert.ok(filtrerSuggestions(C.categoriesMenu,'dej').includes('Petit-déjeuner'));
 const src=fs.readFileSync(__dirname+'/../assets/business/pro-space.mjs','utf8');
 assert.match(src,/if\(list&&list\.length\)suggestions\(wrap,el,list\);/);
});
