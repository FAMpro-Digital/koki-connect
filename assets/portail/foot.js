// Module Football — page Sport (onglet « Football ») et carte « Match en direct » de l'Accueil.
// Inactif tant que assets/business/config.json › modules.football ne vaut pas true (même principe que les Académies).
// Lecture : public.koki_foot_public uniquement (clé publishable). Temps réel : foot-direct.js (Broadcast « koki-foot »).
// Affichage : textContent seulement (aucun HTML venu du serveur) ; pas de logo externe (CSP) : pastilles aux couleurs.
(function(){'use strict';
const V=window.KokiFootVue,D=window.KokiFootDirect;
const VUES=[['direct','● En direct'],['aujourdhui','Aujourd’hui'],['resultats','Résultats'],['calendrier','Calendrier'],['competitions','Compétitions'],['classements','Classements']];
const PORTEES=[['','Tout'],['Koki','Koki'],['Sénégal','Sénégal'],['International','International']];
const DELAI=10000;
const etat={visible:false,config:null,fabrique:null,direct:null,connexion:'arrete',accueil:null,vue:'direct',portee:'',competitions:null,choixComp:'',choixPoule:'',
 zone:null,detailId:null,generation:0,ecouteurs:new Set()};
const $=id=>document.getElementById(id);
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}

// ───── Accès serveur ─────
async function json(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error('Configuration indisponible');return r.json();}
async function rpc(command,input={}){
 const c=etat.config,ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),DELAI);
 try{const r=await fetch(c.url+'/rest/v1/rpc/koki_foot_public',{method:'POST',signal:ctrl.signal,headers:{apikey:c.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({command,input})});
  if(!r.ok)throw Error('Serveur indisponible ('+r.status+')');return await r.json();}
 catch(e){throw Error(e.name==='AbortError'?'Le serveur ne répond pas.':'Connexion indisponible.');}
 finally{clearTimeout(t);}
}
// Client Realtime : supabase-js déjà présent dans l'application (même fichier que l'espace pro), sinon chargé à la demande.
async function clientRealtime(){
 if(etat.fabrique)return etat.fabrique();
 if(!window.supabase)await new Promise((ok,ko)=>{const s=document.createElement('script');s.src='assets/business/vendor/supabase-2.117.3.js';s.onload=ok;s.onerror=()=>ko(Error('Temps réel indisponible'));document.head.append(s);});
 return window.supabase.createClient(etat.config.url,etat.config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'koki-foot-lecture'}});
}

// ───── Temps réel partagé (page Sport + Accueil) ─────
function notifier(){for(const f of etat.ecouteurs)try{f();}catch(_){}}
async function demarrerDirect(){
 if(etat.direct)return;
 let client=null;try{client=await clientRealtime();}catch(_){client=null;}
 const factice={channel:()=>{const c={on(){return c;},subscribe(cb){setTimeout(()=>cb('CHANNEL_ERROR'),0);return c;},unsubscribe(){}};return c;}};
 etat.direct=D.creer({client:client||factice,rpc,
  onChange:()=>{etat.accueil={...(etat.accueil||{}),direct:etat.direct.matchs().filter(V.enJeu)};notifier();},
  onEvenement:id=>{if(id===etat.detailId)detail(id,{silencieux:true});},
  onEtat:e=>{etat.connexion=e;notifier();}});
 try{etat.accueil=await rpc('accueil');}catch(_){etat.accueil=null;}
 await etat.direct.demarrer(etat.accueil||undefined);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)etat.direct?.reveil();});
 window.addEventListener('online',()=>etat.direct?.reveil());
}

// ───── Éléments communs ─────
function pastille(e){const p=n('span',undefined,'ft-pastille');const [c1,c2]=Array.isArray(e?.couleurs)&&e.couleurs.length?e.couleurs:['#087a3d'];
 p.style.background=c2?'linear-gradient(135deg,'+c1+' 0 55%,'+c2+' 55% 100%)':c1;
 const mots=String(e?.nom||'?').replace(/^(ASC|AS|US|FC|ES)\s+/i,'').trim().split(/\s+/);p.append(n('span',((mots[0]||'?')[0]+(mots[1]?.[0]||mots[0]?.[1]||'')).toUpperCase()));p.setAttribute('aria-hidden','true');return p;}
