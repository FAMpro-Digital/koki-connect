// Rubriques coordonnées : l'accueil public et le menu de l'administration partagent le même contrat.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const R=require('../assets/portail/rubriques-contract.js'),FICHIER='assets/portail/rubriques-contract.js';
const html=require('./_aide.cjs').accueil(),app=fs.readFileSync('assets/portail/app.js','utf8');
// Empreinte du contrat : identique dans les deux dépôts (admin : src/rubriques-contract.js).
const EMPREINTE='f908848b1186e5ac8b497a903494b16204cd0b1049f005763cab564548c8d2a1';
test('contrat Rubriques : identique dans les deux dépôts',()=>{assert.equal(createHash('sha256').update(fs.readFileSync(FICHIER)).digest('hex'),EMPREINTE);});
test('accueil : les 8 raccourcis suivent le contrat (ordre, nom, icône, couleur)',()=>{
 const tuiles=[...html.matchAll(/<button type="button" class="raccourci" data-recherche="([^"]+)" style="background:(#[0-9a-f]{6})"[^>]*><span aria-hidden="true">([^<]+)<\/span><strong>([^<]+)<\/strong>/g)].map(m=>({nom:m[1],couleur:m[2],icone:m[3],titre:m[4]}));
 assert.equal(tuiles.length,8);
 assert.deepEqual(tuiles.map(t=>[t.nom,t.titre,t.icone,t.couleur]),R.rubriques.map(r=>[r.nom,r.nom,r.icone,r.couleur]));
});
test('accueil : blocs de publications avec les mêmes icônes',()=>{
 for(const p of R.publications.filter(x=>x.type&&x.type!=='Informations utiles'))assert.ok(html.includes('<h2>'+p.icone+' '+p.nom),p.nom);
 assert.ok(html.includes('<h2>ℹ️ Informations utiles de Koki</h2>'));
});
test('Opportunités jeunes : filtres, cartes et catégories conformes au contrat',()=>{
 const sous=R.sousRubriques['Opportunités'];
 const filtres=[...html.matchAll(/data-filtre="([^"]+)"/g)].map(m=>m[1]).filter(x=>x!=='Toutes');
 assert.deepEqual(filtres,sous.map(s=>s.nom));
 const cartes=[...html.matchAll(/data-rubrique="([^"]+)"><span>([^<]+)<\/span>/g)].map(m=>[m[1],m[2]]);
 assert.deepEqual(cartes,sous.map(s=>[s.nom,s.icone]));
 const m=/const rubriquesOpportunites=(\{[^;]+\});/.exec(app);assert.ok(m);
 const mapping=Function('return '+m[1])();assert.deepEqual(mapping,Object.fromEntries(sous.map(s=>[s.nom,[...s.categories]])));
});
test('Santé et Services publics : catégories de la carte présentes',()=>{
 for(const r of R.rubriques.filter(x=>x.lieux)){assert.ok(html.includes('<option>'+r.lieux+'</option>'),r.lieux);if(['Santé','Services publics'].includes(r.lieux))assert.ok(html.includes('KokiPortail.lieux('+r.lieux+')'));}
});
