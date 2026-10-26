// Appuis répétés sur l'onglet Profil : une seule entrée d'historique (régression : une entrée par appui).
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const nav=fs.readFileSync(__dirname+'/../assets/portail/navigation.js','utf8');
test('même page portail réaffichée : aucune nouvelle étape d’historique',()=>{
 assert.match(nav,/maintenant === 'vue-portail' && courante === 'vue-portail' && titreRemplace/);
 assert.match(nav,/removedNodes\[0\]\.textContent === titre\.textContent/);
 const i=nav.indexOf("removedNodes[0].textContent === titre.textContent"),j=nav.indexOf('pile.push(');
 assert.ok(i>0&&j>i,'le contrôle précède l’ajout d’une étape');
});