function ligneFraicheur(m){const f=V.fraicheur(m);const p=n('p',f.texte+' · '+f.source,'ft-fraicheur ft-fraicheur-'+f.niveau);if(f.niveau==='attention')p.prepend(n('span','⚠ ','ft-alerte'));return p;}
function carteMatch(m){
 const a=b('',()=>detail(m.id),'ft-match'+(V.enJeu(m)?' ft-match-direct':''));a.dataset.match=m.id;
 const s=V.score(m),fini=m.statut==='Terminé',gagne=V.vainqueur(m);
 const tete=n('span',undefined,'ft-match-tete');tete.append(n('span',[m.competition?.nom,m.journee].filter(Boolean).join(' · '),'ft-comp'),n('span',V.statut(m),'ft-statut ft-statut-'+(V.enJeu(m)?'direct':fini?'termine':'autre')));
 const equipe=(e,but)=>{const l=n('span',undefined,'ft-equipe'+(gagne&&gagne===e.id?' ft-gagne':''));l.append(pastille(e),n('span',e.nom,'ft-nom'),n('strong',but===null||but===undefined?'':String(but),'ft-but'));return l;};
 const pro=Number.isInteger(m.pro_domicile);
 a.append(tete,equipe(m.domicile,aTotal(m,'domicile',pro)),equipe(m.exterieur,aTotal(m,'exterieur',pro)));
 const pied=[V.enJeu(m)||fini?null:V.jour(m.date_match)+' · '+V.heure(m.date_match),s.detail||null,m.lieu?'📍 '+m.lieu:null].filter(Boolean).join(' · ');
 if(pied)a.append(n('span',pied,'ft-pied'));
 a.setAttribute('aria-label',m.domicile.nom+' contre '+m.exterieur.nom+(s.principal?', '+s.principal.replace(' – ',' à '):'')+', '+V.statut(m));
 const box=n('div',undefined,'ft-carte');box.append(a,ligneFraicheur(m));return box;
}
function aTotal(m,cote,pro){const r=m['score_'+cote];if(!Number.isInteger(r))return null;return r+(pro?m['pro_'+cote]:0);}
function vide(t){return n('p',t,'ft-vide');}
function chargement(){const p=n('p','Chargement…','ft-chargement');p.setAttribute('role','status');return p;}
function erreur(msg,reessayer){const box=n('div',undefined,'ft-erreur');box.setAttribute('role','alert');box.append(n('p',msg),b('Réessayer',reessayer,'ft-bouton'));return box;}
function bandeauConnexion(){if(etat.connexion==='deconnecte'||etat.connexion==='reconnexion'){const p=n('p','Temps réel interrompu : actualisation automatique toutes les 30 s.','ft-hors-ligne');p.setAttribute('role','status');return p;}return null;}

// ───── Vue de la page Sport (onglet Football) ─────
function vue(){
 const racine=n('section',undefined,'ft-racine');racine.setAttribute('aria-label','Football');etat.zone=racine;
 dessiner();demarrerDirect().then(()=>{if(etat.zone===racine)dessiner();});
 etat.ecouteurs.add(()=>{if(etat.zone===racine&&racine.isConnected&&['direct','aujourdhui','resultats'].includes(etat.vue))dessiner();});
 return racine;
}
function dessiner(){
 const racine=etat.zone;if(!racine)return;const g=++etat.generation;
 const nav=n('div',undefined,'ft-vues');nav.setAttribute('role','tablist');
 for(const [k,l] of VUES){const x=b(l,()=>{etat.vue=k;dessiner();},'ft-vue');x.setAttribute('role','tab');x.setAttribute('aria-selected',String(etat.vue===k));nav.append(x);}
 const filtres=n('div',undefined,'ft-filtres');filtres.setAttribute('aria-label','Portée');
 for(const [k,l] of PORTEES){const x=b(l,()=>{etat.portee=k;dessiner();},'ft-filtre');x.setAttribute('aria-pressed',String(etat.portee===k));filtres.append(x);}
 const contenu=n('div',undefined,'ft-contenu');
 racine.replaceChildren(nav,filtres,...[bandeauConnexion()].filter(Boolean),contenu);
 ({direct:vueDirect,aujourdhui:vueAujourdhui,resultats:vueResultats,calendrier:vueCalendrier,competitions:vueCompetitions,classements:vueClassements}[etat.vue])(contenu,g);
}
function liste(matchs,videTexte){if(!matchs.length)return [vide(videTexte)];const l=n('div',undefined,'ft-liste');l.append(...matchs.map(carteMatch));return [l];}
function accueilFiltre(){return V.filtrer(etat.accueil||{},etat.portee);}
function attendreAccueil(contenu,g,suite){
 if(etat.accueil){suite();return;}
 contenu.append(chargement());
 rpc('accueil').then(r=>{etat.accueil=r;if(g===etat.generation)dessiner();}).catch(e=>{if(g!==etat.generation)return;contenu.replaceChildren(erreur(e.message,dessiner));});
}
function vueDirect(contenu,g){attendreAccueil(contenu,g,()=>{const xs=(etat.direct?etat.direct.matchs():accueilFiltre().direct||[]).filter(V.enJeu).filter(m=>!etat.portee||m.competition?.portee===etat.portee);
 contenu.append(n('h3','● En direct','ft-titre ft-titre-direct'),...liste(xs,'Aucun match en cours. Consultez le programme du jour.'));
 if(!xs.length)contenu.append(b('Voir les matchs d’aujourd’hui',()=>{etat.vue='aujourdhui';dessiner();},'ft-bouton ft-bouton-clair'));});}
