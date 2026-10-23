// Catalogue Commerces & Services : ouvert/fermé, distance, favoris, partage, stock bas, copie hors connexion, filtres.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const extras=()=>import('../assets/business/catalogue-extras.mjs'),etat=()=>import('../assets/business/catalogue-state.mjs');
const jour=(j,h,m=0)=>new Date(Date.UTC(2026,9,18+j,h,m)); // 18 octobre 2026 = dimanche
const U=n=>'00000000-0000-0000-0000-0000000000'+String(n).padStart(2,'0');
test('ouvert / fermé : horaires libres compris, sinon aucune réponse',async()=>{
 const {ouvertMaintenant:o}=await extras();
 const cas=[['tous les jours 9 h–19 h.',jour(1,12),true],['tous les jours 9 h–19 h.',jour(1,20),false],['Lundi au samedi 8h-19h, dimanche fermé',jour(0,10),false],
  ['Lundi au samedi 8h-19h; dimanche 9h-13h',jour(0,10),true],['Lun-Ven 8h-12h, 15h-19h',jour(2,13),false],['Lun-Ven 8h-12h, 15h-19h',jour(2,16),true],
  ['24h/24',jour(3,3),true],['Marché ouvert 8h-19h',jour(2,10),true],['sur rendez-vous',jour(1,10),null],['',jour(1,10),null],
  ['tous les jours sauf dimanche 8h-20h',jour(0,10),false],['20h-02h',jour(1,1),true],['20h-02h',jour(1,12),false]];
 for(const [h,d,att] of cas)assert.equal(o(h,d),att,h+' @ '+d.toISOString());
});
test('distance et libellé',async()=>{
 const {distanceKm,libelleDistance}=await extras();
 const d=distanceKm({latitude:15.3,longitude:-16},{latitude:15.31,longitude:-16});assert.ok(d>1.0&&d<1.2);
 assert.equal(distanceKm(null,{latitude:1,longitude:1}),null);
 assert.equal(libelleDistance(0.35),'350 m');assert.equal(libelleDistance(2.34),'2,3 km');assert.equal(libelleDistance(18.6),'19 km');
});
test('favoris : stockés sur l\'appareil, identifiants valides seulement',async()=>{
 const {lireFavoris,basculerFavori}=await extras();const m=new Map(),st={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 assert.equal(basculerFavori(st,U(1)).has(U(1)),true);assert.equal(basculerFavori(st,U(1)).has(U(1)),false);
 basculerFavori(st,'pas-un-id');assert.equal(lireFavoris(st).size,0);
 st.setItem('koki.commerce.favoris','{oups');assert.equal(lireFavoris(st).size,0);
});
test('partage : lien vers la fiche, sans données personnelles',async()=>{
 const {lienFiche,messagePartage,lienPartageWhatsApp}=await extras();
 assert.equal(lienFiche(U(2),'https://koki.example/app/?a=1#x'),'https://koki.example/app/?fiche='+U(2));
 const idx={vendeur:()=>({nom:'Boutique Fam'}),boutique:()=>null};
 const m=messagePartage({id:U(2),nom:'Riz',kind:'produits',prix:12500},idx,'https://koki.example/');
 assert.match(m,/Riz.*12\s?500 FCFA.*Boutique Fam.*fiche=/);assert.match(lienPartageWhatsApp({id:U(2),nom:'Riz',kind:'produits'},idx,'https://koki.example/'),/^https:\/\/wa\.me\/\?text=/);
});
test('stock bas : seuil, produits archivés ignorés',async()=>{
 const {niveauStock,produitsStockBas}=await extras();
 assert.deepEqual([0,2,3,4,undefined,-1].map(n=>niveauStock(n)),['epuise','bas','bas','ok','inconnu','inconnu']);
 const r=[{kind:'produits',statut:'Disponible',payload:{stock:2}},{kind:'produits',statut:'Archivé',payload:{stock:0}},{kind:'produits',statut:'Disponible',payload:{stock:50}},{kind:'services',statut:'Disponible',payload:{stock:0}}];
 assert.equal(produitsStockBas(r).length,1);
});
test('copie hors connexion : sauvée, relue, refusée si trop grosse ou abîmée',async()=>{
 const {sauverCatalogue,lireCatalogue,TAILLE_MAX_COPIE}=await extras();const m=new Map(),st={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 assert.equal(sauverCatalogue(st,[{id:U(1)}],1000),true);assert.deepEqual(lireCatalogue(st),{version:1,date:1000,rows:[{id:U(1)}]});
 assert.equal(sauverCatalogue(st,['x'.repeat(TAILLE_MAX_COPIE)]),false);
 st.setItem('koki.commerce.catalogue','{"version":2}');assert.equal(lireCatalogue(st),null);assert.equal(lireCatalogue(null),null);
});
test('filtres : promotions, ouvert maintenant, favoris, plus proches',async()=>{
 const {indexCatalogue,filtrer}=await etat();
 const pro={id:U(10),kind:'professionnels',nom:'Pro',statut:'Actif',horaires:'tous les jours 9 h–19 h',categorie:'Alimentation',localisation:{latitude:15.30,longitude:-16.0}};
 const pro2={id:U(11),kind:'professionnels',nom:'Pro loin',statut:'Actif',horaires:'lundi au vendredi 8h-12h',localisation:{latitude:15.60,longitude:-16.0}};
 const b={id:U(12),kind:'boutiques',parent_id:U(10),nom:'Boutique',statut:'Actif'};
 const p1={id:U(13),kind:'produits',parent_id:U(12),nom:'Riz',prix:800,ancien_prix:1000,stock:5,statut:'Disponible'},p2={id:U(14),kind:'produits',parent_id:U(12),nom:'Sucre',prix:500,stock:5,statut:'Disponible'};
 const idx=indexCatalogue([pro,pro2,b,p1,p2]);
 assert.deepEqual(filtrer(idx,{kind:'produits',promo:true}).map(x=>x.nom),['Riz']);
 const dim=jour(0,10);// dimanche 10 h : seul « Pro » est ouvert
 assert.deepEqual(filtrer(idx,{kind:'professionnels',ouvert:true,maintenant:dim}).map(x=>x.nom),['Pro']);
 assert.equal(filtrer(idx,{kind:'professionnels',ouvert:true,maintenant:jour(0,22)}).length,0);
 assert.deepEqual(filtrer(idx,{kind:'produits',favoris:new Set([U(14)])}).map(x=>x.nom),['Sucre']);
 assert.deepEqual(filtrer(idx,{kind:'professionnels',tri:'proche',position:{latitude:15.61,longitude:-16.0}}).map(x=>x.nom),['Pro loin','Pro']);
 assert.deepEqual(filtrer(idx,{kind:'produits',tri:'proche'}).length,2,'sans position : ordre normal');
});
test('interface : contact sans compte, commander avec compte, avis et statistiques facultatifs',()=>{
 const cat=fs.readFileSync(__dirname+'/../assets/business/catalogue.mjs','utf8'),cl=fs.readFileSync(__dirname+'/../assets/business/client.mjs','utf8');
 assert.match(cat,/direct\('Appeler le '/);assert.match(cat,/direct\(principal\?'Écrire sur WhatsApp'/);
 assert.match(cat,/contact\(x\.kind==='produits'\?'Commander sur WhatsApp'/,'commander exige toujours le compte');
 assert.match(cat,/api\.avis\?\.\(x\.id\)/);assert.match(cl,/PGRST202/);assert.match(cl,/koki_reviews_list/);assert.match(cl,/koki_track/);assert.match(cl,/koki_stats_mine/);
});
