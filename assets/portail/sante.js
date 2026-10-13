// Rubrique Santé : urgences, structures de santé (contrat koki.sante.structure), pharmacie de garde,
// alertes et campagnes Santé, numéros Santé. Mise en page adaptative (grilles auto-ajustées) : téléphone, tablette, ordinateur.
(function(){'use strict';
const S=KokiSanteContract,C=KokiPortailCore,$=id=>document.getElementById(id),TITRE='Santé';
let generation=0,etat={famille:'tout',ouvert:false,q:''};
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
function tel(numero){return 'tel:'+String(numero).replace(/[^+0-9]/g,'');}
function svg(d){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width','20');s.setAttribute('height','20');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','2');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');s.setAttribute('aria-hidden','true');const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);s.append(p);return s;}
const ICONES={plus:'M12 5v14M5 12h14',feu:'M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-5 1-8z',bouclier:'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',tel:'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',route:'M3 11l18-8-8 18-2-8z'};
function urgence(numero,libelle,icone,cls){const a=n('a',undefined,'sante-urgence '+cls);a.href=tel(numero);const i=n('span',undefined,'sante-urgence-icone');i.append(svg(ICONES[icone]));const t=n('span');t.append(n('span',libelle,'sante-urgence-libelle'),n('span',numero,'sante-urgence-numero'));a.append(i,t);a.setAttribute('aria-label',libelle+' : appeler le '+numero);return a;}
function structures(feed){return feed.contenus.map(row=>({row,v:S.decode(row)})).filter(x=>x.v&&!x.v.archive&&C.visible(x.row));}
function alertes(feed){return C.trier(feed.contenus.filter(x=>x.categorie==='Santé'&&!S.decode(x)&&!(window.KokiNumeroContract&&KokiNumeroContract.decode(x))&&C.visible(x))).slice(0,4);}
function numerosSante(feed){if(!window.KokiNumeroContract)return [];return feed.contenus.map(r=>({r,v:KokiNumeroContract.decode(r)})).filter(x=>x.v&&!x.v.archive&&x.v.groupe==='Santé'&&C.visible(x.r));}
function itineraire(v){return v.latitude===null?null:'https://www.google.com/maps/dir/?api=1&destination='+v.latitude+','+v.longitude;}
function statut(v){const o=S.ouvert(v);const e=n('span',o===null?'Horaires à confirmer':o?'Ouvert':'Fermé','sante-statut '+(o===null?'inconnu':o?'ouvert':'ferme'));return e;}
function actions(row,v){const box=n('div',undefined,'sante-actions');
 if(v.telephone){const a=n('a',undefined,'sante-btn sante-btn-plein');a.href=tel(v.telephone);a.append(svg(ICONES.tel),n('span','Appeler'));box.append(a);}
 const it=itineraire(v);if(it){const a=n('a',undefined,'sante-btn');a.href=it;a.target='_blank';a.rel='noopener';a.append(svg(ICONES.route),n('span','Itinéraire'));box.append(a);}
 if(!box.children.length)box.append(n('p','Coordonnées bientôt disponibles.','portail-meta'));return box;}
function carte({row,v},avecDetail=true){const a=n('article',undefined,'sante-carte');
 const haut=n('div',undefined,'sante-carte-haut');haut.append(n('span',v.genre,'sante-type '+S.famille(v.genre)),statut(v));a.append(haut);
 if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';a.append(img);}
 a.append(n('h3',row.titre),n('p',row.lieu+' · '+S.horairesTexte(v),'sante-lieu'));
 if(v.services.length){const s=n('div',undefined,'sante-services');for(const x of v.services.slice(0,6))s.append(n('span',x));a.append(s);}
 if(S.enGarde(v))a.append(n('p','💊 Pharmacie de garde','sante-garde-mention'));
 a.append(actions(row,v));if(avecDetail)a.append(b('Voir la fiche',()=>detail(row),'sante-lien'));return a;}

async function ouvrir(){
 const g=++generation,box=n('div',undefined,'sante-page');KokiPortail.ouvrir(TITRE).append(box);
 const tete=n('div',undefined,'sante-tete');tete.append(n('p','Soins, pharmacies et urgences à Koki et environs','sante-sous-titre'));
 const label=n('label',undefined,'sante-recherche');const input=n('input');input.type='search';input.placeholder='Centre, pharmacie, village, service…';input.setAttribute('aria-label','Rechercher une structure de santé');input.value=etat.q;label.append(input);tete.append(label);
 const urg=n('section',undefined,'sante-urgences');urg.setAttribute('aria-label','Numéros d’urgence');urg.append(urgence('1515','Urgence médicale · SAMU','plus','rouge'),urgence('18','Accident, incendie · Pompiers','feu','sombre'),urgence('17','Police secours','bouclier','clair'));
 const corps=n('div',undefined,'sante-corps'),principal=n('div',undefined,'sante-principal'),cote=n('aside',undefined,'sante-cote');corps.append(principal,cote);
 principal.append(n('p','Chargement des structures de santé…','portail-meta'));
 box.append(tete,urg,corps);
 let feed;try{feed=await KokiPublicFeed.charger();}catch{feed=null;}
 if(g!==generation||$('portail-titre').textContent!==TITRE)return;
 principal.replaceChildren();cote.replaceChildren();
 if(!feed){principal.append(n('p','Connexion indisponible : les numéros d’urgence ci-dessus restent utilisables.','portail-note'),b('Réessayer',ouvrir));cote.append(rappel());return;}
 const items=structures(feed);
 const filtres=n('div',undefined,'sante-filtres'),chips=n('div',undefined,'sante-chips'),ouvertBtn=b('Ouvert maintenant',()=>{etat.ouvert=!etat.ouvert;rendre();},'sante-chip sante-chip-ouvert');chips.setAttribute('role','group');chips.setAttribute('aria-label','Type de structure');filtres.append(chips,ouvertBtn);
 const compte=n('p',undefined,'portail-meta');compte.setAttribute('aria-live','polite');const grille=n('div',undefined,'sante-grille');
 principal.append(filtres,compte,grille);
 function rendre(){
  etat.q=C.normaliser(input.value.trim());
  const base=items.filter(({row,v})=>(!etat.q||C.normaliser(row.titre+' '+row.lieu+' '+v.genre+' '+v.services.join(' ')).includes(etat.q))&&(!etat.ouvert||S.ouvert(v)===true));
  chips.replaceChildren(...[['tout','Tout'],['centre','Centres et postes'],['pharmacie','Pharmacies'],['maternite','Maternités']].map(([k,l])=>{const nb=k==='tout'?base.length:base.filter(x=>S.famille(x.v.genre)===k).length;const c=b(l+' · '+nb,()=>{etat.famille=k;rendre();},'sante-chip');c.setAttribute('aria-pressed',String(etat.famille===k));return c;}));
  ouvertBtn.setAttribute('aria-pressed',String(etat.ouvert));
  const rows=base.filter(x=>etat.famille==='tout'||S.famille(x.v.genre)===etat.famille).sort((a,b)=>(S.ouvert(b.v)===true)-(S.ouvert(a.v)===true)||a.row.titre.localeCompare(b.row.titre,'fr'));
  compte.textContent=rows.length+(rows.length>1?' structures':' structure')+(etat.ouvert?' ouvertes maintenant':'');
  grille.replaceChildren(...rows.map(x=>carte(x)));
  if(!rows.length)grille.append(n('p',items.length?'Aucune structure pour cette recherche. Essayez un autre village ou retirez « Ouvert maintenant ».':'Les structures de santé de Koki seront bientôt publiées.','sante-vide'));
 }
 input.oninput=rendre;rendre();
 // Colonne latérale (passe sous la liste sur téléphone).
 const garde=items.filter(x=>S.famille(x.v.genre)==='pharmacie'&&S.enGarde(x.v));
 const gb=n('section',undefined,'sante-bloc sante-bloc-garde');gb.append(n('p','Pharmacie de garde','sante-surtitre'));
 if(garde.length)for(const {row,v} of garde.slice(0,2)){gb.append(n('h3',row.titre),n('p',row.lieu+(v.garde_fin?' · jusqu’au '+new Date(v.garde_fin+'T12:00:00Z').toLocaleDateString('fr-FR',{day:'numeric',month:'long'}):''),'sante-lieu'));if(v.telephone){const a=n('a','Appeler la pharmacie','sante-btn sante-btn-blanc');a.href=tel(v.telephone);gb.append(a);}}
 else gb.append(n('p','Aucune pharmacie de garde annoncée pour le moment.','sante-lieu'));
 const cb=n('section',undefined,'sante-bloc');cb.append(n('h3','Carte Santé'),n('p','Toutes les structures de santé autour de vous.','sante-lieu'),b('Ouvrir la carte',()=>KokiPortail.lieux('Santé'),'sante-btn sante-btn-plein'));
 const ab=n('section',undefined,'sante-bloc');ab.append(n('h3','Alertes et campagnes'));const al=alertes(feed);
 for(const x of al){const r=b(x.titre,()=>KokiPortail.detail?KokiPortail.detail(x):null,'sante-alerte');r.prepend(n('span',x.type+' · '+new Date(x.publication).toLocaleDateString('fr-FR',{timeZone:'Africa/Dakar',day:'numeric',month:'short'}),'sante-alerte-date'));ab.append(r);}
 if(!al.length)ab.append(n('p','Aucune alerte santé en cours.','sante-lieu'));
 const nums=numerosSante(feed);if(nums.length){const nb=n('section',undefined,'sante-bloc');nb.append(n('h3','Numéros santé'));for(const {r,v} of nums.slice(0,5)){const a=n('a',undefined,'sante-numero');a.href=tel(v.telephone);a.append(n('span',r.titre),n('strong',v.telephone));nb.append(a);}cote.append(nb);}
 cote.prepend(gb,cb,ab);cote.append(rappel());
}
function rappel(){return n('p','En cas de détresse vitale, appelez d’abord le 1515, puis rendez-vous à la structure la plus proche.','sante-rappel');}

function detail(row){const v=S.decode(row);if(!v)return;const box=n('div',undefined,'sante-page');KokiPortail.ouvrir(row.titre).append(box);
 const a=carte({row,v},false);a.classList.add('sante-fiche');a.append(n('p','Horaires : '+S.horairesTexte(v)));if(v.description)a.append(n('p',v.description));if(row.source)a.append(n('p','Source : '+row.source,'portail-meta'));
 if(v.whatsapp){const w=n('a','Écrire sur WhatsApp','sante-btn');w.href='https://wa.me/'+v.whatsapp.replace(/\D/g,'').replace(/^(\d{9})$/,'221$1');w.target='_blank';w.rel='noopener';a.append(w);}
 box.append(a,b('Retour à la rubrique Santé',ouvrir,'sante-btn'));}

window.KokiSante={ouvrir,detail};
})();
