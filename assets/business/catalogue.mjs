// Catalogue public Commerces & Services — boutique en ligne adaptative (téléphone d'abord, panier latéral sur grand écran).
// Recherche, onglets, puces de catégories, promotions, cartes « Ajouter au panier », fiches détaillées avec galerie,
// Appeler / WhatsApp / Commander sur WhatsApp, panier (une boutique) avec retrait ou livraison, paiement à la réception.
import {ONGLETS,indexCatalogue,filtrer,compter,categories,villages,villageDe,contacts,lienCommande,lienDevis,etiquetteDisponibilite,disponible,promotion,lienCarte,promotions,totalPanier,lienPanierWhatsApp} from './catalogue-state.mjs';
import './commerce-contract.js';
const C=globalThis.KokiCommerceContract;
const PAGE=24;
// Ordre d'affichage des onglets : la vente en ligne d'abord.
const ORDRE=['produits','services','boutiques','professionnels'];
const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(className)e.className=className;return e;};
let uid=0;const nid=p=>'cat-'+p+'-'+(++uid);
function button(label,fn,kind='secondary'){const b=node('button',label,'cat-btn cat-btn-'+kind);b.type='button';b.onclick=fn;return b;}
function lien(label,href,kind){const a=node('a',label,'cat-btn cat-btn-'+kind);a.href=href;if(/^https:/.test(href)){a.target='_blank';a.rel='noopener noreferrer';}return a;}
function select(host,label,values,value,onchange){const w=node('div',null,'cat-field'),id=nid('s'),l=node('label',label),s=node('select');l.htmlFor=id;s.id=id;for(const v of values){const o=node('option',v.label??v);o.value=v.value??v;s.append(o);}s.value=value;s.onchange=()=>onchange(s.value);w.append(l,s);host.append(w);return s;}
// Pictogrammes dessinés (aucune image téléchargée) quand le professionnel n'a pas fourni de photo.
const SVG='http://www.w3.org/2000/svg';
const ICONES={
 Alimentation:'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',Maison:'M3 11l9-7 9 7v9H3zM9 20v-6h6v6','Vêtements':'M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7z',
 'Électronique':'M7 2h10v20H7zM11 18h2',Agriculture:'M12 21V10M12 10c0-4 3-7 8-7 0 5-3 8-8 8zM12 13c0-3-2-6-7-6 0 4 2 7 7 7',
 produits:'M4 7h16l-1 13H5zM9 7V5a3 3 0 0 1 6 0v2',services:'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
 boutiques:'M3 9l2-5h14l2 5M4 9v11h16V9M9 20v-6h6v6',professionnels:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7'
};
const TEINTES=['Alimentation','Maison','Vêtements','Électronique','Agriculture'];
function icone(chemin,taille=40){const s=document.createElementNS(SVG,'svg');for(const [k,v] of [['width',taille],['height',taille],['viewBox','0 0 24 24'],['fill','none'],['stroke','currentColor'],['stroke-width','1.6'],['stroke-linecap','round'],['stroke-linejoin','round'],['aria-hidden','true'],['focusable','false']])s.setAttribute(k,v);const p=document.createElementNS(SVG,'path');p.setAttribute('d',chemin);s.append(p);return s;}
function tuile(x){const t=x?.kind==='produits'?TEINTES.indexOf(x.categorie):-1;const d=node('div',null,'cat-tile cat-teinte-'+(t>=0?t+1:x?.kind==='services'?'s':'n'));d.append(icone(ICONES[x?.categorie]&&x.kind==='produits'?ICONES[x.categorie]:ICONES[x?.kind]||ICONES.produits));return d;}
function prixBloc(x){
 const p=node('p',null,'cat-price');
 if(x.kind==='services'){p.append(node('strong',x.tarif==='devis'||!Number.isInteger(x.prix)?'Sur devis':'À partir de '+C.formaterPrix(x.prix)));return p;}
 if(x.kind!=='produits')return null;
 p.append(node('strong',C.formaterPrix(x.prix)));
 if(promotion(x)){const s=node('s',C.formaterPrix(x.ancien_prix));s.setAttribute('aria-label','Ancien prix : '+C.formaterPrix(x.ancien_prix));p.append(' ',s);}
 return p;
}
function badge(x){const t=etiquetteDisponibilite(x);if(!t)return null;return node('span',t,'cat-badge '+(disponible(x)?'cat-ok':'cat-off'));}