function vueAujourdhui(contenu,g){attendreAccueil(contenu,g,()=>{const a=accueilFiltre(),cle=V.parJour([{date_match:new Date().toISOString()}])[0].cle;
 const tous=[...(etat.direct?etat.direct.matchs().filter(m=>!etat.portee||m.competition?.portee===etat.portee):a.direct||[]),...(a.a_venir||[]),...(a.resultats||[])];
 const vus=new Set(),xs=tous.filter(m=>!vus.has(m.id)&&vus.add(m.id)&&V.parJour([m])[0].cle===cle).sort((x,y)=>Date.parse(x.date_match)-Date.parse(y.date_match));
 contenu.append(n('h3','Aujourd’hui à Koki : '+V.jour(new Date().toISOString()),'ft-titre'),...liste(xs,'Aucun match aujourd’hui.'));});}
function vueResultats(contenu,g){attendreAccueil(contenu,g,()=>{const xs=accueilFiltre().resultats||[];contenu.append(n('h3','✅ Résultats des 7 derniers jours','ft-titre'),...liste(xs,'Aucun résultat récent.'));});}
async function competitions(){if(!etat.competitions)etat.competitions=await rpc('competitions');return etat.competitions.filter(c=>!etat.portee||c.portee===etat.portee);}
function choixCompetition(cs,contenu){
 if(!cs.some(c=>c.id===etat.choixComp)){etat.choixComp=cs[0]?.id||'';etat.choixPoule='';}
 const sel=n('select',undefined,'ft-select');sel.setAttribute('aria-label','Compétition');
 for(const c of cs){const o=n('option',c.nom+(c.saison&&!c.nom.includes(c.saison)?' '+c.saison:''));o.value=c.id;sel.append(o);}sel.value=etat.choixComp;
 sel.onchange=()=>{etat.choixComp=sel.value;etat.choixPoule='';dessiner();};contenu.append(sel);return cs.find(c=>c.id===etat.choixComp);
}
function vueCalendrier(contenu,g){
 contenu.append(chargement());
 competitions().then(async cs=>{if(g!==etat.generation)return;contenu.replaceChildren();if(!cs.length){contenu.append(vide('Aucune compétition publiée.'));return;}
  const c=choixCompetition(cs,contenu);const attente=chargement();contenu.append(attente);
  const ms=await rpc('matchs',{competition_id:c.id});if(g!==etat.generation)return;attente.remove();
  if(!ms.length){contenu.append(vide('Aucun match programmé dans cette compétition.'));return;}
  for(const j of V.parJour(ms)){contenu.append(n('h4',j.titre,'ft-jour'));const l=n('div',undefined,'ft-liste');l.append(...j.matchs.map(carteMatch));contenu.append(l);}
 }).catch(e=>{if(g===etat.generation)contenu.replaceChildren(erreur(e.message,dessiner));});
}
function vueCompetitions(contenu,g){
 contenu.append(chargement());
 competitions().then(cs=>{if(g!==etat.generation)return;contenu.replaceChildren();if(!cs.length){contenu.append(vide('Aucune compétition publiée.'));return;}
  const l=n('div',undefined,'ft-competitions');
  for(const c of cs){const x=b('',()=>{etat.choixComp=c.id;etat.vue='calendrier';dessiner();},'ft-competition');x.append(n('strong',c.nom),n('span',[c.portee,c.type,c.saison].filter(Boolean).join(' · '),'ft-info'));l.append(x);}
  contenu.append(l);
 }).catch(e=>{if(g===etat.generation)contenu.replaceChildren(erreur(e.message,dessiner));});
}
function vueClassements(contenu,g){
 contenu.append(chargement());
 competitions().then(async cs=>{if(g!==etat.generation)return;contenu.replaceChildren();const ch=cs.filter(c=>c.type==='Championnat'||c.type==='Tournoi');
  if(!ch.length){contenu.append(vide('Aucun classement disponible.'));return;}
  const c=choixCompetition(ch,contenu);
  if(c.poules?.length){const p=n('div',undefined,'ft-filtres');for(const x of ['',...c.poules]){const y=b(x?'Poule '+x:'Toutes',()=>{etat.choixPoule=x;dessiner();},'ft-filtre');y.setAttribute('aria-pressed',String(etat.choixPoule===x));p.append(y);}contenu.append(p);}
  const attente=chargement();contenu.append(attente);
  const rows=await rpc('classement',{competition_id:c.id,...(etat.choixPoule?{poule:etat.choixPoule}:{})});if(g!==etat.generation)return;attente.remove();
  if(!rows.length){contenu.append(vide('Le classement apparaîtra avec les premiers résultats.'));return;}
  const t=n('table',undefined,'ft-table');const tr=n('tr');for(const [h,l] of [['#','Rang'],['Équipe','Équipe'],['J','Joués'],['G','Gagnés'],['N','Nuls'],['P','Perdus'],['Diff','Différence de buts'],['Pts','Points']]){const th=n('th',h);th.scope='col';th.title=l;tr.append(th);}
  const th=n('thead');th.append(tr);const tb=n('tbody');
  for(const r of rows){const l=n('tr');const nom=n('td',undefined,'ft-table-equipe');nom.append(pastille(r.equipe),n('span',r.equipe.nom));
   l.append(n('td',String(r.rang)),nom,n('td',String(r.joues)),n('td',String(r.gagnes)),n('td',String(r.nuls)),n('td',String(r.perdus)),n('td',(r.diff>0?'+':'')+r.diff),n('td',String(r.points),'ft-pts'));tb.append(l);}
  t.append(th,tb);const w=n('div',undefined,'ft-table-defile');w.append(t);contenu.append(w);
  contenu.append(n('p',rows[0].synchronise_le?'Classement officiel fourni par la source, actualisé '+V.jour(rows[0].synchronise_le).toLowerCase()+' à '+V.heure(rows[0].synchronise_le)+'.':'Classement calculé à partir des résultats publiés : victoire 3 points, nul 1, défaite 0.','ft-note'));
 }).catch(e=>{if(g===etat.generation)contenu.replaceChildren(erreur(e.message,dessiner));});
}

