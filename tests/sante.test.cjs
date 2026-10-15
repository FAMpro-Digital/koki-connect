const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const S=require('../assets/portail/sante-contract.js');
// Même empreinte que dans Koki Connect Admin (src/sante-contract.js).
const EMPREINTE='5c892278edc78b208fb5ca4b8618e96014b5de8d7b049b5374ae0732466867a6';
const base={genre:'Pharmacie',telephone:'+221 77 000 00 00',whatsapp:'',h24:false,plages:[{jours:[0,1,2,3,4,5],de:'08:00',a:'21:00'}],horaires_note:'',services:['Médicaments'],garde:true,garde_fin:'2026-10-17',latitude:null,longitude:null,description:'',archive:false};
const row=texte=>({id:'1',type:'Informations utiles',categorie:'Santé',titre:'Pharmacie',resume:'r',lieu:'Koki',statut:'publié',publication:'2026-10-01T00:00:00Z',texte});

test('contrat Santé : identique dans les deux dépôts',()=>{assert.equal(createHash('sha256').update(fs.readFileSync('assets/portail/sante-contract.js')).digest('hex'),EMPREINTE);});
test('Santé : ouvert maintenant (heure de Koki), garde et horaires',()=>{
 const v=S.decode(row(S.encode(base)));
 assert.equal(S.ouvert(v,new Date('2026-10-13T20:30:00Z')),true);assert.equal(S.ouvert(v,new Date('2026-10-13T21:30:00Z')),false);assert.equal(S.ouvert(v,new Date('2026-10-18T10:00:00Z')),false);
 assert.equal(S.enGarde(v,new Date('2026-10-17T23:00:00Z')),true);assert.equal(S.enGarde(v,new Date('2026-10-18T00:30:00Z')),false);
 assert.equal(S.horairesTexte(v),'Lun–Sam 08h00–21h00');assert.equal(S.famille(v.genre),'pharmacie');
});
test('Application : page Santé reliée à l’accueil',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(html.includes('assets/portail/sante-contract.js')&&html.includes('assets/portail/sante.js'));
 assert.equal((html.match(/KokiSante\.ouvrir\(\)/g)||[]).length,3,"tuile, informations utiles et menu");
 const app=fs.readFileSync('assets/portail/app.js','utf8');assert.match(app,/KokiSanteContract\.decode\(x\)/);assert.match(app,/window\.KokiPortail=\{ouvrir,detail,/);
 const page=fs.readFileSync('assets/portail/sante.js','utf8');for(const t of ['1515','tel:','Ouvert maintenant','Pharmacie de garde','Alertes et campagnes'])assert.ok(page.includes(t),t);
 assert.doesNotMatch(fs.readFileSync('assets/portail/style.css','utf8').match(/\/\* Rubrique Santé[\s\S]*/)[0],/(^|[;{])width:\s*\d{3,}px/m,'aucune largeur fixe : mise en page adaptative');
});
