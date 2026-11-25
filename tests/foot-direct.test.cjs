'use strict';
// Scores en direct (assets/portail/foot-direct.js) : révisions, reconnexion, récupération de l'état, secours.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const D=require('../assets/portail/foot-direct.js');

// Faux client Realtime (forme supabase-js) et fausses minuteries pilotées par le test.
function fauxClient(){
 const canaux=[];
 return {canaux,channel(nom,opts){const c={nom,opts,ecouteurs:{},statutCb:null,ferme:false,
  on(type,filtre,cb){this.ecouteurs[filtre.event]=cb;return this;},subscribe(cb){this.statutCb=cb;return this;},unsubscribe(){this.ferme=true;}};canaux.push(c);return c;}};
}
function horloge(){const q=[];let n=0;const o={t:0};return {q,o,maintenant:()=>o.t,planifier(fn,ms){const id=++n;q.push({id,fn,ms});return id;},annuler(id){const i=q.findIndex(x=>x.id===id);if(i>=0)q.splice(i,1);},
 async avancer(){const x=q.shift();if(x){o.t+=x.ms;await x.fn();}return x;}};}
const m=(id,revision,extra={})=>({id,revision,statut:'En direct',minute:10,score_domicile:0,score_exterieur:0,domicile:{nom:'A'},exterieur:{nom:'B'},...extra});
const attendre=()=>new Promise(r=>setImmediate(r));
// Exécute la minuterie de regroupement des signaux Realtime (et elle seule).
async function signaux(h){const t=h.q.find(x=>x.fn.toString().includes('traiterSignaux'));if(!t)return null;h.annuler(t.id);h.o.t+=t.ms;await t.fn();await attendre();return t;}

function monter(serveur){
 const client=fauxClient(),h=horloge(),vus=[],etats=[],appels=[];
 const rpc=async(cmd,input)=>{appels.push([cmd,input]);return serveur[cmd](input);};
 const d=D.creer({client,rpc,onChange:x=>vus.push(x),onEtat:e=>etats.push(e),planifier:h.planifier,annuler:h.annuler,maintenant:h.maintenant});
 return {d,client,h,vus,etats,appels};
}

test('canal public unique koki-foot, sans écho de ses propres messages',async()=>{
 const {d,client}=monter({accueil:()=>({direct:[m('a',1)]})});
 await d.demarrer();
 assert.equal(client.canaux.length,1);assert.equal(client.canaux[0].nom,'koki-foot');assert.equal(client.canaux[0].opts.config.broadcast.self,false);
});

test('canal privé : désactivé par défaut, activable par option (proposition 0700)',async()=>{
 const client=fauxClient(),h=horloge();
 const d=D.creer({client,rpc:async()=>({direct:[]}),planifier:h.planifier,annuler:h.annuler,maintenant:h.maintenant,prive:true});
 await d.demarrer();assert.equal(client.canaux[0].opts.config.private,true);
 const {client:c2}=monter({accueil:()=>({direct:[]})});const d2=D.creer({client:c2,rpc:async()=>({direct:[]})});await d2.demarrer();
 assert.equal(c2.canaux[0].opts.config.private,undefined);d.arreter();d2.arreter();
});

test('révisions : le score affiché vient du serveur ; messages anciens ou en double ignorés sans appel',async()=>{
 let srv=m('a',5);const {d,client,h,vus,appels}=monter({accueil:()=>({direct:[m('a',5)]}),etat_matchs:()=>[srv]});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');
 srv=m('a',6,{minute:20,score_domicile:1});
 c.ecouteurs.match({payload:{id:'a',revision:6,statut:'En direct',minute:20,score_domicile:1,score_exterieur:0}});
 assert.equal(d.matchs()[0].score_domicile,0,'rien n’est affiché avant la confirmation du serveur');
 await signaux(h);
 assert.equal(d.matchs()[0].score_domicile,1);assert.equal(d.matchs()[0].revision,6);
 const n=appels.length;
 c.ecouteurs.match({payload:{id:'a',revision:4,score_domicile:0}}); // ancien
 c.ecouteurs.match({payload:{id:'a',revision:6,score_domicile:9}}); // doublon
 assert.equal(await signaux(h),null,'aucune lecture serveur programmée');assert.equal(appels.length,n);
 srv=m('a',8,{statut:'Terminé',minute:null,score_domicile:2});const nv=vus.length;
 c.ecouteurs.match({payload:{id:'a',revision:8}});await signaux(h);
 assert.equal(vus.length,nv+1);assert.equal(d.matchs()[0].statut,'Terminé');assert.equal(d.matchs()[0].score_domicile,2);
 assert.equal(d.matchs()[0].domicile.nom,'A','les détails (équipes) restent ceux du serveur');
});

