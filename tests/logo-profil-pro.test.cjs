const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const ps=fs.readFileSync('assets/business/pro-space.mjs','utf8'),rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
test('le logo du compte professionnel est affiché dans l’espace pro et l’en-tête du profil',()=>{
  assert.match(ps,/export function logoCompte/);
  assert.match(ps,/function identite\(\)/);
  assert.match(ps,/api\.image\(chemin\)/);
  assert.match(rt,/logoEntete\(tete\)/);
  assert.match(rt,/pf-avatar-img/);
});
test('logoCompte retient la première photo de la fiche, sinon celle d’une boutique',async()=>{
  const src=ps.match(/export function logoCompte[\s\S]*?\n}\n/)[0].replace('export ','');
  const logoCompte=new Function(src+';return logoCompte;')();
  assert.equal(logoCompte({payload:{photos:['a/b.jpg','c.jpg']}}),'a/b.jpg');
  assert.equal(logoCompte({payload:{image_path:'x.jpg'}}),'x.jpg');
  assert.equal(logoCompte({payload:{}},[{statut:'Actif',payload:{photos:['s.jpg']}}]),'s.jpg');
  assert.equal(logoCompte(null,[]),null);
});