// ───── Fiche d'un match ─────
async function detail(id,{silencieux=false}={}){
 if(!window.KokiPortail)return;etat.detailId=id;const g=++etat.generation;
 let box=silencieux?$('portail-vue'):KokiPortail.ouvrir('⚽ Match');if(!silencieux)box.append(chargement());
 let m;try{m=await rpc('match',{id});}catch(e){if(g!==etat.generation||silencieux)return;box.replaceChildren(erreur(e.message,()=>detail(id)));return;}
 if(g!==etat.generation)return;
 if(!m){box.replaceChildren(vide('Ce match n’est plus disponible.'));return;}
 box.replaceChildren();const s=V.score(m);
 const tab=n('section',undefined,'ft-tableau'+(V.enJeu(m)?' ft-tableau-direct':''));
 tab.append(n('p',[m.competition?.nom,m.poule?'Poule '+m.poule:'',m.journee].filter(Boolean).join(' · '),'ft-comp'));
 const face=n('div',undefined,'ft-face');const cote=e=>{const c=n('div',undefined,'ft-face-equipe');c.append(pastille(e),n('strong',e.nom));return c;};
 const centre=n('div',undefined,'ft-face-centre');centre.append(n('strong',s.principal||V.heure(m.date_match),'ft-face-score'),n('span',V.statut(m),'ft-statut'));
 if(s.detail)centre.append(n('span',s.detail,'ft-face-detail'));
 face.append(cote(m.domicile),centre,cote(m.exterieur));tab.append(face);
 if(Number.isInteger(m.pro_domicile)||Number.isInteger(m.tab_domicile)){
  const d=n('dl',undefined,'ft-scores');const ajout=(t,a,c)=>{if(Number.isInteger(a)){d.append(n('dt',t),n('dd',a+' – '+c));}};
  ajout('Temps réglementaire',m.score_domicile,m.score_exterieur);ajout('Prolongation',m.pro_domicile,m.pro_exterieur);ajout('Tirs au but',m.tab_domicile,m.tab_exterieur);tab.append(d);}
 tab.append(n('p',V.jour(m.date_match)+' · '+V.heure(m.date_match)+(m.lieu?' · 📍 '+m.lieu:''),'ft-pied'));
 if(m.programmation_corrigee)tab.append(n('p','Horaire ou lieu vérifié par Koki Connect.','ft-note'));
 box.append(tab,ligneFraicheur(m));
 const groupes=V.evenements(m);
 if(groupes.length){const sec=n('section',undefined,'ft-evenements');sec.append(n('h3','Le match','ft-titre'));
  for(const gr of groupes){sec.append(n('h4',gr.titre,'ft-periode'));const ul=n('ul',undefined,'ft-evts');
   for(const e of gr.evenements){const li=n('li',undefined,'ft-evt ft-evt-'+e.cote);li.append(n('span',e.minute,'ft-evt-min'),n('span',e.libelle,'ft-evt-type'),n('span',[e.joueur,e.joueur2&&('↔ '+e.joueur2)].filter(Boolean).join(' '),'ft-evt-joueur'));ul.append(li);}
   sec.append(ul);}
  box.append(sec);}
 if(m.commentaire){const c=n('section',undefined,'ft-bloc');c.append(n('h3','Résumé','ft-titre'),n('p',m.commentaire));box.append(c);}
 box.append(b('← Tous les matchs',()=>{etat.detailId=null;if(window.KokiNavigation?.profondeur?.()>0)history.back();else window.KokiSport?.accueil();},'ft-bouton ft-bouton-clair'));
}

