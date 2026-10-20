// Renseignements propres à chaque rubrique : bandeau en tête de la rubrique, tuile masquable, fiches hors de l'accueil.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
require('../assets/portail/rubriques-contract.js');const R=globalThis.KokiRubriquesContract;
test('application : bandeau par rubrique, tuile masquable, fiche jamais publiée comme contenu',()=>{
 const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('assets/portail/app.js','utf8');
 assert.match(html,/<script defer src="assets\/portail\/rubriques-contract\.js"><\/script>/);
 for(const id of ['portail-bandeau','bandeau-transport','bandeau-commerce'])assert.match(html,new RegExp('id="'+id+'" class="rb-bandeau" hidden'));
 assert.match(app,/bandeau\(\$\('portail-bandeau'\),PAGES_RUBRIQUES\[titre\]\)/);assert.match(app,/e\.hidden=F\[r\.cle\]\?\.v\.visible===false/);
 assert.match(app,/if\(x\.categorie==='Rubriques'\)return true;/);
 for(const t of ['Éducation','💼 Emplois & Opportunités','⚽ Sport','Santé','📅 Événements','🏛️ Services publics'])assert.ok(app.includes("'"+t+"':"),t);
 const v=JSON.parse(R.encodeFiche({cle:'evenements',visible:false}));assert.equal(v.visible,false);
 assert.deepEqual(R.rubriques.map(r=>r.nom).sort(),[...html.matchAll(/class="raccourci" data-recherche="([^"]+)"/g)].map(m=>m[1].replace('&amp;','&')).sort(),'une tuile par rubrique');
});
