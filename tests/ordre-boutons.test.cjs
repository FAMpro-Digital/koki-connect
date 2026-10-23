// Fiche produit : « Commander » avant « Ajouter au panier » (le bouton panier reste affiché même sans coordonnées).
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const js=fs.readFileSync(__dirname+'/../assets/business/catalogue.mjs','utf8');
test('« Ajouter au panier » est inséré après « Commander sur WhatsApp »',()=>{
 const i=js.indexOf("contact(x.kind==='produits'?'Commander sur WhatsApp'");
 const j=js.indexOf('actions.append(apresCommande)');
 assert.ok(i>0&&j>i,'ordre Commander puis panier');
 assert.ok(/if\(!c\)\{[^}]*apresCommande/.test(js),'panier conservé sans coordonnées');
 assert.ok(!/corps\.append\(b\);\}\n  dessinerContact/.test(js),'plus ajouté avant le contact');
});
