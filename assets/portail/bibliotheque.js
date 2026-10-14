// Éducation · Bibliothèque : livres gratuits et payants, téléchargement hors ligne, « Mes livres ».
// Interface façon liseuse : couvertures, rayons par catégorie, puces de filtre, fiche avec action principale.
// Données : flux public koki_public_feed (contrat koki.education.book). Fichiers : liens Storage temporaires.
(function(){'use strict';
const L=KokiLivreContract,H=KokiLivresHorsLigne,C=KokiPortailCore,$=id=>document.getElementById(id);
const TITRE='📚 Bibliothèque',TITRE_MES='📥 Mes livres';
let generation=0,filtre={acces:'Tous',categorie:'Toutes',q:''},urlLecture=null,enCours=new Map();
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
function ouvrir(t){return KokiPortail.ouvrir(t);}
function actif(t){return $('portail-titre').textContent===t;}
function livres(feed){return feed.contenus.map(row=>({row,livre:L.decode(row)})).filter(x=>x.livre&&!x.livre.archive&&C.visible(x.row));}
function photo(row,parent){if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';parent.append(img);}}
function badge(livre){return livre.acces==='Gratuit'?n('span','Gratuit','biblio-badge biblio-gratuit'):n('span',L.prix(livre.prix),'biblio-badge biblio-payant');}
function whatsapp(livre,row){const d=String(livre.whatsapp||'').replace(/[^0-9]/g,'');if(d.length<9)return null;const num=d.length===9?'221'+d:d;const a=n('a','Commander sur WhatsApp','portail-more biblio-action');a.href='https://wa.me/'+num+'?text='+encodeURIComponent('Bonjour, je souhaite '+(livre.acces==='Payant'?'acheter':'obtenir')+' le livre « '+row.titre+' »'+(livre.acces==='Payant'?' ('+L.prix(livre.prix)+')':'')+', vu sur Koki Connect.');a.target='_blank';a.rel='noopener';return a;}

// Couverture : photo publiée, sinon couverture dessinée aux couleurs Koki Connect (vert foncé, vert, orange).
const TEINTES={'Scolaire':['#0b5a3c','#087a3d'],'Coran & religion':['#0b5a3c','#13704a'],'Alphabétisation':['#c25e0e','#f28c28'],'Formation pro':['#087a3d','#2e9b5f'],'Jeunesse':['#f28c28','#f7a94f'],'Autre':['#3b4a42','#5d6e64']};
const ICONES={'Scolaire':'✏️','Coran & religion':'🕌','Alphabétisation':'🔤','Formation pro':'🛠️','Jeunesse':'🧸','Autre':'📘'};
function couverture(row,livre,taille='moyenne'){
 const c=n('div',undefined,'biblio-couv biblio-couv-'+taille);
 if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';c.append(img);c.classList.add('biblio-couv-photo');}
 else{const [a,z]=TEINTES[livre.categorie]||TEINTES.Autre;c.style.background='linear-gradient(160deg,'+a+','+z+')';
  c.append(n('span',ICONES[livre.categorie]||'📘','biblio-couv-icone'),n('strong',row.titre,'biblio-couv-titre'));if(livre.auteur)c.append(n('span',livre.auteur,'biblio-couv-auteur'));}
 c.append(livre.acces==='Gratuit'?n('span','Gratuit','biblio-couv-badge biblio-couv-gratuit'):n('span',L.prix(livre.prix),'biblio-couv-badge biblio-couv-payant'));
 if(H.present(row.id)){const h=n('span','✓','biblio-couv-hl');h.title='Disponible hors ligne';h.setAttribute('aria-label','Disponible hors ligne');c.append(h);}
 return c;
}
// Vignette cliquable (couverture + titre + auteur) pour les grilles et les rayons.
function vignette({row,livre}){const a=n('button',undefined,'biblio-vignette');a.type='button';a.onclick=()=>detail(row);a.setAttribute('aria-label',row.titre+(livre.auteur?', '+livre.auteur:'')+', '+(livre.acces==='Gratuit'?'gratuit':L.prix(livre.prix)));
 a.append(couverture(row,livre),n('span',row.titre,'biblio-vignette-titre'),n('span',livre.auteur||livre.categorie,'biblio-vignette-auteur'));return a;}
function rayon(titre,items,voirTout){const s=n('section',undefined,'biblio-rayon');const t=n('div',undefined,'biblio-rayon-tete');t.append(n('h3',titre));if(voirTout)t.append(b('Voir tout',voirTout,'biblio-voir'));
 const l=n('div',undefined,'biblio-etagere');for(const x of items)l.append(vignette(x));s.append(t,l);return s;}
async function charger(){return livres(await KokiPublicFeed.charger());}

async function bibliotheque(categorie){
 if(typeof categorie==='string')filtre={acces:'Tous',categorie,q:''};
 const g=++generation,box=ouvrir(TITRE);box.append(n('p','Chargement des livres publiés…','portail-meta'));
 let items;try{items=await charger();}
 catch{if(g!==generation||!actif(TITRE))return;box.replaceChildren(n('p','La bibliothèque est indisponible. Vérifiez votre connexion.','portail-note'),b('Réessayer',()=>bibliotheque()),b('📥 Mes livres téléchargés ('+H.liste().length+')',mesLivres));return;}
 if(g!==generation||!actif(TITRE))return;box.replaceChildren();
 const outils=n('div',undefined,'biblio-outils');
 const rech=n('label',undefined,'biblio-recherche');const search=n('input');search.type='search';search.placeholder='Titre, matière, niveau, auteur…';search.setAttribute('aria-label','Rechercher un livre');search.value=filtre.q;rech.append(n('span','🔎','biblio-loupe'),search);
 const mes=b('📥 '+H.liste().length,mesLivres,'biblio-mes');mes.setAttribute('aria-label','Mes livres téléchargés : '+H.liste().length);
 const ligne1=n('div',undefined,'biblio-outils-ligne');ligne1.append(rech,mes);
 const puces=n('div',undefined,'biblio-puces');puces.setAttribute('role','group');puces.setAttribute('aria-label','Catégorie');
 const tabs=n('div',undefined,'biblio-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Type d’accès');
 outils.append(ligne1,puces,tabs);
 const compte=n('p',undefined,'portail-meta biblio-compte');compte.setAttribute('aria-live','polite');
 const grid=n('div',undefined,'biblio-grille');
 function render(){
  filtre.q=C.normaliser(search.value.trim());
  puces.replaceChildren(...['Toutes',...L.categories].map(v=>{const nb=v==='Toutes'?items.length:items.filter(x=>x.livre.categorie===v).length;if(!nb&&v!=='Toutes'&&filtre.categorie!==v)return null;
   const p=b((v==='Toutes'?'Tout':(ICONES[v]+' '+v)),()=>{filtre.categorie=v;render();},'biblio-puce');p.setAttribute('aria-pressed',String(filtre.categorie===v));return p;}).filter(Boolean));
  const base=L.filtrer(items,{categorie:filtre.categorie,q:filtre.q},C.normaliser);
  const nb={Tous:base.length,Gratuit:base.filter(x=>x.livre.acces==='Gratuit').length,Payant:base.filter(x=>x.livre.acces==='Payant').length};
  tabs.replaceChildren(...[['Tous','Tous'],['Gratuit','Gratuits'],['Payant','Payants']].map(([v,l])=>{const t=b(l+' · '+nb[v],()=>{filtre.acces=v;render();},'biblio-tab');t.setAttribute('aria-pressed',String(filtre.acces===v));return t;}));
  const rows=filtre.acces==='Tous'?base:base.filter(x=>x.livre.acces===filtre.acces);
  compte.textContent=rows.length+(rows.length>1?' livres':' livre');grid.replaceChildren(...rows.map(vignette));
  if(!rows.length)grid.append(n('p',items.length?'Aucun livre pour cette recherche.':'Aucun livre publié pour le moment.','portail-meta biblio-vide'));
 }
 search.oninput=render;
 box.append(outils,compte,grid);render();
}

function detail(row){
 const livre=L.decode(row);if(!livre)return;const box=ouvrir(row.titre);
 const tete=n('div',undefined,'biblio-fiche-tete');const infos=n('div',undefined,'biblio-fiche-infos');
 infos.append(n('p',(ICONES[livre.categorie]||'📘')+' '+livre.categorie+(livre.niveau?' · '+livre.niveau:''),'biblio-fiche-cat'),n('h2',row.titre));
 if(livre.auteur)infos.append(n('p',livre.auteur,'biblio-fiche-auteur'));
 const puces=n('div',undefined,'biblio-ligne');puces.append(livre.acces==='Gratuit'?n('span','Gratuit','biblio-badge biblio-gratuit'):n('span',L.prix(livre.prix),'biblio-badge biblio-payant'),n('span',livre.format,'biblio-badge biblio-format'));
 if(L.telechargeable(livre)&&livre.taille_mo)puces.append(n('span',livre.taille_mo+' Mo','biblio-badge biblio-format'));infos.append(puces);
 tete.append(couverture(row,livre,'grande'),infos);
 const a=n('article',undefined,'biblio-fiche');const zone=n('div',undefined,'biblio-zone');a.append(tete,zone);
 const apropos=n('section',undefined,'biblio-apropos');apropos.append(n('h3','À propos'),n('p',row.resume));if(livre.description)apropos.append(n('p',livre.description));
 const dl=n('dl',undefined,'biblio-infos');for(const [k,v] of [['Accès',livre.acces==='Gratuit'?'Gratuit':L.prix(livre.prix)],['Format',livre.format],['Niveau',livre.niveau],['Fourni par',livre.fournisseur||row.source||''],['Taille',L.telechargeable(livre)&&livre.taille_mo?livre.taille_mo+' Mo':'']])if(v)dl.append(n('dt',k),n('dd',v));apropos.append(dl);a.append(apropos);
 function actions(){zone.replaceChildren();
  if(L.telechargeable(livre)){
   if(H.present(row.id)){zone.append(n('p','✓ Téléchargé · disponible sans internet','biblio-ok'),b('Lire hors ligne',()=>lire(row.id,zone)),b('Supprimer du téléphone',async()=>{if(!confirm('Supprimer « '+row.titre+' » de ce téléphone ?'))return;await H.supprimer(row.id);actions();}));return;}
   const job=enCours.get(row.id);if(job){progression(job);return;}
   zone.append(b('Télécharger'+(livre.taille_mo?' · '+livre.taille_mo+' Mo':''),demarrer,'biblio-principal'),b('Lire en ligne',async e=>{const btn=e.currentTarget;btn.disabled=true;try{const lien=n('a','Ouvrir le livre en ligne','portail-more biblio-action');lien.href=await KokiPublicFeed.signerFichier(livre.fichier);lien.target='_blank';lien.rel='noopener';btn.replaceWith(lien);}catch(err){btn.disabled=false;alert(err.message||'Lien indisponible.');}}),n('p','Une fois téléchargé, le livre reste lisible sans internet.','portail-meta'));
   if(!H.disponible())zone.append(n('p','Ce navigateur ne permet pas le téléchargement hors ligne ; utilisez « Lire en ligne ».','portail-note'));
  }else if(livre.acces==='Payant'){
   zone.append(n('p','Prix : '+L.prix(livre.prix),'biblio-prix'));const w=whatsapp(livre,row);if(w)zone.append(w);
   zone.append(n('p','Le paiement en ligne (Wave, Orange Money) et le téléchargement des livres payants arrivent dans une prochaine étape. En attendant, commandez directement auprès du fournisseur.','portail-note'));
  }else{zone.append(n('p',livre.format==='Livre papier'?'Livre papier : disponible auprès de '+(livre.fournisseur||'son fournisseur')+'.':'Fichier pas encore disponible.','portail-meta'));const w=whatsapp(livre,row);if(w)zone.append(w);}
 }
 function progression(job){const p=n('progress');p.max=100;p.value=job.pct;p.setAttribute('aria-label','Progression du téléchargement');const t=n('p',job.texte,'portail-meta');t.setAttribute('aria-live','polite');zone.append(n('p','Téléchargement en cours…'),p,t,b('Annuler',()=>job.ctrl.abort()));job.vue={p,t};}
 async function demarrer(){
  const job={ctrl:new AbortController(),pct:0,texte:'Préparation…',vue:null};enCours.set(row.id,job);actions();
  try{const url=await KokiPublicFeed.signerFichier(livre.fichier);
   await H.telecharger(row.id,{titre:row.titre,format:livre.format,acces:livre.acces},url,{signal:job.ctrl.signal,onProgress:(recu,total)=>{job.pct=total?Math.min(100,Math.round(recu/total*100)):0;job.texte=H.mo(recu)+(total?' sur '+H.mo(total)+' · '+job.pct+' %':'');if(job.vue&&job.vue.p.isConnected){job.vue.p.value=job.pct;job.vue.t.textContent=job.texte;}}});
   enCours.delete(row.id);if(zone.isConnected)actions();
  }catch(err){enCours.delete(row.id);if(zone.isConnected){actions();if(err.name!=='AbortError')zone.prepend(n('p',err.message||'Téléchargement interrompu. Réessayez.','portail-note'));}}
 }
 actions();box.append(a);
 // Dans le même rayon : jusqu'à 10 autres livres de la catégorie.
 charger().then(items=>{const memes=items.filter(x=>x.row.id!==row.id&&x.livre.categorie===livre.categorie).slice(0,10);if(memes.length&&a.isConnected)box.append(rayon('Dans le même rayon',memes,()=>bibliotheque(livre.categorie)));}).catch(()=>{});
}

async function lire(id,zone){
 let f;try{f=await H.ouvrir(id);}catch(_){f=null;}
 if(!f){alert('Ce livre n’est plus sur le téléphone. Téléchargez-le à nouveau.');return;}
 if(urlLecture)URL.revokeObjectURL(urlLecture);urlLecture=URL.createObjectURL(f.blob);
 const panneau=n('div',undefined,'portail-panel biblio-lecteur');
 if(f.type.startsWith('audio/')){const au=n('audio');au.controls=true;au.src=urlLecture;au.style.width='100%';panneau.append(au);}
 const ouvrirLien=n('a','Ouvrir le livre','portail-more biblio-action');ouvrirLien.href=urlLecture;ouvrirLien.target='_blank';ouvrirLien.rel='noopener';
 const meta=H.liste().find(x=>x.id===id),ext={'application/pdf':'.pdf','application/epub+zip':'.epub','audio/mpeg':'.mp3','audio/mp4':'.m4a','audio/x-m4a':'.m4a'}[f.type]||'';
 const garder=n('a','Enregistrer dans Fichiers','portail-more biblio-action');garder.href=urlLecture;garder.download=((meta&&meta.titre)||'livre').replace(/[\\/:*?"<>|]/g,'-')+ext;
 if(!f.type.startsWith('audio/'))panneau.append(ouvrirLien);panneau.append(garder);
 zone.querySelectorAll('.biblio-lecteur').forEach(e=>e.remove());zone.append(panneau);
}

async function mesLivres(){
 ++generation;const box=ouvrir(TITRE_MES),xs=H.liste(),{octets}=await H.espace();if(!actif(TITRE_MES))return;
 const resume=n('div',undefined,'biblio-mes-resume');resume.append(n('strong',xs.length?xs.length+(xs.length>1?' livres':' livre')+' sur ce téléphone':'Aucun livre téléchargé'),n('span',xs.length?H.mo(octets)+' utilisés · lisibles sans internet':'Téléchargez un livre gratuit pour le lire sans internet.'));
 box.append(resume);const grid=n('div',undefined,'biblio-liste');
 for(const x of xs){const a=n('article',undefined,'biblio-mes-carte'),zone=n('div',undefined,'biblio-zone');
  const icone=n('div',/Audio/.test(x.format)?'🎧':'📖','biblio-mes-icone');const t=n('div',undefined,'biblio-mes-texte');
  t.append(n('h3',x.titre),n('p',x.format+' · '+H.mo(x.octets)+' · le '+new Date(x.date).toLocaleDateString('fr-FR',{timeZone:'Africa/Dakar'}),'portail-meta'));
  zone.append(b('Lire',()=>lire(x.id,zone),'biblio-principal'),b('Supprimer',async()=>{if(!confirm('Supprimer « '+x.titre+' » de ce téléphone ?'))return;await H.supprimer(x.id);mesLivres();},'biblio-secondaire'));
  a.append(icone,t,zone);grid.append(a);}
 box.append(grid,n('p','Les livres achetés apparaîtront ici avec le paiement en ligne.','portail-note'),b('📚 Parcourir la bibliothèque',()=>bibliotheque(),'biblio-principal'));
}

window.KokiBibliotheque={ouvrir:bibliotheque,detail,mesLivres,couverture,vignette,rayon,charger,teintes:TEINTES,icones:ICONES};
})();
