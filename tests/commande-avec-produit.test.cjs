'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/partage.js');
const PROD='a9590328-d8ca-4970-ab99-972436abacbd',SHOP='5244e52a-8367-47e6-81e9-36d63600a7d0',BASE='https://qsbmzzbiztfqysstepxm.supabase.co';
const res=()=>({statusCode:0,headers:{},body:'',setHeader(k,v){this.headers[k]=v;},end(b){this.body=b||'';}});
const catalogue=[{id:SHOP,kind:'boutiques',nom:'ND confection'},{id:PROD,kind:'produits',parent_id:SHOP,nom:'Ensemble loisir',prix:5000,description:'Coton, toutes tailles',photos:['df3c2aa4/b5212826.jpg']},{id:'b3828cdf-db0b-4392-b897-96779a2dd441',kind:'produits',parent_id:SHOP,nom:'Sans prix ni photo'}];
const serveur=(rows=catalogue,signOk=true)=>async(url,o={})=>{
 if(url.endsWith('/rest/v1/rpc/koki_business')){assert.deepEqual(JSON.parse(o.body),{command:'catalog',input:{}});return {ok:true,json:async()=>rows};}
 if(url.includes('/object/sign/koki-media/'))return signOk?{ok:true,json:async()=>({signedURL:'/object/sign/koki-media/'+url.split('koki-media/')[1]+'?token=t'})}:{ok:false};
 return {ok:false};};
test('message de commande : le lien du produit accompagne la commande (produit seul et panier)',async()=>{
 globalThis.location={protocol:'https:',host:'www.kokiconnect.com',origin:'https://www.kokiconnect.com'};
 const S=await import('../assets/business/catalogue-state.mjs');
 assert.equal(S.lienProduit(PROD),'https://www.kokiconnect.com/f/'+PROD);assert.equal(S.lienProduit('../x'),'');
 const idx=S.indexCatalogue([{id:'pro',kind:'professionnels',statut:'Actif',nom:'Ndèye',type:'Commerçant'},{id:SHOP,kind:'boutiques',parent_id:'pro',statut:'Actif',nom:'ND confection',whatsapp:'77 123 45 67'},{id:PROD,kind:'produits',parent_id:SHOP,statut:'Disponible',nom:'Ensemble loisir',prix:5000,stock:4}]);
 const msg=decodeURIComponent(S.lienCommande(idx.get(PROD),idx,2).split('?text=')[1]);
 assert.ok(msg.includes('Ensemble loisir × 2'));assert.ok(msg.endsWith('\nVoir le produit : https://www.kokiconnect.com/f/'+PROD),msg);
 const panier=decodeURIComponent(S.lienPanierWhatsApp([{id:PROD,nom:'Ensemble loisir',prix:5000,quantite:2}],idx).split('?text=')[1]);
 assert.match(panier,new RegExp('- 2 × Ensemble loisir \\(5.000.FCFA\\)\\n  https://www\\.kokiconnect\\.com/f/'+PROD));
 delete globalThis.location;assert.equal(S.lienProduit(PROD),'https://www.kokiconnect.com/f/'+PROD,'sans navigateur : adresse officielle');
});
test('aperçu du produit dans WhatsApp : photo, nom, prix, boutique, puis ouverture de la fiche',async()=>{
 const r=res();await handler({query:{fiche:PROD}},r,serveur());
 assert.equal(r.statusCode,200);
 assert.ok(r.body.includes('og:title" content="Ensemble loisir — 5 000 FCFA"'),r.body);
 assert.ok(r.body.includes('og:description" content="Chez ND confection · Coton, toutes tailles"'));
 assert.ok(r.body.includes('og:image" content="'+BASE+'/storage/v1/object/sign/koki-media/df3c2aa4/b5212826.jpg?token=t"'));
 assert.ok(r.body.includes('og:url" content="https://www.kokiconnect.com/f/'+PROD+'"'));
 assert.ok(r.body.includes('content="0;url=/?fiche='+PROD+'"'));assert.ok(!/<script/i.test(r.body));
});
test('produit sans prix ni photo, produit retiré, serveur en panne : jamais d’erreur',async()=>{
 let r=res();await handler({query:{fiche:'b3828cdf-db0b-4392-b897-96779a2dd441'}},r,serveur());
 assert.ok(r.body.includes('og:title" content="Sans prix ni photo — Prix sur demande"'));assert.ok(r.body.includes('og:image" content="https://www.kokiconnect.com/assets/entete-horizontal.webp"'));
 r=res();await handler({query:{fiche:'00000000-0000-4000-8000-000000000000'}},r,serveur());assert.equal(r.statusCode,302);assert.equal(r.headers.Location,'/?fiche=00000000-0000-4000-8000-000000000000');
 r=res();await handler({query:{fiche:PROD}},r,async()=>{throw Error('réseau');});assert.equal(r.statusCode,302);assert.equal(r.headers.Location,'/?fiche='+PROD);
 r=res();await handler({query:{fiche:'<script>'}},r,serveur());assert.equal(r.headers.Location,'/');
});
