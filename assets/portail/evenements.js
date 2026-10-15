// Événements : agenda de Koki (aujourd'hui, ce week-end, cette semaine, ce mois), fiche complète,
// ajout à l'agenda du téléphone (.ics) et partage WhatsApp. Les événements terminés ne sont plus affichés.
// Données : flux public, contrat koki.evenement.fiche (anciens événements en texte libre acceptés).
(function(){'use strict';
const E=KokiEvenementContract,C=KokiPortailCore,$=id=>document.getElementById(id);
const TITRE='📅 Événements';
let generation=0,periode='Tout',genre='Tous';
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
const actif=t=>$('portail-titre').textContent===t;
const fmt=(ms,o)=>new Date(ms).toLocaleString('fr-FR',{timeZone:'Africa/Dakar',...o});
// Événements visibles : publiés, non archivés, non terminés ; du plus proche au plus lointain.
function evenements(feed,now=Date.now()){
 return feed.contenus.filter(x=>x.type===E.type&&C.visible(x)).map(row=>({row,v:E.decode(row)})).filter(({row,v})=>!v?.archive&&E.bornes(row,v)&&!E.termine(row,v,now))
  .sort((a,b)=>E.bornes(a.row,a.v).debut-E.bornes(b.row,b.v).debut);
}
function carte({row,v},now=Date.now()){
 const bo=E.bornes(row,v),g=E.genre(v?.genre),e=E.etat(row,v,now),a=b('',()=>detail(row),'ev-carte'+(e==='En cours'?' ev-en-cours':''));
 const date=n('span',undefined,'ev-date');date.append(n('span',fmt(bo.debut,{day:'numeric'}),'ev-jour'),n('span',fmt(bo.debut,{month:'short'}).replace('.',''),'ev-mois'));a.append(date);
 const t=n('span',undefined,'ev-texte');t.append(n('span',g.icone+' '+(v?.genre||row.categorie||'Événement'),'ev-genre'),n('strong',row.titre),n('span','📍 '+row.lieu,'ev-lieu'));
 t.append(n('span',E.quand(row,v,now),'ev-quand'+(e==='En cours'?' ev-quand-direct':'')));a.append(t);
 if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';img.className='ev-vignette';a.append(img);}
 return a;
}

async function ouvrir(){
 const g=++generation,box=KokiPortail.ouvrir(TITRE);box.append(n('p','Chargement de l’agenda…','portail-meta'));
 let liste;try{liste=evenements(await KokiPublicFeed.charger());}catch{if(g!==generation||!actif(TITRE))return;box.replaceChildren(n('p','Connexion internet indisponible. L’agenda se chargera au retour de la connexion.','portail-note'),b('Réessayer',ouvrir,'ev-bouton'));return;}
 if(g!==generation||!actif(TITRE))return;box.replaceChildren();
 const now=Date.now(),enCours=liste.filter(x=>E.etat(x.row,x.v,now)==='En cours'),prochain=liste.find(x=>E.etat(x.row,x.v,now)==='À venir');
 const hero=n('section',undefined,'ev-hero');hero.append(n('p','KOKI CONNECT · AGENDA','ev-hero-sur'),n('h3',enCours.length?'En ce moment à Koki':prochain?'Prochain événement':'Agenda de Koki','ev-hero-titre'));
 const vedette=enCours[0]||prochain;if(vedette)hero.append(carte(vedette,now));else hero.append(n('p','Les fêtes, cérémonies, réunions et activités de Koki apparaîtront ici.','ev-hero-texte'));
 const periodes=n('div',undefined,'ev-periodes');periodes.setAttribute('role','group');periodes.setAttribute('aria-label','Période');
 const genres=n('div',undefined,'ev-genres');genres.setAttribute('role','group');genres.setAttribute('aria-label','Type d’événement');
 const compte=n('p',undefined,'portail-meta');compte.setAttribute('aria-live','polite');const zone=n('div',undefined,'ev-agenda');
 function rendre(){
  periodes.replaceChildren(...E.periodes.map(p=>{const x=b(p,()=>{periode=p;rendre();},'ev-periode');x.setAttribute('aria-pressed',String(periode===p));return x;}));
  const presents=new Set(liste.map(x=>x.v?.genre).filter(Boolean));
  genres.replaceChildren(...['Tous',...E.genres.map(x=>x.nom).filter(x=>presents.has(x))].map(nom=>{const x=b(nom==='Tous'?'Tous':E.genre(nom).icone+' '+nom,()=>{genre=nom;rendre();},'ev-puce');x.setAttribute('aria-pressed',String(genre===nom));return x;}));
  genres.hidden=presents.size<2;
  const rows=liste.filter(x=>E.periode(periode,x.row,x.v,now)&&(genre==='Tous'||x.v?.genre===genre));
  compte.textContent=rows.length+(rows.length>1?' événements':' événement');zone.replaceChildren();
  let mois='';for(const x of rows){const m=fmt(E.bornes(x.row,x.v).debut,{month:'long',year:'numeric'});if(m!==mois){mois=m;zone.append(n('h3',m.charAt(0).toUpperCase()+m.slice(1),'ev-mois-titre'));}zone.append(carte(x,now));}
  if(!rows.length)zone.append(n('p',liste.length?'Aucun événement pour cette période.':'Aucun événement à venir pour le moment.','ev-vide'));
 }
 box.append(hero,periodes,genres,compte,zone);rendre();
}

function telecharger(row,v){
 const contenu=E.ics(row,v,location.origin);if(!contenu)return;const url=URL.createObjectURL(new Blob([contenu],{type:'text/calendar;charset=utf-8'}));
 const a=n('a');a.href=url;a.download=(row.titre||'evenement').replace(/[\\/:*?"<>|]/g,'-').slice(0,60)+'.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function detail(row){
 const v=E.decode(row),bo=E.bornes(row,v),g=E.genre(v?.genre),e=E.etat(row,v),box=KokiPortail.ouvrir(row.titre);
 if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='Affiche : '+row.titre;img.loading='lazy';img.className='ev-affiche';box.append(img);}
 const tete=n('section',undefined,'ev-fiche-tete');tete.append(n('p',g.icone+' '+(v?.genre||row.categorie||'Événement'),'ev-genre'),n('h2',row.titre));
 if(bo){tete.append(n('p','🗓️ '+fmt(bo.debut,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+fmt(bo.debut,{hour:'2-digit',minute:'2-digit'})+(v?.fin?' – '+(E.bornes(row,v).fin-bo.debut>86400000?fmt(bo.fin,{day:'numeric',month:'long'})+' ':'')+fmt(bo.fin,{hour:'2-digit',minute:'2-digit'}):''),'ev-fiche-date'));
  tete.append(n('span',e==='En cours'?'● En cours':e==='Terminé'?'Terminé':E.quand(row,v),'ev-quand'+(e==='En cours'?' ev-quand-direct':'')));}
 box.append(tete);
 const actions=n('div',undefined,'ev-actions');
 if(bo&&e!=='Terminé')actions.append(b('📅 Ajouter à mon agenda',()=>telecharger(row,v),'ev-bouton'));
 const lienCarte=v?.latitude!=null?'https://www.google.com/maps/dir/?api=1&destination='+v.latitude+','+v.longitude:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(row.lieu+', Koki, Louga, Sénégal');
 const it=n('a','🗺️ Itinéraire vers le lieu','ev-bouton ev-bouton-clair');it.href=lienCarte;it.target='_blank';it.rel='noopener';actions.append(it);
 const texte=row.titre+' — '+(bo?fmt(bo.debut,{weekday:'long',day:'numeric',month:'long'})+' à '+fmt(bo.debut,{hour:'2-digit',minute:'2-digit'}):'')+' · '+row.lieu+' (Koki Connect)';
 const wa=n('a','💬 Partager sur WhatsApp','ev-bouton ev-bouton-clair');wa.href='https://wa.me/?text='+encodeURIComponent(texte);wa.target='_blank';wa.rel='noopener';actions.append(wa);
 if(v?.contact){const t=n('a','📞 Appeler l’organisateur','ev-bouton ev-bouton-clair');t.href='tel:'+v.contact.replace(/[^+0-9]/g,'');actions.append(t);}
 box.append(actions);
 const dl=n('dl',undefined,'ev-infos');for(const [k,x] of [['Lieu',row.lieu],['Organisateur',v?.organisateur],['Entrée',v?.entree],['Contact',v?.contact],['Source',row.source]])if(x)dl.append(n('dt',k),n('dd',x));box.append(dl);
 const desc=n('section',undefined,'ev-bloc');desc.append(n('h3','À propos'),n('p',row.resume));if(!v&&row.texte)desc.append(n('p',row.texte));box.append(desc);
 if(v?.programme){const p=n('section',undefined,'ev-bloc ev-programme');p.append(n('h3','📋 Programme'),n('p',v.programme));box.append(p);}
 box.append(b('📅 Voir tout l’agenda',ouvrir,'ev-bouton ev-bouton-clair'));
}
window.KokiEvenements=Object.freeze({ouvrir,detail,evenements});
})();
