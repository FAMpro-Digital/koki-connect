// Scores en direct du module Football : abonnement Supabase Realtime (Broadcast public « koki-foot »).
// Garanties :
//  * un message plus ancien que l'état affiché est ignoré (révision du match, strictement croissante) ;
//  * après une coupure, l'état est rechargé depuis le serveur (les messages manqués ne sont pas rejoués
//    par Broadcast) : reconnexion avec attente progressive 1, 2, 4… 30 s ;
//  * tant que le canal est coupé, les scores sont rechargés toutes les 30 s (secours) ; une fois
//    reconnecté, un contrôle de sécurité toutes les 2 min pendant les matchs en jeu ;
//  * aucune donnée personnelle : les messages ne portent qu'identifiant, révision, statut, minute, scores.
// Ce module ne touche pas au DOM : la page fournit `client` (supabase-js), `rpc` et `onChange`.
(function(root){'use strict';
const CANAL='koki-foot';
const EN_JEU=['En direct','Mi-temps','Prolongations','Tirs au but','Interrompu'];
const CHAMPS=['revision','statut','minute','score_domicile','score_exterieur','pro_domicile','pro_exterieur','tab_domicile','tab_exterieur','date_match'];
const ATTENTES=[1000,2000,4000,8000,16000,30000];
const SECOURS=30000,CONTROLE=120000;

function creer({client,rpc,onChange=()=>{},onEvenement=()=>{},onEtat=()=>{},planifier=setTimeout,annuler=clearTimeout}){
 if(!client||typeof client.channel!=='function')throw Error('Client Realtime requis');
 if(typeof rpc!=='function')throw Error('Lecture serveur requise');
 const matchs=new Map();
 let canal=null,etat='arrete',tentatives=0,minuterieReco=null,minuterieSecours=null,generation=0,actif=false,recharge=null;

 function changerEtat(e){if(etat!==e){etat=e;onEtat(e);}}
 function liste(){return [...matchs.values()];}
 // Fusion : seule une révision plus récente remplace l'état connu.
 function fusionner(m){
  if(!m||typeof m.id!=='string'||!Number.isInteger(m.revision))return false;
  const connu=matchs.get(m.id);
  if(connu&&connu.revision>=m.revision)return false;
  matchs.set(m.id,connu?{...connu,...m}:m);return true;
 }
 // Message « match » du serveur.
 function recevoirMatch(charge){
  if(!charge||typeof charge.id!=='string'||!Number.isInteger(charge.revision))return;
  const connu=matchs.get(charge.id);
  if(connu&&connu.revision>=charge.revision)return; // message ancien ou en double : ignoré
  if(charge.visible===false){if(matchs.delete(charge.id))onChange(liste());return;}
  if(!connu){programmerRecharge();return;} // match nouveau pour cet écran : détails (équipes…) à charger
  const maj={};for(const k of CHAMPS)if(k in charge)maj[k]=charge[k];
  matchs.set(charge.id,{...connu,...maj});onChange(liste());
 }
 function recevoirEvenement(charge){if(charge&&typeof charge.match_id==='string')onEvenement(charge.match_id,charge.revision);}

 // Rechargement complet (après reconnexion, au retour sur l'écran, en secours).
 async function recharger(){
  if(recharge)return recharge;
  const g=generation;
  recharge=(async()=>{try{
   const r=await rpc('accueil',{});if(g!==generation||!actif)return false;
   const vus=new Set();let change=false;
   for(const m of [...(r?.direct||[]),...(r?.a_venir||[]),...(r?.resultats||[])]){vus.add(m.id);if(fusionner(m))change=true;}
   // Matchs encore affichés mais absents de la réponse : état exact demandé (dépublié => absent).
   const restants=[...matchs.keys()].filter(id=>!vus.has(id)).slice(0,100);
   if(restants.length){const etats=await rpc('etat_matchs',{ids:restants});if(g!==generation||!actif)return false;
    const presents=new Set((etats||[]).map(m=>m.id));for(const id of restants)if(!presents.has(id)){matchs.delete(id);change=true;}
    for(const m of etats||[])if(fusionner(m))change=true;}
   if(change)onChange(liste());return true;
  }catch{return false;}finally{recharge=null;}})();
  return recharge;
 }
 let attenteRecharge=null;
 function programmerRecharge(){if(attenteRecharge)return;attenteRecharge=planifier(()=>{attenteRecharge=null;recharger();},300);}

 function secours(){
  annuler(minuterieSecours);if(!actif)return;
  const enJeu=liste().some(m=>EN_JEU.includes(m.statut));
  const delai=etat==='connecte'?(enJeu?CONTROLE:null):SECOURS;
  if(delai===null){minuterieSecours=null;return;}
  minuterieSecours=planifier(async()=>{await recharger();secours();},delai);
 }

 function abonner(){
  const g=++generation;
  if(canal){try{canal.unsubscribe();}catch{}}
  changerEtat(tentatives?'reconnexion':'connexion');
  canal=client.channel(CANAL,{config:{broadcast:{self:false}}})
   .on('broadcast',{event:'match'},({payload})=>{if(g===generation)recevoirMatch(payload);})
   .on('broadcast',{event:'evenement'},({payload})=>{if(g===generation)recevoirEvenement(payload);});
  canal.subscribe(statut=>{
   if(g!==generation||!actif)return;
   if(statut==='SUBSCRIBED'){
    const etaitCoupe=tentatives>0||etat==='deconnecte';tentatives=0;changerEtat('connecte');
    if(etaitCoupe)recharger(); // messages manqués pendant la coupure : état rechargé
    secours();
   }else if(statut==='CHANNEL_ERROR'||statut==='TIMED_OUT'||statut==='CLOSED'){
    changerEtat('deconnecte');secours();
    annuler(minuterieReco);
    const attente=ATTENTES[Math.min(tentatives,ATTENTES.length-1)];tentatives++;
    minuterieReco=planifier(()=>{if(actif)abonner();},attente);
   }
  });
 }

 return {
  // Premier affichage : état serveur, puis abonnement.
  async demarrer(initial){actif=true;if(initial)for(const m of [...(initial.direct||[]),...(initial.a_venir||[]),...(initial.resultats||[])])fusionner(m);
   if(!initial)await recharger();onChange(liste());abonner();},
  // Retour sur l'écran (onglet de nouveau visible, réseau revenu) : état rechargé.
  reveil(){if(actif)return recharger();},
  arreter(){actif=false;generation++;annuler(minuterieReco);annuler(minuterieSecours);annuler(attenteRecharge);attenteRecharge=null;if(canal){try{canal.unsubscribe();}catch{}}canal=null;changerEtat('arrete');},
  etat:()=>etat,
  matchs:liste,
  // Exposés pour les tests.
  _recevoirMatch:recevoirMatch,
 };
}
const api=Object.freeze({creer,CANAL,EN_JEU,ATTENTES});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KokiFootDirect=api;
})(typeof globalThis!=='undefined'?globalThis:this);
