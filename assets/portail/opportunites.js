// Emplois & Opportunités : une seule page (emplois, stages, formations, concours, bourses, financements),
// offres claires avec organisme, lieu, contrat et date limite. Les offres expirées ne sont plus affichées.
// Données : flux public, contrat koki.opportunite.offre (offres anciennes en texte libre acceptées).
(function(){'use strict';
const O=KokiOffreContract,C=KokiPortailCore,$=id=>document.getElementById(id);
const TITRE='💼 Emplois & Opportunités';
let generation=0,choix='Toutes',recherche='';
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
const actif=t=>$('portail-titre').textContent===t;
const jourCourt=d=>new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',timeZone:'Africa/Dakar'});
// Offres visibles : publiées, non archivées, non expirées ; échéance la plus proche d'abord, puis les plus récentes.
function offres(feed,now=new Date()){
 return feed.contenus.filter(x=>x.type===O.type&&C.visible(x)).map(row=>({row,v:O.decode(row)})).filter(({v})=>!v||(!v.archive&&!O.expiree(v,now)))
  .sort((a,b)=>{const ja=O.joursRestants(a.v,now),jb=O.joursRestants(b.v,now);if(ja!==null&&jb!==null&&ja!==jb)return ja-jb;if((ja===null)!==(jb===null))return ja===null?1:-1;return Date.parse(b.row.publication)-Date.parse(a.row.publication);});
}
function carte({row,v}){
 const f=O.famille(row.categorie),e=v&&O.echeance(v),a=b('',()=>detail(row),'op-carte'+(e?.urgent?' op-urgent':''));
 a.append(n('span',f?f.icone:'💼','op-icone'));
 const t=n('span',undefined,'op-texte');t.append(n('span',(row.categorie||'Opportunité')+(v?.contrat&&v.contrat!==row.categorie?' · '+v.contrat:''),'op-cat'),n('strong',row.titre));
 const qui=[v?.organisme,row.lieu].filter(Boolean).join(' · ');if(qui)t.append(n('span',qui,'op-qui'));
 const pied=n('span',undefined,'op-pied');if(e)pied.append(n('span',(e.urgent?'⏳ ':'📅 ')+e.texte,'op-echeance'+(e.urgent?' op-echeance-urgente':'')));pied.append(n('span','Publié le '+jourCourt(row.publication),'op-date'));t.append(pied);
 a.append(t);return a;
}

async function ouvrir(famille){
 if(typeof famille==='string')choix=famille;
 const g=++generation,box=KokiPortail.ouvrir(TITRE);box.append(n('p','Chargement des offres…','portail-meta'));
 let liste;try{liste=offres(await KokiPublicFeed.charger());}catch{if(g!==generation||!actif(TITRE))return;box.replaceChildren(n('p','Connexion internet indisponible. Les offres se chargeront au retour de la connexion.','portail-note'),b('Réessayer',()=>ouvrir(),'op-bouton'));return;}
 if(g!==generation||!actif(TITRE))return;box.replaceChildren();
 const hero=n('section',undefined,'op-hero');const urgentes=liste.filter(x=>x.v&&O.echeance(x.v)?.urgent).length;
 hero.append(n('p','KOKI CONNECT · EMPLOIS & OPPORTUNITÉS','op-hero-sur'),n('h3',liste.length?liste.length+(liste.length>1?' offres ouvertes':' offre ouverte'):'Les offres arrivent bientôt','op-hero-titre'),
  n('p',urgentes?urgentes+(urgentes>1?' offres se terminent':' offre se termine')+' dans moins de 7 jours.':'Emplois, stages, formations, concours, bourses et financements pour Koki et ses environs.','op-hero-texte'));
 const rech=n('label',undefined,'op-recherche');const q=n('input');q.type='search';q.placeholder='Métier, organisme, village…';q.setAttribute('aria-label','Rechercher une offre');q.value=recherche;rech.append(n('span','🔎'),q);hero.append(rech);
 const puces=n('div',undefined,'op-puces');puces.setAttribute('role','group');puces.setAttribute('aria-label','Type d’opportunité');
 const compte=n('p',undefined,'portail-meta');compte.setAttribute('aria-live','polite');const grille=n('div',undefined,'op-liste');
 function rendre(){recherche=q.value;const t=C.normaliser(q.value.trim());
  puces.replaceChildren(...[{nom:'Toutes',icone:'✨',categories:null},...O.familles].map(f=>{const nb=f.categories?liste.filter(x=>f.categories.includes(x.row.categorie)).length:liste.length;
   const p=b('',()=>{choix=f.nom;rendre();},'op-puce');p.append(n('span',f.icone+' '+f.nom),n('span',String(nb),'op-puce-nb'));p.setAttribute('aria-pressed',String(choix===f.nom));return p;}));
  const fam=O.familles.find(f=>f.nom===choix);
  const rows=liste.filter(x=>(!fam||fam.categories.includes(x.row.categorie))&&(!t||C.normaliser([x.row.titre,x.row.resume,x.row.lieu,x.row.categorie,x.v?.organisme,x.v?.contrat].join(' ')).includes(t)));
  compte.textContent=rows.length+(rows.length>1?' offres':' offre');grille.replaceChildren(...rows.map(carte));
  if(!rows.length)grille.append(n('p',liste.length?'Aucune offre pour ce choix. Essayez une autre catégorie.':'Aucune offre ouverte pour le moment. Revenez bientôt.','op-vide'));}
 q.oninput=rendre;
 // Carte FAMpro Digital (accompagnement des projets numériques), conservée de l'ancienne page « Opportunités jeunes ».
 const fam=n('section',undefined,'op-fampro');fam.append(n('strong','Un projet numérique ? FAMpro Digital vous accompagne.'));const l=n('a','📞 77 287 52 52');l.href='tel:772875252';const m=n('a','✉️ kokiconnect221@gmail.com');m.href='mailto:kokiconnect221@gmail.com';fam.append(l,m);
 box.append(hero,puces,compte,grille,fam);rendre();
}

function detail(row){
 const v=O.decode(row),f=O.famille(row.categorie),e=v&&O.echeance(v),box=KokiPortail.ouvrir(row.titre);
 const tete=n('section',undefined,'op-fiche-tete');tete.append(n('span',f?f.icone:'💼','op-fiche-icone'),n('p',(row.categorie||'Opportunité')+(v?.contrat&&v.contrat!==row.categorie?' · '+v.contrat:''),'op-cat'),n('h2',row.titre));
 if(v?.organisme)tete.append(n('p',v.organisme,'op-fiche-org'));if(e)tete.append(n('span',(e.urgent?'⏳ ':'📅 ')+(e.expiree?'Offre expirée':e.texte),'op-echeance'+(e.urgent||e.expiree?' op-echeance-urgente':'')));box.append(tete);
 if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';img.className='op-image';box.append(img);}
 const dl=n('dl',undefined,'op-infos');for(const [k,x] of [['Organisme',v?.organisme],['Lieu',row.lieu],['Contrat',v?.contrat],['Rémunération',v?.remuneration],['Date limite',v?.date_limite?new Date(v.date_limite+'T12:00:00Z').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Dakar'}):''],['Publié le',jourCourt(row.publication)],['Source',row.source]])if(x)dl.append(n('dt',k),n('dd',x));box.append(dl);
 const desc=n('section',undefined,'op-bloc');desc.append(n('h3','L’offre'),n('p',row.resume));const plus=v?v.description:String(row.texte||'').trim();if(plus)desc.append(n('p',plus));box.append(desc);
 if(v?.comment_postuler){const p=n('section',undefined,'op-bloc op-postuler');p.append(n('h3','📝 Comment postuler'),n('p',v.comment_postuler));box.append(p);}
 box.append(b('💼 Voir toutes les offres',()=>ouvrir(),'op-bouton op-bouton-clair'));
}

window.KokiOpportunites=Object.freeze({ouvrir,detail,offres});
})();
