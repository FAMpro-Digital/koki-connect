'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const lire=f=>fs.readFileSync(f,'utf8');
test('accueil : bloc du jour chargé (prières avant l’affichage) et alimenté par les contenus',()=>{
 const html=lire('index.html');assert.ok(html.includes('id="infos-jour"'));
 assert.ok(html.indexOf('assets/portail/prieres.js')<html.indexOf('assets/portail/accueil-jour.js'));
 assert.ok(lire('assets/portail/app.js').includes('window.KokiAccueilJour?.maj(visibles())'));
 const js=lire('assets/portail/accueil-jour.js');assert.ok(js.includes("S.famille(v.genre)==='pharmacie'&&S.enGarde(v)"));assert.ok(!/fetch\(|XMLHttpRequest/.test(js));
});
test('partage : bouton sur chaque publication et lien qui rouvre la publication',()=>{
 const s=lire('assets/portail/social.js');assert.ok(s.includes("location.origin+'/?publication='+x.id"));assert.ok(s.includes('navigator.share'));assert.ok(s.includes('https://wa.me/?text='));
 const a=lire('assets/portail/app.js');assert.ok(a.includes("new URLSearchParams(location.search).get('publication')"));assert.ok(a.includes("/^[a-f0-9-]{36}$/.test(id)"));assert.ok(a.includes('ouvrirLienPartage();'));
});
test('bienvenue : trois écrans, une seule fois, fermable au clavier, jamais par-dessus un lien partagé',()=>{
 const js=lire('assets/portail/accueil-jour.js');assert.equal((js.match(/^ \['/gm)||[]).length,3);
 assert.ok(js.includes("localStorage.setItem(CLE,'vu')"));assert.ok(js.includes("e.key==='Escape'"));assert.ok(js.includes("has('publication')"));
 assert.ok(lire('tests/e2e/helpers/isolation.mjs').includes("koki.bienvenue.v1"));
});
