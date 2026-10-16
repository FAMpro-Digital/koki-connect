// L'espace professionnel est affiché dans « Profil » (#profil-pro) : il doit recevoir les mêmes styles
// que dans Commerces & Services (champs, boutons, étapes), sinon les formulaires s'affichent sans mise en forme.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const css=fs.readFileSync(__dirname+'/../assets/business/style.css','utf8');
const selecteurs=[...css.matchAll(/([^{}]+)\{/g)].flatMap(m=>m[1].split(',').map(s=>s.trim()));
test('chaque règle .pro-* de Commerces & Services existe aussi pour #profil-pro',()=>{
 const pro=selecteurs.filter(s=>s.startsWith('#vue-commerce .business-panel .pro'));
 assert.ok(pro.length>20);
 for(const s of pro)assert.ok(selecteurs.includes(s.replace('#vue-commerce .business-panel','#profil-pro')),'manquant : '+s);
});
test('champs et boutons de base stylés dans #profil-pro',()=>{
 for(const s of ['#profil-pro input','#profil-pro button','#profil-pro label'])assert.ok(selecteurs.some(x=>x===s||x.startsWith(s)),s);
});
test('les accolades sont équilibrées',()=>{let d=0;for(const c of css){if(c==='{')d++;if(c==='}')d--;assert.ok(d>=0);}assert.equal(d,0);});
