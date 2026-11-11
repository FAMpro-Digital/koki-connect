'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const K=require('../assets/portail/classement.js');
const J=864e5,T=Date.parse('2026-11-11T12:00:00Z');
const pub=(id,type,categorie,jours)=>({id,type,categorie,publication:new Date(T-jours*J).toISOString()});
const stock=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('sans donnée : ordre des dates conservé',()=>{
 const xs=[pub('a','Actualités','Sport',0),pub('b','Actualités','Religion',2),pub('c','Actualités','Sport',9)];
 assert.deepEqual(K.classer(xs,{maintenant:T}).map(x=>x.id),['a','b','c']);
});
test('popularité : une publication aimée et commentée remonte, mais pas indéfiniment',()=>{
 const xs=[pub('a','Actualités','Sport',1),pub('b','Actualités','Religion',3)];
 const social=new Map([['b',{likes:12,comments:6}]]);
 assert.deepEqual(K.classer(xs,{maintenant:T,social}).map(x=>x.id),['b','a']);
 const vieux=[pub('a','Actualités','Sport',1),pub('b','Actualités','Religion',90)];
 assert.deepEqual(K.classer(vieux,{maintenant:T,social}).map(x=>x.id),['a','b']);
});
test('centres d’intérêt : restent sur l’appareil, bornés, et s’effacent avec le temps',()=>{
 const s=stock();for(let i=0;i<80;i++)K.noter(pub('x','Sports & ASC','Football',0),s,T);K.noter({type:'Publicités',categorie:'Pub'},s,T);
 const i=K.lire(s);assert.equal(i.types['Sports & ASC'],50);assert.equal(i.types['Publicités'],undefined);
 const xs=[pub('a','Actualités','Religion',1),pub('b','Actualités','Football',2)];
 assert.deepEqual(K.classer(xs,{maintenant:T,interets:i}).map(x=>x.id),['b','a']);
 const apres=K.vieillir(i,T+60*J);assert.ok(Math.abs(apres.types['Sports & ASC']-12.5)<0.01);
 K.oublier(s);assert.deepEqual(K.lire(s).types,{});
 s.setItem(K.CLE,'{"types":{"a":"x","b":-3,"c":1e9},"categories":null}');assert.deepEqual(K.lire(s).types,{c:50});
});
test('à lire aussi : même rubrique et même catégorie d’abord, sans la publication ouverte ni les publicités',()=>{
 const x=pub('x','Actualités','Sport',0);
 const xs=[x,pub('a','Actualités','Religion',0),pub('b','Actualités','Sport',5),pub('c','Annonces','Sport',0),pub('d','Publicités','Sport',0),pub('e','Annonces','Vente',0)];
 assert.deepEqual(K.similaires(x,xs,{maintenant:T}).map(y=>y.id),['b','a','c']);
});
test('catalogue : ordre recommandé et offres similaires',async()=>{
 const S=await import('../assets/business/catalogue-state.mjs');
 const rows=[{id:'p',kind:'professionnels',nom:'Pro',statut:'Actif',type:'Commerçant'},{id:'s',kind:'boutiques',parent_id:'p',nom:'Boutique',statut:'Actif'},
  {id:'1',kind:'produits',parent_id:'s',nom:'Épuisé',statut:'Épuisé',stock:0,prix:100,categorie:'Tissus'},
  {id:'2',kind:'produits',parent_id:'s',nom:'Dispo',statut:'Disponible',stock:3,prix:100,categorie:'Tissus'},
  {id:'3',kind:'produits',parent_id:'s',nom:'Sans stock',statut:'Disponible',categorie:'Autre'}];
 const idx=S.indexCatalogue(rows);const ordre=S.filtrer(idx,{kind:'produits'}).map(x=>x.id);
 assert.equal(ordre.at(-1),'1');assert.deepEqual([...ordre].sort(),['1','2','3']);
 assert.deepEqual(S.similaires(idx,idx.get('2')).map(x=>x.id),['3']);
 assert.deepEqual(S.similaires(idx,idx.get('s')),[]);
});
test('page : module chargé avant le flux, accueil classé, intérêt noté à l’ouverture',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes('assets/portail/classement.js'));
 const app=fs.readFileSync('assets/portail/app.js','utf8');
 assert.ok(app.includes("if(['Actualités','Annonces','Opportunités'].includes(type))xs=classement(xs);"));
 assert.ok(app.includes('KokiClassement?.noter(x,localStorage)'));assert.ok(app.includes('aLireAussi(x,box)'));
});