// ───── Carte « Match en direct » de l'Accueil (2 matchs au plus, Koki d'abord) ─────
function carteAccueil(){
 const zone=$('koki-foot-direct');if(!zone)return;
 const c=V.carteAccueil({direct:etat.direct?etat.direct.matchs():(etat.accueil?.direct||[])});
 zone.hidden=!c.visible;zone.replaceChildren();if(!c.visible)return;
 const tete=n('div',undefined,'koki-direct-tete');tete.append(n('span',undefined,'koki-direct-point'),n('strong','⚽ Match en direct'));zone.append(tete);
 for(const m of c.matchs){const s=V.score(m);const l=b('',()=>detail(m.id),'koki-direct-ligne ft-accueil-ligne');l.dataset.match=m.id;
  const t=n('span',undefined,'koki-direct-texte');t.append(n('strong',m.domicile.nom+'  '+(s.principal||'')+'  '+m.exterieur.nom),n('small',[V.statut(m),m.competition?.nom,s.detail].filter(Boolean).join(' · ')));
  l.append(n('span','⚽','koki-direct-icone'),t);zone.append(l);}
 if(c.autres)zone.append(b('Voir les '+(c.matchs.length+c.autres)+' matchs en cours',()=>window.KokiSport?.accueil(),'koki-direct-ligne ft-accueil-plus'));
}

// ───── Démarrage ─────
async function demarrer(){
 if(!V||!D)return;
 let flags,c;try{[flags,c]=await Promise.all([json('assets/business/config.json'),json('assets/portail/backend.json')]);}catch(_){return;}
 if(flags?.modules?.football!==true)return;
 if(window.KokiPublicFeed?.cibleAutorisee&&!KokiPublicFeed.cibleAutorisee(c))return;
 etat.config=c;etat.visible=true;
 if(!document.querySelector('link[href="assets/portail/foot.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='assets/portail/foot.css';document.head.append(l);}
 etat.ecouteurs.add(carteAccueil);
 await demarrerDirect();carteAccueil();
}
window.KokiFoot=Object.freeze({get visible(){return etat.visible;},vue,detail,
 // Banc d'essai : remplace le client Realtime (navigateur de test) ; sans effet après le démarrage.
 configurer({clientRealtime:f}={}){if(!etat.direct&&typeof f==='function')etat.fabrique=f;},
 demarrer});
if(!window.__KOKI_FOOT_DEMARRAGE_MANUEL__)demarrer();
})();
