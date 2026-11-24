'use strict';
// Module Football — intégration : réponses RÉELLES du serveur (tests/fixtures/foot, produites sur la base locale
// par koki-connect-admin/supabase/historique/outils/fixtures-foot.sh) → foot-direct.js → foot-vue.js.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const V=require('../assets/portail/foot-vue.js'),D=require('../assets/portail/foot-direct.js');
const F=n=>JSON.parse(fs.readFileSync('tests/fixtures/foot/'+n+'.json','utf8'));
const accueil=F('accueil'),maintenant=Date.parse(accueil.maintenant);

test('contrat serveur : champs attendus par l’interface présents',()=>{
 for(const m of [...accueil.direct,...accueil.a_venir,...accueil.resultats]){
  for(const k of ['id','revision','statut','minute','score_domicile','score_exterieur','pro_domicile','pro_exterieur','tab_domicile','tab_exterieur','date_match','fraicheur','competition','domicile','exterieur'])assert.ok(k in m,k);
  assert.ok(['manuel','a_jour','corrige','ancien'].includes(m.fraicheur.etat));
 }
 for(const e of F('match-direct').evenements)assert.ok(Object.keys(V.PERIODES).includes(e.periode));
});

test('score : réglementaire + prolongation, tirs au but à part',()=>{
 const m=F('match-tab');
 assert.deepEqual(V.score(m),{principal:'2 – 2',detail:'a.p. · t.a.b. 4–3'});
 assert.equal(V.vainqueur(m),m.domicile.id,'vainqueur aux tirs au but');
});

test('forfait : statut et vainqueur',()=>{
 const m=F('match-forfait');
 assert.equal(V.statut(m),'Terminé · forfait');assert.equal(V.vainqueur(m),m.exterieur.id);
});

test('événements groupés par période ; minute et temps additionnel séparés',()=>{
 const m=F('match-direct'),g=V.evenements(m);
 assert.deepEqual(g.map(x=>x.titre),['1re mi-temps','2e mi-temps']);
 const carton=g[1].evenements[0];assert.equal(carton.minute,'90+3’');assert.equal(carton.cote,'exterieur');assert.match(carton.libelle,/Carton jaune/);
 assert.equal(g[0].evenements[0].cote,'domicile');
});

test('statut en direct avec minute',()=>{
 const m=accueil.direct.find(x=>x.source==='manuel');assert.equal(V.statut(m),'90’');
 assert.equal(V.statut({statut:'Mi-temps'}),'Mi-temps');assert.equal(V.statut({statut:'Prolongations',minute:105}),'Prolongations · 105’');
});

test('fraîcheur : saisie locale, source en panne signalée',()=>{
 const manuel=V.fraicheur(accueil.direct.find(x=>x.source==='manuel'),maintenant);
 assert.equal(manuel.niveau,'normal');assert.equal(manuel.source,'Koki Connect');
 const api=V.fraicheur(F('match-api'),maintenant);
 assert.equal(api.niveau,'attention');assert.match(api.texte,/il y a 12 min · données possiblement anciennes/);assert.equal(api.source,'API-Football');
 assert.equal(V.fraicheur({source:'api',fraicheur:{etat:'corrige',fournisseur:'api-football'}}).texte,'Résultat vérifié et corrigé par Koki Connect');
});

test('carte Accueil : Koki d’abord, 2 matchs au plus',()=>{
 const c=V.carteAccueil(accueil);
 assert.equal(c.visible,true);assert.deepEqual(c.matchs.map(m=>m.competition.portee),['Koki','Sénégal']);
 const trois=V.carteAccueil({direct:[...accueil.direct,{...accueil.direct[0],id:'x',competition:{portee:'International'}}]});
 assert.equal(trois.matchs.length,2);assert.equal(trois.autres,1);
 assert.equal(V.carteAccueil({direct:[]}).visible,false);
});

