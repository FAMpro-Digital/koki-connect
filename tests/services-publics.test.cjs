// Services publics : contrat commun, horaires, démarches, avis officiels, rubrique branchée.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('../assets/portail/service-contract.js');const S=globalThis.KokiServiceContract;
const EMPREINTE='fa8a147fbb88c4befd32fca49a6f01a14d35128ba6290681a955b185900a5634';
const ligne=(categorie,v,extra={})=>({type:'Informations utiles',categorie,titre:'X',statut:'publié',texte:JSON.stringify(v),...extra});
test('contrat Services publics : identique dans l’administration',()=>{assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/portail/service-contract.js')).digest('hex'),EMPREINTE);});
test('fiche service : horaires, ouvert maintenant, validations',()=>{
 const v=JSON.parse(S.encodeService({genre:'Mairie',telephone:'33 967 00 00',plages:[{jours:[0,1,2,3,4],de:'08:00',a:'17:00'}],services:'État civil, Légalisation',latitude:'15,5',longitude:'-16'}));
 assert.deepEqual(v.services,['État civil','Légalisation']);assert.equal(v.latitude,15.5);
 assert.equal(S.horairesTexte(v),'Lun–Ven 08h00–17h00');
 assert.equal(S.ouvert(v,new Date('2026-10-15T10:00:00Z')),true);assert.equal(S.ouvert(v,new Date('2026-10-17T10:00:00Z')),false);assert.equal(S.ouvert(v,new Date('2026-10-15T18:00:00Z')),false);
 assert.equal(S.ouvert(JSON.parse(S.encodeService({genre:'Poste'})),new Date()),null,'sans horaires : jamais deviné');
 assert.equal(S.ouvert(JSON.parse(S.encodeService({genre:'Gendarmerie',h24:true})),new Date()),true);
 assert.ok(S.decodeService(ligne('Services publics',v)));assert.equal(S.decodeService(ligne('Santé',v)),null);
 assert.throws(()=>S.encodeService({genre:'Inventé'}),/type de service/);assert.throws(()=>S.encodeService({genre:'Mairie',telephone:'abc'}),/téléphone/);
 assert.throws(()=>S.encodeService({genre:'Mairie',plages:[{jours:[],de:'08:00',a:'17:00'}]}),/Horaires/);
});
test('démarche : pièces et étapes ligne par ligne, lien vers un service, avis officiels',()=>{
 const d=JSON.parse(S.encodeDemarche({domaine:'État civil',pieces:'Numéro de l’acte\r\n\nPièce d’identité',etapes:'Aller à la mairie',cout:'Selon tarif affiché',service:'00000000-0000-4000-8000-000000000001'}));
 assert.deepEqual(d.pieces,['Numéro de l’acte','Pièce d’identité']);assert.ok(S.decodeDemarche(ligne('Démarches administratives',d)));
 assert.throws(()=>S.encodeDemarche({domaine:'État civil',service:'pas-un-id'}),/invalide/);assert.throws(()=>S.encodeDemarche({domaine:'?'}),/domaine/);
 assert.equal(S.avis({type:'Annonces',categorie:'Avis important'}),true);assert.equal(S.avis({type:'Annonces',categorie:'Communiqué'}),true);
 assert.equal(S.avis({type:'Annonces',categorie:'Petite annonce'}),false);assert.equal(S.avis({type:'Actualités',categorie:'Services publics',texte:''}),true);
 assert.equal(S.avis(ligne('Services publics',JSON.parse(S.encodeService({genre:'Mairie'})))),false,'une fiche n’est pas un avis');
});
test('application : rubrique dédiée, fiches hors de l’accueil, carte et recherche',()=>{
 const html=require('./_aide.cjs').accueil(),app=fs.readFileSync('assets/portail/app.js','utf8'),sp=fs.readFileSync('assets/portail/services-publics.js','utf8');
 assert.match(html,/<script defer src="assets\/portail\/service-contract\.js"><\/script>\s*<script defer src="assets\/portail\/services-publics\.js"><\/script>/);
 assert.equal((html.match(/KokiServicesPublics\.ouvrir\(\)/g)||[]).length,3);
 assert.match(html,/categorie: 'Services publics', latitude: v\.latitude/);
 assert.match(app,/KokiServiceContract\.decodeService\(x\)\|\|KokiServiceContract\.decodeDemarche\(x\)\)\)return true;return false;\}/);
 assert.match(app,/KokiServicesPublics\.detail\(x\);return;\}/);assert.match(app,/'📄 Démarche'/);
 assert.doesNotMatch(sp,/innerHTML/);assert.match(sp,/le service concerné fait foi/);
});
