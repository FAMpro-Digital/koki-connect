// Éducation : page d'accueil de la rubrique (bibliothèque et établissements), aux couleurs Koki Connect.
// Données : flux public (contrats koki.education.book et koki.education.school). Aucune donnée locale envoyée.
(function(){'use strict';
const C=KokiPortailCore,E=KokiEducationContract,B=()=>window.KokiBibliotheque,$=id=>document.getElementById(id);
const TITRE='Éducation',TITRE_ECOLES='Établissements scolaires';
const NIVEAUX={'Préscolaire':'🧒','Élémentaire':'✏️','Moyen':'📐','Secondaire':'🎓','Enseignement religieux':'🕌','Formation professionnelle':'🛠️','Supérieur':'🏛️','Autre':'🏫'};
let generation=0;
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
const actif=t=>$('portail-titre').textContent===t;
const ecoles=feed=>feed.contenus.filter(x=>{const v=E.decode(x);return v&&!v.archive&&C.visible(x);}).sort((a,b)=>a.titre.localeCompare(b.titre,'fr'));
function telephone(v){return v.telephone&&/^\+?[0-9 ()-]{6,24}$/.test(v.telephone)?v.telephone.replace(/[^+0-9]/g,''):'';}

// Carte d'établissement : pictogramme du niveau, nom, niveau et secteur, village, appel direct.
function carteEcole(row){const v=E.decode(row);const a=n('article',undefined,'edu-ecole');
 const ouvrirFiche=b('',()=>ecole(row),'edu-ecole-lien');ouvrirFiche.setAttribute('aria-label','Voir la fiche de '+row.titre);
 ouvrirFiche.append(n('span',NIVEAUX[v.niveau]||'🏫','edu-ecole-icone'));const t=n('span',undefined,'edu-ecole-texte');t.append(n('strong',row.titre),n('span',v.niveau+' · '+v.secteur+(row.lieu?' · '+row.lieu:'')));ouvrirFiche.append(t);a.append(ouvrirFiche);
 const tel=telephone(v);if(tel){const c=n('a','📞','edu-appel');c.href='tel:'+tel;c.setAttribute('aria-label','Appeler '+row.titre);a.append(c);}
 return a;}

async function accueil(){
 const g=++generation,box=KokiPortail.ouvrir(TITRE);
 const hero=n('section',undefined,'edu-hero');hero.append(n('p','KOKI CONNECT · ÉDUCATION','edu-hero-sur'),n('h3','Apprendre à Koki','edu-hero-titre'),n('p','Livres gratuits à lire sans internet, établissements scolaires et formations.','edu-hero-texte'));
 const rech=n('label',undefined,'edu-recherche');const q=n('input');q.type='search';q.placeholder='Un livre, une école, un village…';q.setAttribute('aria-label','Rechercher dans Éducation');rech.append(n('span','🔎','biblio-loupe'),q);hero.append(rech);
 const tuiles=n('div',undefined,'edu-tuiles');
 const tB=b('',()=>B().ouvrir('Toutes'),'edu-tuile edu-tuile-biblio');tB.append(n('span','📚','edu-tuile-icone'),n('strong','Bibliothèque'),n('span','Chargement…','edu-tuile-info'));
 const tE=b('',etablissements,'edu-tuile edu-tuile-ecoles');tE.append(n('span','🏫','edu-tuile-icone'),n('strong','Établissements'),n('span','Chargement…','edu-tuile-info'));
 const tM=b('',()=>B().mesLivres(),'edu-tuile edu-tuile-mes');const nbMes=KokiLivresHorsLigne.liste().length;tM.append(n('span','📥','edu-tuile-icone'),n('strong','Mes livres'),n('span',nbMes?nbMes+' hors ligne':'Lire sans internet','edu-tuile-info'));
 tuiles.append(tB,tE,tM);
 const resultats=n('div',undefined,'edu-resultats');resultats.setAttribute('aria-live','polite');
 const contenu=n('div',undefined,'edu-contenu');contenu.append(n('p','Chargement…','portail-meta'));
 box.append(hero,tuiles,resultats,contenu);
 let feed;try{feed=await KokiPublicFeed.charger();}catch{if(g!==generation||!actif(TITRE))return;contenu.replaceChildren(n('p','Connexion indisponible : la bibliothèque et les établissements se chargeront au retour d’internet. Vos livres téléchargés restent lisibles dans « Mes livres ».','portail-note'),b('Réessayer',accueil));tB.lastChild.textContent='Hors connexion';tE.lastChild.textContent='Hors connexion';return;}
 if(g!==generation||!actif(TITRE))return;
 const livres=feed.contenus.map(row=>({row,livre:KokiLivreContract.decode(row)})).filter(x=>x.livre&&!x.livre.archive&&C.visible(x.row)),liste=ecoles(feed);
 const gratuits=livres.filter(x=>x.livre.acces==='Gratuit').length;
 tB.lastChild.textContent=livres.length?livres.length+(livres.length>1?' livres':' livre')+' · '+gratuits+' gratuit'+(gratuits>1?'s':''):'Bientôt des livres';
 tE.lastChild.textContent=liste.length?liste.length+(liste.length>1?' établissements':' établissement'):'À venir';
 // Recherche commune : livres et établissements.
 q.oninput=()=>{const t=C.normaliser(q.value.trim());resultats.replaceChildren();contenu.hidden=!!t;if(!t)return;
  const L=KokiLivreContract.filtrer(livres,{q:t},C.normaliser),Ec=liste.filter(r=>C.normaliser(r.titre+' '+r.lieu+' '+r.resume+' '+E.decode(r).niveau).includes(t));
  resultats.append(n('p',(L.length+Ec.length)+' résultat(s)','portail-meta'));
  if(L.length){const g2=n('div',undefined,'biblio-grille');g2.append(...L.slice(0,12).map(B().vignette));resultats.append(n('h3','📚 Livres','edu-titre'),g2);}
  if(Ec.length){const l=n('div',undefined,'edu-ecoles');l.append(...Ec.slice(0,12).map(carteEcole));resultats.append(n('h3','🏫 Établissements','edu-titre'),l);}};
 contenu.replaceChildren();
 // Rayons : nouveautés, puis une étagère par catégorie.
 if(livres.length){
  const recents=[...livres].sort((a,b)=>Date.parse(b.row.publication)-Date.parse(a.row.publication)).slice(0,10);
  contenu.append(B().rayon('✨ Nouveautés',recents,()=>B().ouvrir('Toutes')));
  for(const cat of KokiLivreContract.categories){const xs=livres.filter(x=>x.livre.categorie===cat);if(xs.length)contenu.append(B().rayon((B().icones[cat]||'📘')+' '+cat,xs.slice(0,10),()=>B().ouvrir(cat)));}
 }else contenu.append(n('p','Les premiers livres de la bibliothèque arrivent bientôt.','portail-meta'));
 const s=n('section',undefined,'biblio-rayon');const tete=n('div',undefined,'biblio-rayon-tete');tete.append(n('h3','🏫 Établissements scolaires'));if(liste.length)tete.append(b('Voir tout',etablissements,'biblio-voir'));
 const l=n('div',undefined,'edu-ecoles');l.append(...liste.slice(0,4).map(carteEcole));if(!liste.length)l.append(n('p','Aucun établissement publié pour le moment.','portail-meta'));s.append(tete,l);contenu.append(s);
}

async function etablissements(){
 const g=++generation,box=KokiPortail.ouvrir(TITRE_ECOLES);box.append(n('p','Chargement des établissements publiés…','portail-meta'));
 let liste;try{liste=ecoles(await KokiPublicFeed.charger());}catch{if(g!==generation||!actif(TITRE_ECOLES))return;box.replaceChildren(n('p','Le catalogue est indisponible. Vérifiez votre connexion.','portail-note'),b('Réessayer',etablissements));return;}
 if(g!==generation||!actif(TITRE_ECOLES))return;box.replaceChildren();
 const rech=n('label',undefined,'biblio-recherche');const q=n('input');q.type='search';q.placeholder='Une école, un village…';q.setAttribute('aria-label','Rechercher un établissement scolaire');rech.append(n('span','🔎','biblio-loupe'),q);
 const puces=n('div',undefined,'biblio-puces');puces.setAttribute('role','group');puces.setAttribute('aria-label','Niveau scolaire');let niveau='Tous';
 const compte=n('p',undefined,'portail-meta');compte.setAttribute('aria-live','polite');const l=n('div',undefined,'edu-ecoles');
 function render(){const t=C.normaliser(q.value.trim());
  puces.replaceChildren(...['Tous',...E.levels].map(v=>{const nb=v==='Tous'?liste.length:liste.filter(r=>E.decode(r).niveau===v).length;if(!nb&&v!=='Tous')return null;const p=b(v==='Tous'?'Tous':NIVEAUX[v]+' '+v,()=>{niveau=v;render();},'biblio-puce');p.setAttribute('aria-pressed',String(niveau===v));return p;}).filter(Boolean));
  const rows=liste.filter(r=>(niveau==='Tous'||E.decode(r).niveau===niveau)&&(!t||C.normaliser(r.titre+' '+r.lieu+' '+r.resume).includes(t)));
  compte.textContent=rows.length+(rows.length>1?' établissements':' établissement');l.replaceChildren(...rows.map(carteEcole));if(!rows.length)l.append(n('p','Aucun établissement pour cette recherche.','portail-meta'));}
 q.oninput=render;const outils=n('div',undefined,'biblio-outils');outils.append(rech,puces);box.append(outils,compte,l,b('🗺️ Voir les écoles sur la carte',()=>KokiPortail.lieux('Éducation'),'biblio-secondaire'));render();
}

function ecole(row){
 const v=E.decode(row);if(!v)return;const box=KokiPortail.ouvrir(row.titre);
 const tete=n('section',undefined,'edu-fiche-tete');
 if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';tete.append(img);}else tete.append(n('span',NIVEAUX[v.niveau]||'🏫','edu-fiche-icone'));
 const t=n('div');t.append(n('p',v.niveau+' · '+v.secteur,'biblio-fiche-cat'),n('h2',row.titre));if(row.lieu)t.append(n('p','📍 '+row.lieu,'biblio-fiche-auteur'));tete.append(t);
 const actions=n('div',undefined,'biblio-zone');const tel=telephone(v);
 if(tel){const c=n('a','📞 Appeler l’établissement','biblio-principal edu-bouton');c.href='tel:'+tel;actions.append(c);}
 actions.append(b('🗺️ Voir sur la carte',()=>KokiPortail.lieux('Éducation'),'biblio-secondaire'));
 const infos=n('section',undefined,'biblio-apropos');infos.append(n('h3','À propos'),n('p',row.resume));if(v.description)infos.append(n('p',v.description));
 const dl=n('dl',undefined,'biblio-infos');for(const [k,x] of [['Niveau',v.niveau],['Secteur',v.secteur],['Horaires',v.horaires],['Adresse',row.lieu],['Source',row.source]])if(x)dl.append(n('dt',k),n('dd',x));infos.append(dl);
 const a=n('article',undefined,'biblio-fiche');a.append(tete,actions,infos);box.append(a);
}

window.KokiEducation=Object.freeze({accueil,etablissements,ecole});
})();