test('sécurité : un client non autorisé ne peut pas imposer un faux score (canal public)',async()=>{
 const {d,client,h,appels}=monter({accueil:()=>({direct:[m('a',5)]}),etat_matchs:()=>[m('a',5)]});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');
 c.ecouteurs.match({payload:{id:'a',revision:999999,statut:'Terminé',score_domicile:7,score_exterieur:0}});
 await signaux(h);
 assert.deepEqual(appels.at(-1),['etat_matchs',{ids:['a']}],'état réel demandé au serveur');
 assert.equal(d.matchs()[0].score_domicile,0);assert.equal(d.matchs()[0].revision,5,'révision locale non empoisonnée');
});

test('message ancien arrivé après un rechargement plus récent : ignoré sans appel',async()=>{
 const {d,client,h}=monter({accueil:()=>({direct:[m('a',10,{score_domicile:3})]})});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');
 c.ecouteurs.match({payload:{id:'a',revision:9,score_domicile:2,score_exterieur:0,statut:'En direct'}});
 assert.equal(await signaux(h),null);assert.equal(d.matchs()[0].score_domicile,3);
});

test('sécurité : la vraie mise à jour suivante n’est pas bloquée par une fausse révision',async()=>{
 let srv=m('a',5);const {d,client,h}=monter({accueil:()=>({direct:[m('a',5)]}),etat_matchs:()=>[srv]});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');
 c.ecouteurs.match({payload:{id:'a',revision:999999,score_domicile:7}});await signaux(h);
 srv=m('a',6,{score_domicile:1});c.ecouteurs.match({payload:{id:'a',revision:6}});await signaux(h);
 assert.equal(d.matchs()[0].score_domicile,1);assert.equal(d.matchs()[0].revision,6);
});

test('sécurité : fausse dépublication sans effet si le serveur confirme le match',async()=>{
 const {d,client,h}=monter({accueil:()=>({direct:[m('a',1),m('b',1)]}),etat_matchs:({ids})=>ids.map(id=>m(id,1))});
 await d.demarrer();client.canaux[0].statutCb('SUBSCRIBED');
 client.canaux[0].ecouteurs.match({payload:{id:'a',revision:2,visible:false}});await signaux(h);
 assert.deepEqual(d.matchs().map(x=>x.id),['a','b']);
});

test('sécurité : une avalanche de faux messages produit des lectures regroupées et espacées (≥ 2 s)',async()=>{
 const {d,client,h,appels}=monter({accueil:()=>({direct:[m('a',1),m('b',1)]}),etat_matchs:({ids})=>ids.map(id=>m(id,1))});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');const n=appels.length;
 const delais=[];
 for(let tour=0;tour<3;tour++){
  for(let i=0;i<500;i++)c.ecouteurs.match({payload:{id:i%2?'a':'b',revision:1000+i}});
  assert.equal(h.q.filter(x=>x.fn.toString().includes('traiterSignaux')).length,1,'une seule lecture programmée');
  delais.push((await signaux(h)).ms);
 }
 assert.equal(appels.length-n,3,'3 lectures pour 1 500 messages');
 assert.ok(delais.slice(1).every(ms=>ms>=D.INTERVALLE_MIN),'intervalle minimal respecté : '+delais);
});

test('dépublication : le match disparaît de l’écran (confirmée par le serveur)',async()=>{
 const {d,client,h}=monter({accueil:()=>({direct:[m('a',1),m('b',1)]}),etat_matchs:({ids})=>ids.filter(id=>id!=='a').map(id=>m(id,1))});
 await d.demarrer();client.canaux[0].statutCb('SUBSCRIBED');
 client.canaux[0].ecouteurs.match({payload:{id:'a',revision:2,visible:false}});await signaux(h);
 assert.deepEqual(d.matchs().map(x=>x.id),['b']);
});

test('match inconnu annoncé : rechargement unique (regroupé) pour obtenir équipes et compétition',async()=>{
 let appelsAccueil=0;const {d,client,h}=monter({accueil:()=>{appelsAccueil++;return {direct:[m('a',1),...(appelsAccueil>1?[m('z',3)]:[])]};}});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');
 c.ecouteurs.match({payload:{id:'z',revision:3,statut:'En direct'}});c.ecouteurs.match({payload:{id:'z',revision:3,statut:'En direct'}});
 const r=h.q.filter(x=>x.ms===300);assert.equal(r.length,1,'un seul rechargement programmé');
 await signaux(h);await attendre();
 assert.equal(appelsAccueil,2);assert.ok(d.matchs().some(x=>x.id==='z'));
});

test('reconnexion : attente progressive 1, 2, 4… 30 s, nouveau canal, ancien fermé',async()=>{
 const {d,client,h,etats}=monter({accueil:()=>({direct:[m('a',1)]})});
 await d.demarrer();client.canaux[0].statutCb('SUBSCRIBED');
 const attentes=[];
 for(let i=0;i<8;i++){const c=client.canaux.at(-1);c.statutCb(i%2?'TIMED_OUT':'CHANNEL_ERROR');
  const t=h.q.filter(x=>x.fn.toString().includes('abonner')).at(-1);attentes.push(t.ms);h.annuler(t.id);await t.fn();}
 assert.deepEqual(attentes,[1000,2000,4000,8000,16000,30000,30000,30000]);
 assert.ok(client.canaux.slice(0,-1).every(c=>c.ferme),'anciens canaux fermés');
 assert.ok(etats.includes('deconnecte')&&etats.includes('reconnexion'));
});

