// Activité : tout ce que l'utilisateur suit au même endroit — course en cours, commandes, demandes de service,
// livres téléchargés, favoris et notifications. Données du serveur pour le compte connecté ; le reste reste sur l'appareil.
(function(){'use strict';
const TITRE='Activité',$=id=>document.getElementById(id);
const ACTIVES=['En attente','Acceptée','Chauffeur en route','Course en cours'];
const EN_COURS_COMMERCE=['Commande reçue','Confirmée','En préparation','Prête','En livraison','Demande envoyée','Devis accepté','En cours'];
let generation=0;
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
const date=d=>new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Dakar'});
function lireFavoris(){try{const x=JSON.parse(localStorage.getItem('koki.portail.favoris')||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
function section(titre,action){const s=n('section',undefined,'act-section');const t=n('div',undefined,'act-tete');t.append(n('h3',titre));if(action)t.append(action);s.append(t);return s;}
function ligne(icone,titre,detail,statut,fn,chaud){const l=b('',fn,'act-ligne'+(chaud?' act-chaud':''));l.append(n('span',icone,'act-icone'));const t=n('span',undefined,'act-texte');t.append(n('strong',titre),n('span',detail,'act-detail'));l.append(t);if(statut)l.append(n('span',statut,'act-statut'+(chaud?' act-statut-chaud':'')));return l;}
function raccourci(icone,titre,info,fn){const c=b('',fn,'act-raccourci');c.append(n('span',icone,'act-raccourci-icone'),n('strong',titre),n('span',info,'act-detail'));return c;}

async function ouvrir(){
 const g=++generation,box=KokiPortail.ouvrir(TITRE);
 // Raccourcis toujours disponibles, même sans connexion : livres, favoris, notifications.
 const livres=window.KokiLivresHorsLigne?KokiLivresHorsLigne.liste().length:0,favoris=lireFavoris().length,notifs=document.querySelectorAll('#portail-notifications > article').length;
 const grille=n('div',undefined,'act-raccourcis');
 grille.append(raccourci('📥','Mes livres',livres?livres+' hors ligne':'Lire sans internet',()=>window.KokiBibliotheque?KokiBibliotheque.mesLivres():KokiPortail.education()),
  raccourci('♡','Favoris',favoris?favoris+' enregistré'+(favoris>1?'s':''):'Aucun pour l’instant',()=>KokiPortail.favoris()),
  raccourci('🔔','Notifications',notifs?notifs+' cette semaine':'Vous êtes à jour',()=>window.afficherNotifications&&afficherNotifications()));
 const suivi=n('div',undefined,'act-suivi');suivi.append(n('p','Chargement de vos courses et commandes…','portail-meta'));
 box.append(suivi,grille);
 let a=null;try{a=window.KokiBusiness?.activite?await KokiBusiness.activite():null;}catch{a=null;}
 if(g!==generation||$('portail-titre').textContent!==TITRE)return;suivi.replaceChildren();
 if(!a){suivi.append(n('p','Le suivi des courses et des commandes est indisponible pour le moment. Vos livres et favoris restent accessibles ci-dessous.','portail-note'));return;}
 if(!a.connecte){const c=n('div',undefined,'act-connexion');c.append(n('strong','Suivez vos courses et vos commandes'),n('span','Connectez-vous pour retrouver ici votre course en cours, vos commandes et vos demandes de service.'),b('Se connecter',()=>KokiPortail.profil(),'act-bouton'));suivi.append(c);return;}
 // En cours : la course active d'abord (code de départ, chauffeur), puis commandes et demandes non terminées.
 const course=a.courses.find(r=>ACTIVES.includes(r.statut));
 const encours=[...a.commandes,...a.demandes].filter(r=>EN_COURS_COMMERCE.includes(r.statut));
 if(course||encours.length){const s=section('⏳ En cours');
  if(course)s.append(ligne('🚕','Course '+(course.payload?.categorie||''),course.statut==='En attente'?'Recherche d’un chauffeur…':'Touchez pour suivre le chauffeur et voir votre code',course.statut,()=>window.afficherTransport&&afficherTransport(),true));
  for(const r of encours.slice(0,5))s.append(ligne(a.commandes.includes(r)?'🛍️':'🛠️',r.payload?.nom||'Commande',(r.payload?.total!=null?r.payload.total+' FCFA · ':'')+date(r.created_at),r.statut,()=>window.afficherCommerce&&afficherCommerce()));
  suivi.append(s);}
 const histo=[...a.courses.map(r=>['🚕','Course '+(r.payload?.categorie||''),r]),...a.commandes.map(r=>['🛍️',r.payload?.nom||'Commande',r]),...a.demandes.map(r=>['🛠️',r.payload?.nom||'Demande de service',r])]
  .filter(([, ,r])=>r!==course&&!encours.includes(r)).sort((x,y)=>String(y[2].created_at).localeCompare(String(x[2].created_at)));
 const s=section('🧾 Historique');
 if(histo.length)for(const [i,t,r] of histo.slice(0,10))s.append(ligne(i,t,(r.payload?.total!=null?r.payload.total+' FCFA · ':r.payload?.fare_fcfa!=null?r.payload.fare_fcfa+' FCFA · ':'')+date(r.created_at),r.statut,()=>i==='🚕'?afficherTransport():afficherCommerce()));
 else s.append(n('p','Aucune course ni commande pour le moment. Réservez un trajet dans Transport ou commandez dans la Boutique.','portail-meta'));
 const liens=n('div',undefined,'act-liens');liens.append(b('🚕 Réserver une course',()=>afficherTransport(),'act-bouton'),b('🛍️ Aller à la boutique',()=>afficherCommerce(),'act-bouton act-bouton-clair'));s.append(liens);
 suivi.append(s);
}
window.KokiActivite=Object.freeze({ouvrir});
})();
