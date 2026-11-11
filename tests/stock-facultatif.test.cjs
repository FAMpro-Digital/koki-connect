const test=require('node:test'),assert=require('node:assert'),fs=require('fs');
const C=require('../assets/business/commerce-contract.js');
test('produit : le stock est facultatif, mais reste contrôlé quand il est saisi',()=>{
 assert.deepEqual(C.verifierOffre('produits',{nom:'Riz',prix:500}),[]);
 assert.deepEqual(C.verifierOffre('produits',{nom:'Riz',prix:500,stock:null}),[]);
 assert.deepEqual(C.verifierOffre('produits',{nom:'Riz',prix:500,stock:3}),[]);
 assert.equal(C.verifierOffre('produits',{nom:'Riz',prix:500,stock:-1}).length,1);
 assert.equal(C.verifierOffre('produits',{nom:'Riz',prix:500,stock:1.5}).length,1);
});
test('catalogue : sans stock le produit reste disponible, à 0 il est épuisé',async()=>{
 const S=await import('../assets/business/catalogue-state.mjs');
 assert.equal(S.disponible({kind:'produits',statut:'Disponible'}),true);
 assert.equal(S.disponible({kind:'produits',statut:'Disponible',stock:4}),true);
 assert.equal(S.disponible({kind:'produits',statut:'Disponible',stock:0}),false);
 assert.equal(S.disponible({kind:'produits',statut:'Épuisé'}),false);
});
test('formulaire produit : stock non obligatoire et non envoyé quand il est vide',()=>{
 const s=fs.readFileSync('assets/business/pro-space.mjs','utf8');
 assert.ok(s.includes("if(num(stock)!==null)values.stock=num(stock);"));
 assert.ok(!s.includes("value:p.stock??1,required:true"));
 assert.ok(s.includes('Facultatif. Laissez vide si vous ne comptez pas le stock.'));
});
