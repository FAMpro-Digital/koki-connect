// Catalogue public Commerces & Services (téléphone d'abord) : Commerces, Boutiques, Produits, Services.
// Recherche, filtres, fiches détaillées avec galerie, Appeler / WhatsApp / Commander sur WhatsApp, panier interne.
import {ONGLETS,indexCatalogue,filtrer,compter,categories,villages,villageDe,contacts,lienCommande,lienDevis,etiquetteDisponibilite,disponible,promotion,lienCarte} from './catalogue-state.mjs';
import './commerce-contract.js';
const C=globalThis.KokiCommerceContract;
const PAGE=24;
const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(className)e.className=className;return e;};
let uid=0;const nid=p=>'cat-'+p+'-'+(++uid);
function button(label,fn,kind='secondary'){const b=node('button',label,'cat-btn cat-btn-'+kind);b.type='button';b.onclick=fn;return b;}
function lien(label,href,kind){const a=node('a',label,'cat-btn cat-btn-'+kind);a.href=href;if(/^https:/.test(href)){a.target='_blank';a.rel='noopener noreferrer';}return a;}
function select(host,label,values,value,onchange){const w=node('div',null,'cat-field'),id=nid('s'),l=node('label',label),s=node('select');l.htmlFor=id;s.id=id;for(const v of values){const o=node('option',v.label??v);o.value=v.value??v;s.append(o);}s.value=value;s.onchange=()=>onchange(s.value);w.append(l,s);host.append(w);return s;}
function prixBloc(x){
 const p=node('p',null,'cat-price');
 if(x.kind==='services'){p.append(node('strong',x.tarif==='devis'||!Number.isInteger(x.prix)?'Sur devis':C.formaterPrix(x.prix)));return p;}
 if(x.kind!=='produits')return null;
 p.append(node('strong',C.formaterPrix(x.prix)));
 if(promotion(x)){const s=node('s',C.formaterPrix(x.ancien_prix));s.setAttribute('aria-label','Ancien prix : '+C.formaterPrix(x.ancien_prix));p.append(' ',s,' ',node('span','−'+promotion(x)+' %','cat-promo'));}
 return p;
}
function badge(x){const t=etiquetteDisponibilite(x);if(!t)return null;return node('span',t,'cat-badge '+(disponible(x)?'cat-ok':'cat-off'));}