test('filtres de portée Koki / Sénégal / International',()=>{
 assert.ok(V.filtrer(accueil,'Sénégal').direct.every(m=>m.competition.portee==='Sénégal'));
 assert.equal(V.filtrer(accueil,'International').direct.length,0);
});

test('fuseau : heures et jours à Koki (Africa/Dakar), quel que soit l’appareil',()=>{
 assert.equal(V.heure('2026-12-05T18:00:00+01:00'),'17:00');
 assert.equal(V.heure('2026-12-05T23:30:00-05:00'),'04:30');
 const g=V.parJour([{date_match:'2026-12-05T23:30:00Z'},{date_match:'2026-12-06T00:10:00Z'},{date_match:'2026-12-05T10:00:00Z'}]);
 assert.deepEqual(g.map(x=>x.matchs.length),[2,1]);assert.match(g[0].titre,/^Samedi 5 décembre/);
 const avenir=accueil.a_venir[0];assert.equal(V.heure(avenir.date_match),'18:00');
});

test('classement réel : forfait compté, ordre par points',()=>{
 const c=F('classement');const pts=c.map(r=>r.points);assert.deepEqual(pts,[...pts].sort((a,b)=>b-a));
 const koki=c.find(r=>r.equipe.nom==='ASC Koki Ndiaye');assert.equal(koki.points,3);assert.equal(koki.gagnes,1);
});

test('sources publiques : aucun secret',()=>{
 for(const s of F('sources'))assert.deepEqual(Object.keys(s).sort(),['derniere_actualisation','etat','fournisseur']);
});

test('intégration temps réel : message Realtime appliqué sur l’état serveur, puis carte Accueil',async()=>{
 const canaux=[];const client={channel(nom){const c={ec:{},on(t,f,cb){this.ec[f.event]=cb;return this;},subscribe(cb){this.cb=cb;return this;},unsubscribe(){}};canaux.push(c);return c;}};
 const d=D.creer({client,rpc:async()=>accueil,planifier:()=>0,annuler:()=>{}});
 await d.demarrer(accueil);canaux[0].cb('SUBSCRIBED');
 const m=accueil.direct.find(x=>x.source==='manuel');
 canaux[0].ec.match({payload:{id:m.id,revision:m.revision+1,statut:'En direct',minute:91,score_domicile:2,score_exterieur:0}});
 const carte=V.carteAccueil({direct:d.matchs()});
 const vu=carte.matchs.find(x=>x.id===m.id);
 assert.equal(V.score(vu).principal,'2 – 0');assert.equal(V.statut(vu),'91’');assert.equal(vu.domicile.nom,m.domicile.nom);
 canaux[0].ec.match({payload:{id:m.id,revision:m.revision,statut:'En direct',minute:80,score_domicile:1,score_exterieur:0}});
 assert.equal(V.score(V.carteAccueil({direct:d.matchs()}).matchs.find(x=>x.id===m.id)).principal,'2 – 0','message ancien sans effet');
 d.arreter();
});

test('intégration désactivée par défaut : drapeau modules.football absent, module inerte sans lui',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/foot-vue\.js[\s\S]*foot-direct\.js[\s\S]*foot\.js/,'scripts chargés dans l’ordre');
 assert.notEqual(JSON.parse(fs.readFileSync('assets/business/config.json','utf8')).modules?.football,true,'module désactivé dans la configuration publiée');
 const src=fs.readFileSync('assets/portail/foot.js','utf8');
 assert.match(src,/flags\?\.modules\?\.football!==true\)return;/,'démarrage interrompu sans le drapeau');
 assert.doesNotMatch(src,/innerHTML|insertAdjacentHTML|outerHTML/,'aucun HTML injecté');
 assert.match(fs.readFileSync('assets/portail/sport.js','utf8'),/window\.KokiFoot\?\.visible\?\[\['Football'/,'onglet Football seulement si le module est visible');
});
