// Le commerçant peut désarchiver ses boutiques, produits et services (commande serveur « unarchive »).
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const ui=fs.readFileSync(__dirname+'/../assets/business/pro-space.mjs','utf8'),client=fs.readFileSync(__dirname+'/../assets/business/client.mjs','utf8');
test('client : commande unarchive avec identifiant et révision',()=>{
 assert.match(client,/unarchive:row=>run\('unarchive',\{id:row\.id,revision:row\.revision\},'pro:unarchive:'\+row\.id\)/);
});
test('espace pro : chaque élément archivé a un bouton Désarchiver',()=>{
 assert.match(ui,/button\('Désarchiver'/);assert.match(ui,/api\.unarchive\(r\)/);
 for(const v of ['state.boutiques','state.produits','state.services'])assert.ok(ui.includes('archived(body,'+v+')'),v);
 assert.match(ui,/repasse en validation par l’administration/);
});
test('boutique et services accessibles dès que la fiche est envoyée (En attente), préparation des produits avant validation',()=>{
 assert.match(ui,/envoyee=\['En attente','À valider','Actif'\]\.includes\(p\.statut\)/);
 assert.match(ui,/'boutiques',envoyee,wait/);assert.match(ui,/'services',envoyee,wait/);
 assert.match(ui,/'produits',envoyee&&activeShops\(\)\.length>0/);
});
