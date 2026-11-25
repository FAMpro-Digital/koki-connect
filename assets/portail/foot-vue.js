// Module Football — couche de présentation (sans DOM) : textes et regroupements prêts à afficher pour la page
// Sport et la carte « Match en direct » de l'Accueil. PRÉPARATION : pas encore branchée sur les pages.
// Entrées : réponses de public.koki_foot_public (accueil, match, classement, sources).
(function(root){'use strict';
const TZ='Africa/Dakar';
const EN_JEU=['En direct','Mi-temps','Prolongations','Tirs au but','Interrompu'];
const PERIODES={mi_temps_1:'1re mi-temps',mi_temps_2:'2e mi-temps',prolongation_1:'1re prolongation',prolongation_2:'2e prolongation',tirs_au_but:'Tirs au but'};
const ORDRE_PERIODES=Object.keys(PERIODES);
const ORDRE_PORTEE={Koki:0,'Sénégal':1,International:2};
const FOURNISSEURS={'api-football':'API-Football',sportmonks:'Sportmonks'};
const TYPES={but:'⚽ But',but_csc:'⚽ But contre son camp',penalty:'⚽ Penalty',penalty_manque:'❌ Penalty manqué',carton_jaune:'🟨 Carton jaune',carton_rouge:'🟥 Carton rouge',
 remplacement:'🔁 Remplacement',tab_reussi:'✅ Tir au but réussi',tab_manque:'❌ Tir au but manqué'};

const enJeu=m=>EN_JEU.includes(m?.statut);
const aScore=m=>Number.isInteger(m?.score_domicile)&&Number.isInteger(m?.score_exterieur);
// Minute affichée : 67' ; temps additionnel séparé : 90+3'.
function minute(min,add){if(!Number.isInteger(min))return '';return min+(Number.isInteger(add)&&add>0?'+'+add:'')+'’';}
// Score du match (réglementaire + prolongation) ; tirs au but à part, jamais additionnés.
function score(m){
 if(!aScore(m))return {principal:'',detail:''};
 const pro=Number.isInteger(m.pro_domicile)&&Number.isInteger(m.pro_exterieur);
 const d=m.score_domicile+(pro?m.pro_domicile:0),e=m.score_exterieur+(pro?m.pro_exterieur:0);
 const det=[];if(pro)det.push('a.p.');
 if(Number.isInteger(m.tab_domicile)&&Number.isInteger(m.tab_exterieur))det.push('t.a.b. '+m.tab_domicile+'–'+m.tab_exterieur);
 return {principal:d+' – '+e,detail:det.join(' · ')};
}
// Vainqueur : score total, puis tirs au but ; forfait : l'autre équipe.
function vainqueur(m){
 if(m?.statut!=='Terminé'||!aScore(m))return null;
 if(m.forfait_equipe_id)return m.forfait_equipe_id===m.domicile?.id?m.exterieur?.id:m.domicile?.id;
 const pro=Number.isInteger(m.pro_domicile);const d=m.score_domicile+(pro?m.pro_domicile:0),e=m.score_exterieur+(pro?m.pro_exterieur:0);
 if(d!==e)return d>e?m.domicile?.id:m.exterieur?.id;
 if(Number.isInteger(m.tab_domicile)&&m.tab_domicile!==m.tab_exterieur)return m.tab_domicile>m.tab_exterieur?m.domicile?.id:m.exterieur?.id;
 return null;
}
function statut(m){
 if(!m)return '';
 if(m.statut==='En direct'||m.statut==='Prolongations')return (m.statut==='Prolongations'?'Prolongations · ':'')+(minute(m.minute)||'En direct');
 if(m.statut==='Terminé'&&m.forfait_equipe_id)return 'Terminé · forfait';
 return m.statut;
}
const formatHeure=new Intl.DateTimeFormat('fr-FR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const formatJour=new Intl.DateTimeFormat('fr-FR',{timeZone:TZ,weekday:'long',day:'numeric',month:'long'});
const formatCle=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
const heure=iso=>formatHeure.format(new Date(iso));
function jour(iso){const t=formatJour.format(new Date(iso));return t.charAt(0).toUpperCase()+t.slice(1);}
// Regroupement par jour À KOKI (pas celui de l'appareil).
function parJour(matchs){const g=new Map();for(const m of [...matchs].sort((a,b)=>Date.parse(a.date_match)-Date.parse(b.date_match))){const k=formatCle.format(new Date(m.date_match));
 if(!g.has(k))g.set(k,{cle:k,titre:jour(m.date_match),matchs:[]});g.get(k).matchs.push(m);}return [...g.values()];}

function ilYA(iso,maintenant){const s=Math.max(0,Math.round((maintenant-Date.parse(iso))/1000));if(s<60)return 'à l’instant';const mi=Math.round(s/60);if(mi<60)return 'il y a '+mi+' min';
 const h=Math.round(mi/60);if(h<24)return 'il y a '+h+' h';const j=Math.round(h/24);return j===1?'hier':'il y a '+j+' jours';}
// Fraîcheur : texte, niveau (normal | attention) et source, pour l'indicateur sous le score.
function fraicheur(m,maintenant=Date.now()){
 const f=m?.fraicheur||{};
 if(f.etat==='manuel'||m?.source==='manuel')return {niveau:'normal',texte:'Résultat saisi par Koki Connect',source:'Koki Connect'};
 const source=FOURNISSEURS[f.fournisseur]||'Fournisseur';
 if(f.etat==='corrige')return {niveau:'normal',texte:'Résultat vérifié et corrigé par Koki Connect',source:'Koki Connect · '+source};
 const quand=f.derniere_actualisation?'Actualisé '+ilYA(f.derniere_actualisation,maintenant):'Pas encore actualisé';
 if(f.etat==='ancien'||f.etat_source==='hors_service'||f.etat_source==='en_pause')
  return {niveau:'attention',texte:quand+' · données possiblement anciennes',source};
 return {niveau:'normal',texte:quand,source};
}
// Événements groupés par période, dans l'ordre du match.
function evenements(match){
 const par=new Map(ORDRE_PERIODES.map(p=>[p,[]]));
 for(const e of match?.evenements||[])if(par.has(e.periode))par.get(e.periode).push(e);
 return ORDRE_PERIODES.filter(p=>par.get(p).length).map(p=>({periode:p,titre:PERIODES[p],evenements:par.get(p).map(e=>({...e,
  libelle:TYPES[e.type]||e.type,minute:minute(e.minute,e.minute_add),cote:e.equipe_id===match.domicile?.id?'domicile':e.equipe_id===match.exterieur?.id?'exterieur':''}))}));
}
// Carte « Match en direct » de l'Accueil : 2 matchs en jeu au plus (Koki, puis Sénégal, puis International).
function carteAccueil(accueil){
 const direct=[...(accueil?.direct||[])].filter(enJeu).sort((a,b)=>(ORDRE_PORTEE[a.competition?.portee]??9)-(ORDRE_PORTEE[b.competition?.portee]??9)||Date.parse(a.date_match)-Date.parse(b.date_match));
 return {visible:direct.length>0,matchs:direct.slice(0,2),autres:Math.max(0,direct.length-2)};
}
function filtrer(accueil,portee){if(!portee)return accueil;const f=xs=>(xs||[]).filter(m=>m.competition?.portee===portee);
 return {...accueil,direct:f(accueil?.direct),a_venir:f(accueil?.a_venir),resultats:f(accueil?.resultats)};}

const api=Object.freeze({PERIODES,EN_JEU,minute,score,vainqueur,statut,heure,jour,parJour,fraicheur,evenements,carteAccueil,filtrer,enJeu});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KokiFootVue=api;
})(typeof globalThis!=='undefined'?globalThis:this);