test('après reconnexion : l’état est rechargé (messages manqués pendant la coupure)',async()=>{
 let score=0;const {d,client,h,appels}=monter({accueil:()=>({direct:[m('a',1+score,{score_domicile:score})]}),etat_matchs:()=>[]});
 await d.demarrer();client.canaux[0].statutCb('SUBSCRIBED');
 client.canaux[0].statutCb('CLOSED');
 score=2; // pendant la coupure, deux buts (messages perdus)
 const t=h.q.find(x=>x.fn.toString().includes('abonner'));h.annuler(t.id);await t.fn();
 const n=appels.filter(a=>a[0]==='accueil').length;client.canaux.at(-1).statutCb('SUBSCRIBED');await attendre();await attendre();
 assert.equal(appels.filter(a=>a[0]==='accueil').length,n+1,'rechargement après reconnexion');
 assert.equal(d.matchs()[0].score_domicile,2);assert.equal(d.etat(),'connecte');
});

test('coupure : secours par rechargement toutes les 30 s ; connecté avec match en jeu : contrôle toutes les 2 min',async()=>{
 const {d,client,h}=monter({accueil:()=>({direct:[m('a',1)]}),etat_matchs:()=>[]});
 await d.demarrer();client.canaux[0].statutCb('SUBSCRIBED');
 assert.ok(h.q.some(x=>x.ms===120000),'contrôle de sécurité 2 min pendant un match en jeu');
 client.canaux[0].statutCb('CHANNEL_ERROR');
 assert.ok(h.q.some(x=>x.ms===30000&&!x.fn.toString().includes('abonner')),'secours 30 s pendant la coupure');
});

test('matchs affichés absents de l’accueil : état exact demandé, dépubliés retirés',async()=>{
 let tour=0;const {d,client,appels}=monter({accueil:()=>tour++===0?{direct:[m('a',1),m('b',1)]}:{direct:[m('a',1)]},etat_matchs:({ids})=>ids.includes('b')?[]:[]});
 await d.demarrer();client.canaux[0].statutCb('SUBSCRIBED');
 await d.reveil();
 assert.deepEqual(appels.find(a=>a[0]==='etat_matchs')[1],{ids:['b']});
 assert.deepEqual(d.matchs().map(x=>x.id),['a']);
});

test('serveur indisponible : pas de plantage, état conservé',async()=>{
 let panne=false;const {d,client}=monter({accueil:()=>{if(panne)throw Error('503');return {direct:[m('a',1)]};}});
 await d.demarrer();client.canaux[0].statutCb('SUBSCRIBED');panne=true;
 assert.equal(await d.reveil(),false);assert.equal(d.matchs().length,1);
});

test('arrêt : canal fermé, minuteries annulées, messages tardifs ignorés',async()=>{
 const {d,client,h}=monter({accueil:()=>({direct:[m('a',1)]})});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');d.arreter();
 assert.ok(c.ferme);assert.equal(h.q.length,0);assert.equal(d.etat(),'arrete');
 c.ecouteurs.match({payload:{id:'a',revision:9,score_domicile:5,score_exterieur:0}});assert.equal(d.matchs()[0].revision,1);assert.equal(h.q.length,0,'aucune lecture programmée après l’arrêt');
});

test('messages malformés ignorés',async()=>{
 const {d,client,h}=monter({accueil:()=>({direct:[m('a',1)]})});
 await d.demarrer();const c=client.canaux[0];c.statutCb('SUBSCRIBED');
 for(const p of [null,{},{id:'a'},{id:'a',revision:'9'},{id:5,revision:9}])c.ecouteurs.match({payload:p});
 assert.equal(d.matchs()[0].revision,1);assert.equal(await signaux(h),null);
});

test('CSP : connexion wss au projet Supabase autorisée, aucune autre origine ajoutée',()=>{
 const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 const csp=v.headers.flatMap(h=>h.headers).find(h=>h.key==='Content-Security-Policy').value;
 const connect=csp.split(';').map(s=>s.trim()).find(s=>s.startsWith('connect-src'));
 assert.match(connect,/wss:\/\/qsbmzzbiztfqysstepxm\.supabase\.co/);
 assert.doesNotMatch(connect,/wss:\/\/\*|\*\.supabase\.co/);
});

test('module sans donnée personnelle ni accès au DOM',()=>{
 const src=fs.readFileSync('assets/portail/foot-direct.js','utf8');
 assert.doesNotMatch(src,/document\.|innerHTML|localStorage|email|telephone/);
});
