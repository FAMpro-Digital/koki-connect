// Boutique en ligne Commerces & Services : panier, promotions, commande WhatsApp, démonstration branchée sur la même interface.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const U=n=>`${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const PRO=U(1),SHOP=U(2),RIZ=U(3),HUILE=U(4),SUCRE=U(5),SHOP_B=U(6),SAVON=U(7);
const rows=()=>[
 {id:PRO,kind:'professionnels',statut:'Actif',nom:'Épicerie Diop',telephone:'+221771234567',village:'Koki'},
 {id:SHOP,kind:'boutiques',statut:'Actif',parent_id:PRO,nom:'Boutique du marché',whatsapp:'+221761234567'},
 {id:SHOP_B,kind:'boutiques',statut:'Actif',parent_id:PRO,nom:'Dépôt'},
 {id:RIZ,kind:'produits',statut:'Disponible',parent_id:SHOP,nom:'Riz 5 kg',categorie:'Alimentation',prix:4500,ancien_prix:5000,stock:8},
 {id:HUILE,kind:'produits',statut:'Disponible',parent_id:SHOP,nom:'Huile 5 L',categorie:'Alimentation',prix:7500,ancien_prix:10000,stock:2},
 {id:SUCRE,kind:'produits',statut:'Épuisé',parent_id:SHOP,nom:'Sucre',categorie:'Alimentation',prix:800,ancien_prix:1000,stock:0},
 {id:SAVON,kind:'produits',statut:'Disponible',parent_id:SHOP_B,nom:'Savon',categorie:'Maison',prix:500,stock:4}
];
const load=async()=>{const S=await import('../assets/business/catalogue-state.mjs');return {S,idx:S.indexCatalogue(rows())};};

test('promotions : produits disponibles seulement, plus forte remise d’abord',async()=>{
 const {S,idx}=await load();assert.deepEqual(S.promotions(idx).map(x=>x.id),[HUILE,RIZ],'épuisé exclu, −25 % avant −10 %');
});
test('panier : total indicatif et message WhatsApp récapitulatif vers la boutique',async()=>{
 const {S,idx}=await load();const lignes=[{id:RIZ,nom:'Riz 5 kg',prix:4500,quantite:2},{id:HUILE,nom:'Huile 5 L',prix:7500,quantite:1}];
 assert.equal(S.totalPanier(lignes),16500);assert.equal(S.totalPanier([]),0);
 const retrait=S.lienPanierWhatsApp(lignes,idx);assert.match(retrait,/^https:\/\/wa\.me\/221761234567\?text=/,'WhatsApp de la boutique');
 const t=decodeURIComponent(retrait.split('text=')[1]).replace(/[\u00a0\u202f]/g,' ');
 for(const s of ['Boutique du marché','2 × Riz 5 kg','1 × Huile 5 L','16 500 FCFA','Retrait en boutique','Paiement à la réception'])assert.ok(t.includes(s),s);
 const livraison=decodeURIComponent(S.lienPanierWhatsApp(lignes,idx,{mode:'livraison',adresse:'Quartier Ndiaye'}).split('text=')[1]);assert.ok(livraison.includes('Livraison : Quartier Ndiaye'));
 assert.equal(S.lienPanierWhatsApp([],idx),null);
 assert.match(S.lienPanierWhatsApp([{id:SAVON,nom:'Savon',prix:500,quantite:1}],idx),/^https:\/\/wa\.me\/221771234567/,'sinon téléphone du commerce');
});
test('interface : panier latéral, barre panier, puces, Ajouter au panier, aucun HTML injecté',()=>{
 const ui=fs.readFileSync('assets/business/catalogue.mjs','utf8'),css=fs.readFileSync('assets/business/style.css','utf8');
 for(const s of ["'cat-cart'","'cat-cartbar'","'chip'","'Ajouter au panier'","'Commander · paiement à la réception'","'Commander sur WhatsApp'","'Retrait en boutique'","'Livraison'","aria-pressed","role','tablist'"])assert.ok(ui.includes(s),s);
 assert.doesNotMatch(ui,/innerHTML|insertAdjacentHTML/);
 assert.match(css,/\.cat-layout\{display:flex;flex-wrap:wrap/,'catalogue et panier côte à côte puis empilés');
 assert.match(css,/@media \(min-width:900px\)\{#vue-commerce \.business-panel \.cat-cartbar\{display:none\}\}/,'barre panier réservée aux petits écrans');
 assert.doesNotMatch(css.slice(css.indexOf('/* Boutique en ligne')),/(^|[;{])width:\s*\d{3,}px/m,'aucune largeur fixe');
});
test('service réel : panier invité sans connexion, commande interne et WhatsApp conservées',()=>{
 const rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
 assert.match(rt,/async function addToCart\(p,quantity=1\)\{let u=null;try\{u=await api\.identity\(\);\}catch\{\}/,'panier possible avant connexion');
 assert.match(rt,/api\.order\(cart\[0\]\.parent_id/,'commande interne vérifiée par le serveur');
 assert.match(rt,/catch\{ouvrirConnexion\('commerce'\);throw Error\('Connectez-vous/,'connexion ouverte sur place avant de commander');
 const c=JSON.parse(fs.readFileSync('assets/business/config.json','utf8'));assert.equal(c.modules.commerce,true,'commandes Commerce activées (autorisation du 13/10/2026)');assert.equal(c.modules.transport,true,'Transport activé (autorisation du 14/10/2026)');
});
test('démonstration : même boutique, données fictives locales, aucun contact réel',()=>{
 const app=fs.readFileSync('assets/commerce/app.js','utf8'),html=fs.readFileSync('index.html','utf8');
 assert.match(app,/function sourceDemo\(\)/);assert.match(app,/sourceDemo,/,'exposée au catalogue');
 assert.doesNotMatch(app.slice(app.indexOf('function lignesDemo')),/telephone:p\.telephone/,'aucun numéro réel en démonstration');
 assert.doesNotMatch(html,/KokiCommerce\.(catalogue|panier|commander)\(/,'ancien catalogue démo retiré');
 assert.match(html,/<div id="market-demo-interface" hidden>/);
});
test('activation par rubrique : Commerce ouvert, Transport fermé',async()=>{
 const g=globalThis;g.window=g.window||{};g.location=g.location||{search:'',hostname:'127.0.0.1'};
 const {moduleActif}=await import('../assets/business/runtime.mjs');
 const c={enabled:true,modules:{commerce:true,transport:false}};
 assert.equal(moduleActif(c,'commerce'),true);assert.equal(moduleActif(c,'transport'),false);
 assert.equal(moduleActif({enabled:true},'transport'),true,'sans « modules » : suit enabled');assert.equal(moduleActif({enabled:false,modules:{commerce:true}},'commerce'),false,'interrupteur général prioritaire');
});
