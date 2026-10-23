// Carte produit : « Commander » placé avant « Ajouter au panier ».
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const js=fs.readFileSync(__dirname+'/../assets/business/catalogue.mjs','utf8');
test('la carte affiche Commander avant Ajouter au panier',()=>{
 const f=js.slice(js.indexOf('function actionsCarte'),js.indexOf('function carte('));
 const i=f.indexOf("contact('Commander'"),j=f.indexOf("button('Ajouter au panier'"),k=f.indexOf('compteur(x)');
 assert.ok(i>0&&i<j&&i<k);
});