export async function catalogue(host,{api,addToCart,requestService,raccourcis=[]}){
 let idx=indexCatalogue([]);const f={kind:'produits',query:'',categorie:'',village:'',disponibles:false,tri:'recent'};let limite=PAGE;
 const stack=[{view:'liste'}];const images=new Map();
 const message=node('p',null,'cat-message');message.setAttribute('role','status');
 const say=t=>{message.textContent=t;};
 async function photo(img,path){try{if(!images.has(path))images.set(path,api.image(path));img.src=await images.get(path);}catch{images.delete(path);img.alt='Photo indisponible';img.classList.add('cat-photo-off');}}
 // Les images se chargent quand elles approchent de l'écran (économie de données mobiles).
 const watcher=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){watcher.unobserve(e.target);photo(e.target,e.target.dataset.path);}},{rootMargin:'300px'}):null;
 function vignette(path,alt){const img=node('img');img.alt=alt;img.loading='lazy';img.decoding='async';img.width=320;img.height=240;if(!path){img.src='assets/commerce/illustration.svg';img.classList.add('cat-photo-vide');return img;}img.dataset.path=path;if(watcher)watcher.observe(img);else photo(img,path);return img;}

 function go(view,params){say('');stack.push({view,params});try{history.pushState({...(history.state||{}),kokiCat:stack.length},'');}catch{}render();host.scrollIntoView({block:'start'});}
 function back(){if(stack.length<=1)return;try{if(history.state?.kokiCat===stack.length){history.back();return;}}catch{}stack.pop();render();}
 const onPop=e=>{if(!host.isConnected){window.removeEventListener('popstate',onPop);return;}const depth=e.state?.kokiCat||1;if(depth<stack.length){stack.length=Math.max(1,depth);render();}};
 window.addEventListener('popstate',onPop);

 function render(){const top=stack.at(-1);host.replaceChildren();if(top.view==='liste')liste();else fiche(top.params.id);}

 function carte(x){
  const b=node('button',null,'cat-card');b.type='button';b.setAttribute('aria-label',x.nom+(x.kind==='produits'||x.kind==='services'?' — '+(x.kind==='services'&&(x.tarif==='devis'||!Number.isInteger(x.prix))?'sur devis':C.formaterPrix(x.prix)):''));
  b.append(vignette(x.photos[0],''));const body=node('span',null,'cat-card-body');
  body.append(node('span',x.nom,'cat-card-title'));const p=prixBloc(x);if(p)body.append(p);
  const meta=[x.kind==='produits'?idx.boutique(x)?.nom:x.kind!=='professionnels'?idx.vendeur(x)?.nom:x.categorie,villageDe(x,idx)].filter(Boolean).join(' · ');if(meta)body.append(node('span',meta,'cat-meta'));
  const bd=badge(x);if(bd)body.append(bd);b.append(body);b.onclick=()=>go('fiche',{id:x.id});return b;
 }

 function liste(){
  const bar=node('div',null,'cat-bar');
  const recherche=node('div',null,'cat-search'),sid=nid('q'),sl=node('label','Rechercher : nom, métier, catégorie ou village'),q=node('input');sl.htmlFor=sid;q.id=sid;q.type='search';q.enterKeyHint='search';q.autocomplete='off';q.value=f.query;q.placeholder='Ex. riz, couture, Coki…';
  let t;q.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{f.query=q.value;limite=PAGE;dessiner();},150);};recherche.append(sl,q);
  const rapides=node('div',null,'cat-shortcuts');for(const r of raccourcis)rapides.append(button(r.label,r.action,'link'));
  // Le retour à l'accueil reste le bouton de la rubrique, en tête de section.
  bar.append(rapides,recherche);host.append(bar,message);
  const tabs=node('div',null,'cat-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Rubriques du catalogue');host.append(tabs);
  const filtres=node('div',null,'cat-filters');host.append(filtres);
  const compte=node('p',null,'cat-count');compte.setAttribute('aria-live','polite');const grille=node('div',null,'cat-grid');grille.setAttribute('role','tabpanel');const plus=node('div');host.append(compte,grille,plus);
  function dessiner(){
   const n=compter(idx,f);tabs.replaceChildren();
   for(const o of ONGLETS){const b=node('button',o.label+' ('+n[o.kind]+')','cat-tab');b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(o.kind===f.kind));b.onclick=()=>{if(f.kind===o.kind)return;f.kind=o.kind;f.categorie='';f.village='';limite=PAGE;dessiner();};tabs.append(b);}
   filtres.replaceChildren();
   const cats=categories(idx,f.kind),vils=villages(idx,f.kind);if(f.categorie&&!cats.includes(f.categorie))f.categorie='';if(f.village&&!vils.includes(f.village))f.village='';
   select(filtres,f.kind==='services'?'Métier':'Catégorie',[{value:'',label:'Toutes'},...cats],f.categorie,v=>{f.categorie=v;limite=PAGE;dessiner();});
   select(filtres,'Village ou quartier',[{value:'',label:'Tous'},...vils],f.village,v=>{f.village=v;limite=PAGE;dessiner();});
   if(f.kind==='produits'||f.kind==='services'){
    select(filtres,'Trier',[{value:'recent',label:'Plus récents'},{value:'prix',label:'Prix croissant'},{value:'prix-desc',label:'Prix décroissant'},{value:'nom',label:'Nom'}],f.tri,v=>{f.tri=v;dessiner();});
    const l=node('label',null,'cat-toggle'),c=node('input');c.type='checkbox';c.checked=f.disponibles;c.onchange=()=>{f.disponibles=c.checked;limite=PAGE;dessiner();};l.append(c,' Disponibles seulement');filtres.append(l);
   }
   if(f.query||f.categorie||f.village||f.disponibles)filtres.append(button('Effacer les filtres',()=>{Object.assign(f,{query:'',categorie:'',village:'',disponibles:false});q.value='';limite=PAGE;dessiner();},'link'));
   const res=filtrer(idx,f);compte.textContent=res.length+' résultat'+(res.length>1?'s':'');
   grille.replaceChildren();plus.replaceChildren();
   if(!res.length)grille.append(node('p',idx.liste.length?'Aucun résultat. Essayez un autre mot ou retirez un filtre.':'Aucun commerce ou service validé pour le moment.','cat-empty'));
   for(const x of res.slice(0,limite))grille.append(carte(x));
   if(res.length>limite)plus.append(button('Voir plus ('+(res.length-limite)+')',()=>{limite+=PAGE;dessiner();}));
  }
  dessiner();
 }

 function galerie(x){
  const g=node('div',null,'cat-gallery');if(!x.photos.length){g.append(vignette(null,''));return g;}
  const rail=node('div',null,'cat-rail');rail.tabIndex=0;rail.setAttribute('aria-label','Photos de '+x.nom+' : faites glisser pour les voir');
  x.photos.forEach((p,i)=>{const fig=node('figure');fig.append(vignette(p,'Photo '+(i+1)+' sur '+x.photos.length+' : '+x.nom));rail.append(fig);});
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
  art.append(galerie(x));const h=node('h3',x.nom,'cat-title');h.tabIndex=-1;art.append(h);queueMicrotask(()=>h.focus({preventScroll:true}));
  const p=prixBloc(x);if(p)art.append(p);const bd=badge(x);if(bd)art.append(bd);
  const i=infos(x);if(i)art.append(i);if(x.description)art.append(node('p',x.description,'cat-description'));
  let qte=1;const contact=node('div');
  const dessinerContact=()=>{contact.replaceChildren(liens(x,qte));};
  if(x.kind==='produits'&&disponible(x)){
   const w=node('div',null,'cat-qty'),qid=nid('n'),l=node('label','Quantité'),moins=button('−',()=>{if(qte>1){qte--;maj();}}),plus=button('+',()=>{if(qte<Math.min(x.stock,99)){qte++;maj();}}),out=node('output','1');
   l.htmlFor=qid;out.id=qid;moins.setAttribute('aria-label','Diminuer la quantité');plus.setAttribute('aria-label','Augmenter la quantité');
   const maj=()=>{out.textContent=String(qte);dessinerContact();};w.append(l,moins,out,plus);art.append(w);
  }
  dessinerContact();art.append(contact);
  if(x.kind==='produits'&&disponible(x)&&addToCart){const b=button('Ajouter au panier',async()=>{b.disabled=true;try{await addToCart(x,qte);say('« '+x.nom+' » ajouté au panier ('+qte+').');}catch(e){say(e.message);}finally{b.disabled=false;}},'cart');art.append(b);}
  if(x.kind==='services'&&requestService){const zone=node('div');const b=button('Demander ce service dans l’application',async()=>{try{await requestService(x,zone);}catch(e){say(e.message);}},'cart');art.append(b,zone);}
  // Navigation vers les fiches liées.
  const lies=node('section',null,'cat-related');
  const v=idx.vendeur(x),bo=idx.boutique(x);
  if(x.kind==='produits'&&bo)lies.append(button('Voir la boutique « '+bo.nom+' »',()=>go('fiche',{id:bo.id})));
  if(x.kind!=='professionnels'&&v)lies.append(button('Voir le commerce « '+v.nom+' »',()=>go('fiche',{id:v.id})));
  const groupe=(titre,rows)=>{if(!rows.length)return;lies.append(node('h4',titre));const g=node('div',null,'cat-grid');for(const r of rows)g.append(carte(r));lies.append(g);};
  if(x.kind==='boutiques')groupe('Produits de la boutique',idx.enfants(x.id,'produits'));
  if(x.kind==='professionnels'){groupe('Boutiques',idx.enfants(x.id,'boutiques'));groupe('Services',idx.enfants(x.id,'services'));}
  if(lies.children.length)art.append(lies);
 }

 async function charger(){host.replaceChildren(node('p','Chargement du catalogue…','cat-count'));idx=indexCatalogue(await api.catalog());render();}
 await charger();
 return {recharger:charger,get index(){return idx;}};
}
