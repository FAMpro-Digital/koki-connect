// Emplois & Opportunités : contrat commun, échéances, retrait des offres expirées, page unique.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('../assets/portail/offre-contract.js');const O=globalThis.KokiOffreContract;
const EMPREINTE='17b9863718b08fba9305f1c99155bbd1a242535f77e0cd338269735c9650524c';
const now=new Date('2026-10-15T10:00:00Z');
test('contrat Offre : identique dans l’administration',()=>{assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/portail/offre-contract.js')).digest('hex'),EMPREINTE);});
test('échéances : dernier jour, plus que n jours, date, expirée ; familles du contrat Rubriques',()=>{
 const v=d=>JSON.parse(O.encode({date_limite:d}));
 assert.deepEqual([O.echeance(v('2026-10-15'),now).texte,O.echeance(v('2026-10-16'),now).texte,O.echeance(v('2026-10-18'),now).texte],['Dernier jour','Plus qu’1 jour','Plus que 3 jours']);
 assert.match(O.echeance(v('2026-11-30'),now).texte,/^Jusqu’au 30 novembre$/);assert.equal(O.expiree(v('2026-10-14'),now),true);assert.equal(O.expiree(v('2026-10-15'),now),false);
 assert.equal(O.echeance(v(''),now),null);assert.equal(O.famille('Appel à projets').nom,'Financements');
 require('../assets/portail/rubriques-contract.js');const R=globalThis.KokiRubriquesContract;
 assert.deepEqual(O.familles.map(f=>[f.nom,[...f.categories]]),R.sousRubriques['Opportunités'].map(s=>[s.nom,[...s.categories]]));
 assert.throws(()=>O.encode({contrat:'Inventé'}),/contrat/);assert.throws(()=>O.encode({date_limite:'15/10/2026'}),/Date limite/);
 assert.equal(O.decode({type:'Opportunités',texte:'Texte libre'}),null,'anciennes offres : texte libre accepté sans fiche');
});
test('application : une seule page, offres expirées ou archivées retirées partout',()=>{
 const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('assets/portail/app.js','utf8'),op=fs.readFileSync('assets/portail/opportunites.js','utf8');
 assert.match(app,/function offreFermee\(x\)\{if\(x\.type!=='Opportunités'\|\|!window\.KokiOffreContract\)return false;const v=KokiOffreContract\.decode\(x\);return !!v&&\(v\.archive\|\|KokiOffreContract\.expiree\(v\)\);\}/);
 assert.match(app,/function visibles\(\)\{return C\.trier\(contenus\.filter\(x=>C\.visible\(x\)&&!offreFermee\(x\)\)\);\}/);
 assert.match(app,/if\(type==='Opportunités'&&window\.KokiOpportunites\)\{KokiOpportunites\.ouvrir\('Toutes'\);return;\}/);
 assert.match(html,/function afficherOpportunites\(\) \{\n  if \(window\.KokiOpportunites\) \{ KokiOpportunites\.ouvrir\('Toutes'\); return; \}/);
 assert.match(html,/<span>💼 Emplois &amp; Opportunités<\/span>/);
 assert.match(op,/filter\(\(\{v\}\)=>!v\|\|\(!v\.archive&&!O\.expiree\(v,now\)\)\)/);assert.doesNotMatch(op,/innerHTML/);
});
