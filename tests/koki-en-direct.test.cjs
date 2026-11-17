'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function charger(){const window={addEventListener(){}};const ctx={window,document:{getElementById:()=>null,addEventListener(){},readyState:'complete',hidden:false},setInterval(){},setTimeout(){},localStorage:{getItem:()=>'vu',setItem(){}},location:{search:''},URLSearchParams};
 vm.runInNewContext(fs.readFileSync('assets/portail/accueil-jour.js','utf8'),ctx);return window.KokiAccueilJour;}
const T=Date.parse('2026-11-17T08:00:00Z'),H=3600e3;
const pub=(id,type,categorie,heures)=>({id,type,categorie,titre:'T'+id,publication:new Date(T-heures*H).toISOString()});
test('en direct : seulement les catégories urgentes, des 72 dernières heures, les plus récentes d’abord',()=>{
 const K=charger();
 const xs=[pub('a','Annonces','Décès et cérémonies',5),pub('b','Annonces','Petite annonce',1),pub('c','Annonces','Coupure eau/électricité',2),pub('d','Sports & ASC','Résultat',30),
  pub('e','Annonces','Avis important',80),pub('f','Actualités','Résultat',1),pub('g','Annonces','Avis important',-2),pub('h','Annonces','Avis important',70),pub('i','Sports & ASC','Résultat',60)];
 assert.deepEqual(Array.from(K.enDirect(xs,T),x=>x.id),['c','a','d','i']);
 assert.equal(K.enDirect(xs,T,10).length,5);assert.equal(K.enDirect(null,T).length,0);
});
test('ancienneté lisible',()=>{
 const K=charger();const il=h=>K.ilYA(new Date(T-h*H).toISOString(),T);
 assert.equal(il(0),'à l’instant');assert.equal(il(0.5),'il y a 30 min');assert.equal(il(3),'il y a 3 h');assert.equal(il(26),'hier');assert.equal(il(60),'il y a 3 jours');
});
test('catégories proposées dans l’application et dans l’administration ; bloc placé avant les prières',()=>{
 for(const f of ['assets/portail/core.js','../koki-connect-admin/src/model.js'].filter(f=>fs.existsSync(f))){const s=fs.readFileSync(f,'utf8');assert.ok(s.includes("'Décès et cérémonies','Coupure eau/électricité'"),f);}
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.indexOf('id="koki-direct"')>0&&html.indexOf('id="koki-direct"')<html.indexOf('id="infos-jour"'));
});
