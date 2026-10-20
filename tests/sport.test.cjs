// Sports & ASC : contrat commun (équipes, matchs), classement calculé, rubrique branchée, accueil sans fiches.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('../assets/portail/sport-contract.js');const S=globalThis.KokiSportContract;
const EMPREINTE='3cb5bae2c82cdcccf115f26093110e4566b38028f659c5fa0a136b7d56f1022f';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const row=(categorie,texte)=>({type:'Sports & ASC',categorie,titre:'x',texte});
const m=(d,e,sd,se,statut='Terminé',date='2026-10-01',extra={})=>({...JSON.parse(S.encodeMatch({competition:'Navétanes 2026',poule:'A',domicile:d,exterieur:e,statut,score_domicile:sd,score_exterieur:se,...extra})),date});
test('contrat Sports : identique dans l’administration',()=>{assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/portail/sport-contract.js')).digest('hex'),EMPREINTE);});
test('équipe : couleurs, joueurs saisis une ligne par joueur, refus',()=>{
 const v=S.decodeEquipe(row('Équipe',S.encodeEquipe({quartier:'Koki Guy',couleurs:['#087A3D','#f28c28'],joueurs:'10 - Moussa Diop - Attaquant\nIbrahima Fall'})));
 assert.deepEqual(v.couleurs,['#087a3d','#f28c28']);assert.deepEqual(v.joueurs,[{numero:10,nom:'Moussa Diop',poste:'Attaquant'},{numero:null,nom:'Ibrahima Fall',poste:''}]);
 assert.throws(()=>S.encodeEquipe({telephone:'abc'}),/Téléphone/);assert.throws(()=>S.encodeEquipe({joueurs:[{numero:120,nom:'X',poste:''}]}),/joueurs/i);assert.throws(()=>S.encodeEquipe({joueurs:Array.from({length:61},(_,i)=>'Joueur '+i).join('\n')}),/60 joueurs/);
 assert.equal(S.decodeEquipe({...row('Équipe','{}')}),null);assert.equal(S.decodeEquipe(row('Match',S.encodeEquipe({}))),null);
});
test('match : équipes distinctes, score obligatoire si terminé, direct à 0-0 par défaut',()=>{
 assert.throws(()=>S.encodeMatch({competition:'N',domicile:A,exterieur:A}),/elle-même/);
 assert.throws(()=>S.encodeMatch({competition:'N',domicile:A,exterieur:B,statut:'Terminé'}),/Score requis/);
 assert.throws(()=>S.encodeMatch({domicile:A,exterieur:B}),/compétition/);
 const d=JSON.parse(S.encodeMatch({competition:'N',domicile:A,exterieur:B,statut:'En direct'}));assert.deepEqual([d.score_domicile,d.score_exterieur],[0,0]);
 const v=JSON.parse(S.encodeMatch({competition:'N',domicile:A,exterieur:B,statut:'À venir',score_domicile:'',score_exterieur:''}));assert.equal(v.score_domicile,null);
});
test('classement : 3/1/0, départage différence puis buts, matchs non terminés ignorés, poule respectée',()=>{
 const eq=new Map([[A,{nom:'ASC Jamm'}],[B,{nom:'ASC Diappo'}],[C,{nom:'ASC Bokk'}]]);
 const ms=[m(A,B,2,1),m(B,C,0,0),m(C,A,1,3),m(A,C,'','','À venir'),m(B,C,5,0,'Terminé','2026-10-02',{poule:'B'})];
 const r=S.classement(ms,eq,{competition:'Navétanes 2026',poule:'A'});
 assert.deepEqual(r.map(x=>[x.nom,x.j,x.pts,x.diff]),[['ASC Jamm',2,6,3],['ASC Diappo',2,1,-1],['ASC Bokk',2,1,-2]]);
 assert.deepEqual(S.competitions(ms),[{nom:'Navétanes 2026',poules:['A','B']}]);assert.equal(S.initiales('ASC Jamm Bokk'),'JB');
});
test('rubrique branchée : Sports moderne, fiches hors accueil, recherche et détail',()=>{
 const html=require('./_aide.cjs').accueil(),app=fs.readFileSync('assets/portail/app.js','utf8'),sp=fs.readFileSync('assets/portail/sport.js','utf8'),css=fs.readFileSync('assets/portail/sport.css','utf8');
 assert.ok(html.indexOf('assets/portail/sport.js')>html.indexOf('assets/portail/sport-contract.js')&&html.indexOf('assets/portail/sport-contract.js')>html.indexOf('assets/portail/app.js"'));
 assert.match(html,/<link rel="stylesheet" href="assets\/portail\/sport\.css" media="print" data-differe>/);
 assert.match(app,/async function liste\(type\)\{if\(type==='Sports & ASC'&&window\.KokiSport\)\{KokiSport\.accueil\(\);return;\}/);
 assert.match(app,/function fiche\(x\)\{if\(x\.type==='Sports & ASC'&&window\.KokiSportContract\)return !!\(KokiSportContract\.decodeEquipe\(x\)\|\|KokiSportContract\.decodeMatch\(x\)\);/);
 assert.match(app,/if\(KokiSportContract\.decodeMatch\(x\)\)\{KokiSport\.match\(x\.id\);return;\}/);
 assert.match(sp,/window\.KokiSport=Object\.freeze\(\{accueil,equipe,match\}\)/);assert.doesNotMatch(sp,/innerHTML/);
 assert.match(css,/--sp-vert-fonce: #0b5a3c; --sp-vert: #087a3d; --sp-orange: #f28c28;/);
});
