// Transport : feuille de réservation (carte, « Où allez-vous ? », véhicules avec prix, Commander) branchée sur le serveur existant.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('interface Transport : carte, trajet, quatre véhicules avec prix, bouton Commander',()=>{
 const html=fs.readFileSync('index.html','utf8'),v=html.slice(html.indexOf('<section id="vue-transport"'),html.indexOf('<section id="vue-carte"'));
 assert.match(v,/<h2 id="titre-transport" tabindex="-1">Où allez-vous \?<\/h2>/);
 for(const c of ['Moto','Taxi','Voiture','Minicar'])assert.match(v,new RegExp('data-vehicule="'+c+'"[^>]*onclick="KokiTransport\\.categorie\\(\''+c+'\'\\)"'),c);
 assert.equal((v.match(/data-prix="/g)||[]).length,4);
 for(const id of ['transport-carte','transport-depart','transport-destination','transport-position','transport-demander','transport-chauffeurs','transport-course','transport-demo'])assert.ok(v.includes('id="'+id+'"'),id);
 assert.doesNotMatch(v,/🏍️|🚕|🚗|🚐/,'icônes dessinées, pas d’émojis');
});
test('Commander : connexion sur place, estimation serveur, chauffeur le plus proche puis confirmation',()=>{
 const app=fs.readFileSync('assets/transport/app.js','utf8'),rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
 assert.match(app,/if \(!await KB\.transportConnecte\(\)\) \{ KB\.ouvrirConnexion\('transport'\)/);
 assert.match(app,/await KB\.estimer\(cat, etat\.depart, etat\.destination\)/,'un prix serveur par catégorie');
 assert.match(app,/const chauffeurs = await KB\.chauffeursProches\(etat\.categorie, etat\.depart\)/);
 assert.match(app,/choisi: chauffeurs\[0\]/,'le plus proche présélectionné');
 assert.match(app,/await KB\.reserver\(q, etat\.reel\.choisi\.vehicle_id\)/,'réservation seulement après confirmation');
 assert.match(app,/Date\.parse\(q\.expires_at\) <= Date\.now\(\) \+ 15000\) q = await KB\.estimer/,'estimation périmée recalculée');
 assert.match(rt,/transportConnecte,estimer:estimerCourse,chauffeursProches:\(c,d\)=>api\.nearby\(c,d\),reserver:reserverCourse,ouvrirConnexion/);
 const t=rt.slice(rt.indexOf('async function transport('),rt.indexOf('\n',rt.indexOf('async function transport(')+300));
 assert.doesNotMatch(rt,/Estimer le trajet et rechercher les chauffeurs/,'ancien formulaire retiré');
 assert.match(rt,/node\('h3','Mes courses et historique'\)/,'suivi conservé');
});