// panier (facultatif) : {lignes(), ajouter(x,q), changer(id,q), commander(mode,adresse), position?(), note}
export async function catalogue(host,{api,addToCart,requestService,raccourcis=[],panier=null,vide='Aucun commerce ou service validé pour le moment.'}){
 let idx=indexCatalogue([]);const f={kind:'produits',query:'',categorie:'',village:'',disponibles:false,tri:'recent'};let limite=PAGE;
 const stack=[{view:'liste'}];const images=new Map();
 let mode='retrait',adresse='';const ajouterPanier=panier?(x,q)=>panier.ajouter(x,q):addToCart;
 const message=node('p',null,'cat-message');message.setAttribute('role','status');
 const say=t=>{message.textContent=t;};
 async function photo(img,path){try{if(!images.has(path))images.set(path,api.image(path));img.src=await images.get(path);}catch{images.delete(path);img.alt='Photo indisponible';img.classList.add('cat-photo-off');}}
 // Les images se chargent quand elles approchent de l'écran (économie de données mobiles).
 const watcher=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){watcher.unobserve(e.target);photo(e.target,e.target.dataset.path);}},{rootMargin:'300px'}):null;
 function vignette(path,alt,x){if(!path)return tuile(x);const img=node('img');img.alt=alt;img.loading='lazy';img.decoding='async';img.width=320;img.height=240;img.dataset.path=path;if(watcher)watcher.observe(img);else photo(img,path);return img;}

 function go(view,params){say('');stack.push({view,params});try{history.pushState({...(history.state||{}),kokiCat:stack.length},'');}catch{}render();host.scrollIntoView({block:'start'});}
 function back(){if(stack.length<=1)return;try{if(history.state?.kokiCat===stack.length){history.back();return;}}catch{}stack.pop();render();}
 const onPop=e=>{if(!host.isConnected){window.removeEventListener('popstate',onPop);return;}const depth=e.state?.kokiCat||1;if(depth<stack.length){stack.length=Math.max(1,depth);render();}};
 window.addEventListener('popstate',onPop);
 // Le panier change (ajout depuis une fiche, connexion, commande) : cartes et récapitulatif sont redessinés.
 let majPanier=()=>{};
 const onCart=()=>{if(!host.isConnected){window.removeEventListener('koki-cart',onCart);return;}majPanier();};
 window.addEventListener('koki-cart',onCart);

 function render(){const top=stack.at(-1);host.replaceChildren();majPanier=()=>{};if(top.view==='liste')liste();else fiche(top.params.id);}
 const lignes=()=>{try{return panier?.lignes()||[];}catch{return [];}};
 const quantite=id=>lignes().find(l=>l.id===id)?.quantite||0;
 async function changer(id,q){try{await panier.changer(id,q);}catch(e){say(e.message);}window.dispatchEvent(new Event('koki-cart'));}
 async function ajouter(x,q=1){try{await ajouterPanier(x,q);say('« '+x.nom+' » ajouté au panier.');}catch(e){say(e.message);}window.dispatchEvent(new Event('koki-cart'));}

 function compteur(x,classe){
  const q=quantite(x.id);const w=node('div',null,'cat-stepper '+(classe||''));
  const moins=button('−',()=>changer(x.id,q-1),'step'),plus=button('+',()=>q<x.stock?changer(x.id,q+1):say('Stock indiqué atteint.'),'step');
  moins.setAttribute('aria-label','Retirer un « '+x.nom+' »');plus.setAttribute('aria-label','Ajouter un « '+x.nom+' »');
  const out=node('span',null,'cat-stepper-n');out.append(node('strong',String(q)),node('span',' dans le panier','cat-sr'));w.append(moins,out,plus);return w;
 }
 function actionsCarte(x,zone){
  zone.replaceChildren();
  if(x.kind==='produits'){
   if(!disponible(x)){zone.append(node('span','Épuisé','cat-pill'));return;}
   if(ajouterPanier&&quantite(x.id)>0&&panier){zone.append(compteur(x));return;}
   if(ajouterPanier){const b=button('Ajouter au panier',()=>ajouter(x,1),'cart');b.setAttribute('aria-label','Ajouter « '+x.nom+' » au panier');zone.append(b);return;}
   const w=lienCommande(x,idx,1);if(w)zone.append(lien('Commander sur WhatsApp',w,'whatsapp'));return;
  }
  if(x.kind==='services')zone.append(button('Demander un devis',()=>go('fiche',{id:x.id}),'dark'));
 }
 function carte(x,classe=''){
  const a=node('article',null,'cat-card '+classe);a.dataset.kind=x.kind;
  const b=node('button',null,'cat-card-open');b.type='button';
  b.setAttribute('aria-label',x.nom+(x.kind==='produits'||x.kind==='services'?' — '+(x.kind==='services'&&(x.tarif==='devis'||!Number.isInteger(x.prix))?'sur devis':C.formaterPrix(x.prix)):'')+' : voir la fiche');
  const media=node('span',null,'cat-media');media.append(vignette(x.photos[0],'',x));
  if(promotion(x))media.append(node('span','−'+promotion(x)+' %','cat-promo'));
  b.append(media);const body=node('span',null,'cat-card-body');
  const meta=[x.kind==='produits'?idx.boutique(x)?.nom:x.kind==='services'?x.categorie:x.kind==='boutiques'?idx.vendeur(x)?.nom:x.categorie,villageDe(x,idx)].filter(Boolean).join(' · ');if(meta)body.append(node('span',meta,'cat-meta'));
  if(x.kind==='services'&&idx.vendeur(x))body.append(node('span',idx.vendeur(x).nom,'cat-meta cat-meta-fort'));
  body.append(node('span',x.nom,'cat-card-title'));const p=prixBloc(x);if(p)body.append(p);
  if(x.kind==='services'){const bd=badge(x);if(bd)body.append(bd);}
  b.append(body);b.onclick=()=>go('fiche',{id:x.id});a.append(b);
  const zone=node('div',null,'cat-card-actions');actionsCarte(x,zone);if(zone.childElementCount)a.append(zone);a._zone=zone;a._x=x;
  return a;
 }

 function recapitulatif(aside){
  aside.replaceChildren();const ls=lignes();const n=ls.reduce((s,l)=>s+l.quantite,0);
  const titre=node('h3','Votre panier'+(n?' ('+n+')':''),'cat-cart-title');titre.tabIndex=-1;aside.append(titre);
  if(!ls.length){aside.append(node('p',ajouterPanier?'Votre panier est vide. Ajoutez des produits pour commander.':'Le panier sera disponible après l’ouverture du service de commande.','cat-hint'));return;}
  const boutique=idx.boutique(idx.get(ls[0].id)||{})?.nom;if(boutique)aside.append(node('p','Boutique : '+boutique,'cat-hint'));
  const liste=node('div',null,'cat-lines');
  for(const l of ls){const x=idx.get(l.id)||{id:l.id,nom:l.nom,stock:l.stock};const row=node('div',null,'cat-line');
   const info=node('div',null,'cat-line-info');info.append(node('strong',l.nom),node('span',l.quantite+' × '+C.formaterPrix(l.prix),'cat-hint'));
   const st=compteur({...x,nom:l.nom,stock:Number.isInteger(x.stock)?x.stock:l.stock},'cat-stepper-mini');
   const retirer=button('Retirer',()=>changer(l.id,0),'link');retirer.setAttribute('aria-label','Retirer « '+l.nom+' » du panier');
   const actions=node('div',null,'cat-line-actions');actions.append(st,retirer);
   row.append(info,node('strong',C.formaterPrix(l.prix*l.quantite),'cat-line-total'),actions);liste.append(row);}
  aside.append(liste);
  const choix=node('div',null,'cat-segment');choix.setAttribute('role','group');choix.setAttribute('aria-label','Mode de réception');
  for(const [v,label] of [['retrait','Retrait en boutique'],['livraison','Livraison']]){const b=button(label,()=>{mode=v;recapitulatif(aside);},'seg');b.setAttribute('aria-pressed',String(mode===v));choix.append(b);}
  aside.append(choix);
  if(mode==='livraison'){const w=node('div',null,'cat-field'),id=nid('adr'),l=node('label','Adresse ou lieu de livraison'),i=node('input');l.htmlFor=id;i.id=id;i.type='text';i.autocomplete='street-address';i.maxLength=300;i.value=adresse;i.placeholder='Village, quartier, repère…';i.oninput=()=>{adresse=i.value;wa();};w.append(l,i);aside.append(w);
   if(panier?.position)aside.append(button('📍 Utiliser ma position',async()=>{try{adresse=await panier.position();i.value=adresse;wa();}catch(e){say(e.message);}},'link'));}
  const total=totalPanier(ls);const t=node('dl',null,'cat-totals');for(const [k,v] of [['Sous-total',C.formaterPrix(total)],[mode==='livraison'?'Livraison':'Retrait',mode==='livraison'?'À confirmer par la boutique':'Gratuit']])t.append(node('dt',k),node('dd',v));aside.append(t);
  const cmd=button('Commander · paiement à la réception',async()=>{cmd.disabled=true;try{if(mode==='livraison'&&adresse.trim().length<3)throw Error('Indiquez l’adresse ou le lieu de livraison.');const r=await panier.commander(mode,adresse);say(r||'Commande enregistrée.');}catch(e){say(e.message);}finally{cmd.disabled=false;window.dispatchEvent(new Event('koki-cart'));}},'primary');
  if(!panier?.commander)cmd.disabled=true;aside.append(cmd);
  const zoneWa=node('div');aside.append(zoneWa);
  function wa(){zoneWa.replaceChildren();const u=lienPanierWhatsApp(ls,idx,{mode,adresse});if(u)zoneWa.append(lien('Commander sur WhatsApp',u,'whatsapp-light'));}
  wa();
  aside.append(node('p',panier?.note||'Paiement à la réception. La boutique confirme le prix, le stock et les frais de livraison.','cat-hint'));
 }

 function liste(){
  const shell=node('div',null,'cat-shell');host.append(shell);
  // Barre du haut : recherche + accès au panier + raccourcis du compte.
  const bar=node('div',null,'cat-bar');
  const recherche=node('div',null,'cat-search'),sid=nid('q'),sl=node('label','Rechercher un produit, un service, une boutique ou un village'),q=node('input');sl.htmlFor=sid;sl.className='cat-sr';q.id=sid;q.type='search';q.enterKeyHint='search';q.autocomplete='off';q.value=f.query;q.placeholder='Riz, pagne, plombier, Coki…';
  let t;q.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{f.query=q.value;limite=PAGE;dessiner();},150);};recherche.append(sl,q);
  const cartBtn=node('button',null,'cat-cartbtn');cartBtn.type='button';cartBtn.append(icone(ICONES.produits,22));const pastille=node('span',null,'cat-cartbtn-n');cartBtn.append(pastille);
  const allerPanier=()=>{const a=host.querySelector('.cat-cart');a?.scrollIntoView({block:'start',behavior:'smooth'});a?.querySelector('h3')?.focus?.({preventScroll:true});};
  cartBtn.onclick=allerPanier;
  bar.append(recherche);if(panier)bar.append(cartBtn);shell.append(bar);
  if(raccourcis.length){const rapides=node('div',null,'cat-shortcuts');for(const r of raccourcis)rapides.append(button(r.label,r.action,'link'));shell.append(rapides);}
  shell.append(message);
  // Onglets : Produits / Services / Boutiques / Commerces.
  const tabs=node('div',null,'cat-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Rubriques du catalogue');shell.append(tabs);
  const promo=node('section',null,'cat-promos');promo.setAttribute('aria-label','Promotions');shell.append(promo);
  const puces=node('div',null,'cat-chips');puces.setAttribute('role','group');shell.append(puces);
  const filtres=node('div',null,'cat-filters');shell.append(filtres);
  const layout=node('div',null,'cat-layout');shell.append(layout);
  const main=node('div',null,'cat-main');layout.append(main);
  const compte=node('p',null,'cat-count');compte.setAttribute('aria-live','polite');const grille=node('div',null,'cat-grid');grille.setAttribute('role','tabpanel');const plus=node('div');main.append(compte,grille,plus);
  const aside=node('aside',null,'cat-cart');aside.id=nid('panier');aside.setAttribute('aria-label','Panier');if(panier)layout.append(aside);
  const barre=node('button',null,'cat-cartbar');barre.type='button';barre.onclick=allerPanier;if(panier)main.append(barre);
  majPanier=()=>{const ls=lignes(),n=ls.reduce((s,l)=>s+l.quantite,0);pastille.textContent=n?String(n):'';pastille.hidden=!n;cartBtn.setAttribute('aria-label','Panier : '+n+' article'+(n>1?'s':''));
   barre.hidden=!n;barre.replaceChildren(node('span',n+' article'+(n>1?'s':'')+' · '+C.formaterPrix(totalPanier(ls))),node('span','Panier →','cat-cartbar-go'));barre.setAttribute('aria-label','Voir le panier : '+n+' article'+(n>1?'s':'')+', '+C.formaterPrix(totalPanier(ls)));
   for(const card of host.querySelectorAll('.cat-card'))if(card._zone)actionsCarte(card._x,card._zone);if(panier)recapitulatif(aside);};
  function dessiner(){
   const n=compter(idx,f);tabs.replaceChildren();
   for(const kind of ORDRE){const o=ONGLETS.find(x=>x.kind===kind);const b=node('button',null,'cat-tab');b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(kind===f.kind));b.append(node('span',o.label),node('span',String(n[kind]),'cat-tab-n'));b.setAttribute('aria-label',o.label+' ('+n[kind]+')');b.onclick=()=>{if(f.kind===kind)return;f.kind=kind;f.categorie='';f.village='';limite=PAGE;dessiner();};tabs.append(b);}
   // Promotions : seulement sur l'onglet Produits, sans recherche ni filtre.
   promo.replaceChildren();const promos=f.kind==='produits'&&!f.query&&!f.categorie&&!f.village?promotions(idx):[];promo.hidden=!promos.length;
   if(promos.length){promo.append(node('h3','Promotions','cat-section-title'));const rail=node('div',null,'cat-rail-promos');for(const x of promos)rail.append(carte(x,'cat-card-mini'));promo.append(rail);}
   const cats=categories(idx,f.kind),vils=villages(idx,f.kind);if(f.categorie&&!cats.includes(f.categorie))f.categorie='';if(f.village&&!vils.includes(f.village))f.village='';
   puces.replaceChildren();puces.setAttribute('aria-label',f.kind==='services'?'Métiers':'Catégories');puces.hidden=!cats.length;
   for(const c of ['',...cats]){const b=button(c||'Tout',()=>{f.categorie=c;limite=PAGE;dessiner();},'chip');b.setAttribute('aria-pressed',String(f.categorie===c));puces.append(b);}
   filtres.replaceChildren();
   if(vils.length>1||f.village)select(filtres,'Village ou quartier',[{value:'',label:'Tous'},...vils],f.village,v=>{f.village=v;limite=PAGE;dessiner();});
   if(f.kind==='produits'||f.kind==='services'){
    select(filtres,'Trier',[{value:'recent',label:'Plus récents'},{value:'prix',label:'Prix croissant'},{value:'prix-desc',label:'Prix décroissant'},{value:'nom',label:'Nom'}],f.tri,v=>{f.tri=v;dessiner();});
    const l=node('label',null,'cat-toggle'),c=node('input');c.type='checkbox';c.checked=f.disponibles;c.onchange=()=>{f.disponibles=c.checked;limite=PAGE;dessiner();};l.append(c,' Disponibles seulement');filtres.append(l);
   }
   if(f.query||f.categorie||f.village||f.disponibles)filtres.append(button('Effacer les filtres',()=>{Object.assign(f,{query:'',categorie:'',village:'',disponibles:false});q.value='';limite=PAGE;dessiner();},'link'));
   const res=filtrer(idx,f);const nom={produits:['produit','produits'],services:['prestataire','prestataires'],boutiques:['boutique','boutiques'],professionnels:['commerce','commerces']}[f.kind];
   compte.textContent=res.length+' '+nom[res.length>1?1:0];
   grille.replaceChildren();plus.replaceChildren();grille.dataset.kind=f.kind;
   if(!res.length)grille.append(node('p',idx.liste.length?'Aucun résultat. Essayez un autre mot ou retirez un filtre.':vide,'cat-empty'));
   for(const x of res.slice(0,limite))grille.append(carte(x));
   if(res.length>limite)plus.append(button('Voir plus ('+(res.length-limite)+')',()=>{limite+=PAGE;dessiner();}));
   majPanier();
  }
  dessiner();
 }

 function galerie(x){
  const g=node('div',null,'cat-gallery');if(!x.photos.length){g.append(tuile(x));return g;}
  const rail=node('div',null,'cat-rail');rail.tabIndex=0;rail.setAttribute('aria-label','Photos de '+x.nom+' : faites glisser pour les voir');
  x.photos.forEach((p,i)=>{const fig=node('figure');fig.append(vignette(p,'Photo '+(i+1)+' sur '+x.photos.length+' : '+x.nom,x));rail.append(fig);});
  g.append(rail);
  if(x.photos.length>1){const n=node('p','1 / '+x.photos.length,'cat-gallery-count');n.setAttribute('aria-hidden','true');rail.onscroll=()=>{n.textContent=(Math.round(rail.scrollLeft/rail.clientWidth)+1)+' / '+x.photos.length;};g.append(n);}
  return g;
 }
 function infos(x){
  const dl=node('dl',null,'cat-infos');const add=(k,v)=>{if(v){dl.append(node('dt',k),node('dd',String(v)));}};
  add(x.kind==='services'?'Métier':'Catégorie',x.categorie);if(x.kind==='professionnels')add('Activité',x.type);
  add('Village ou quartier',villageDe(x,idx));add('Adresse',x.adresse);add('Horaires',x.horaires||idx.boutique(x)?.horaires||(x.kind!=='professionnels'?idx.vendeur(x)?.horaires:''));
  add('Zone d’intervention',x.zone);if(x.kind==='produits')add('Stock',disponible(x)?x.stock+' disponible'+(x.stock>1?'s':''):'Épuisé');
  return dl.children.length?dl:null;
 }
 function liens(x,qte){
  const box=node('div',null,'cat-contact');const c=contacts(x,idx);if(!c){box.append(node('p','Coordonnées indisponibles.'));return box;}
  box.append(node('p',x.kind==='professionnels'?'Contacter '+c.vendeur:'Proposé par '+c.vendeur+(x.kind==='produits'&&c.boutique?' · '+c.boutique:''),'cat-seller'));
  const actions=node('div',null,'cat-actions');
  const principal=x.kind==='produits'?lienCommande(x,idx,qte):x.kind==='services'?lienDevis(x,idx):null;
  if(principal)actions.append(lien(x.kind==='produits'?'Commander sur WhatsApp':'Demander un devis sur WhatsApp',principal,'whatsapp'));
  if(c.appel)actions.append(lien('Appeler le '+c.telephone,c.appel,'call'));
  if(c.whatsapp)actions.append(lien(principal?'Écrire sur WhatsApp':'WhatsApp '+c.numeroWhatsApp,c.whatsapp,principal?'whatsapp-light':'whatsapp'));
  const carte=lienCarte(x,idx);if(carte)actions.append(lien('Voir sur la carte',carte,'secondary'));
  if(!c.appel&&!c.whatsapp)box.append(node('p','Numéro non communiqué.'));
  box.append(actions);return box;
 }

 function fiche(id){
  const x=idx.get(id);const bar=node('div',null,'cat-bar cat-bar-detail');bar.append(button('← Retour',back,'back'));host.append(bar,message);
  if(!x){host.append(node('p','Cette fiche n’est plus disponible.','cat-empty'));return;}
  const art=node('article',null,'cat-detail');host.append(art);
  const col=node('div',null,'cat-detail-media');col.append(galerie(x));if(promotion(x))col.append(node('span','−'+promotion(x)+' %','cat-promo'));art.append(col);
  const corps=node('div',null,'cat-detail-body');art.append(corps);
  const h=node('h3',x.nom,'cat-title');h.tabIndex=-1;corps.append(h);queueMicrotask(()=>h.focus({preventScroll:true}));
  const p=prixBloc(x);if(p)corps.append(p);const bd=badge(x);if(bd)corps.append(bd);
  const i=infos(x);if(i)corps.append(i);if(x.description)corps.append(node('p',x.description,'cat-description'));
  let qte=1;const contact=node('div');
  const dessinerContact=()=>{contact.replaceChildren(liens(x,qte));};
  if(x.kind==='produits'&&disponible(x)){
   const w=node('div',null,'cat-qty'),qid=nid('n'),l=node('label','Quantité'),moins=button('−',()=>{if(qte>1){qte--;maj();}},'step'),plus=button('+',()=>{if(qte<Math.min(x.stock,99)){qte++;maj();}},'step'),out=node('output','1');
   l.htmlFor=qid;out.id=qid;moins.setAttribute('aria-label','Diminuer la quantité');plus.setAttribute('aria-label','Augmenter la quantité');
   const maj=()=>{out.textContent=String(qte);dessinerContact();};w.append(l,moins,out,plus);corps.append(w);
  }
  if(x.kind==='produits'&&disponible(x)&&ajouterPanier){const b=button('Ajouter au panier',async()=>{b.disabled=true;try{await ajouter(x,qte);}finally{b.disabled=false;}},'cart');corps.append(b);}
  dessinerContact();corps.append(contact);
  if(x.kind==='services'&&requestService){const zone=node('div');const b=button('Demander ce service dans l’application',async()=>{try{await requestService(x,zone);}catch(e){say(e.message);}},'cart');corps.append(b,zone);}
  // Navigation vers les fiches liées.
  const lies=node('section',null,'cat-related');
  const v=idx.vendeur(x),bo=idx.boutique(x);
  if(x.kind==='produits'&&bo)lies.append(button('Voir la boutique « '+bo.nom+' »',()=>go('fiche',{id:bo.id})));
  if(x.kind!=='professionnels'&&v)lies.append(button('Voir le commerce « '+v.nom+' »',()=>go('fiche',{id:v.id})));
  const groupe=(titre,rows)=>{if(!rows.length)return;lies.append(node('h4',titre));const g=node('div',null,'cat-grid');for(const r of rows)g.append(carte(r));lies.append(g);};
  if(x.kind==='boutiques')groupe('Produits de la boutique',idx.enfants(x.id,'produits'));
  if(x.kind==='professionnels'){groupe('Boutiques',idx.enfants(x.id,'boutiques'));groupe('Services',idx.enfants(x.id,'services'));}
  if(lies.children.length)art.append(lies);
  majPanier=()=>{for(const card of art.querySelectorAll('.cat-card'))if(card._zone)actionsCarte(card._x,card._zone);};
 }

 async function charger(){host.replaceChildren(node('p','Chargement du catalogue…','cat-count'));idx=indexCatalogue(await api.catalog());if(stack.at(-1).view==='fiche'&&!idx.get(stack.at(-1).params.id))stack.length=1;render();}
 await charger();
 return {recharger:charger,get index(){return idx;}};
}
