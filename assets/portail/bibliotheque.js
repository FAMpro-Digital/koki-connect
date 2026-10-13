// Éducation · Bibliothèque : livres gratuits et payants, téléchargement hors ligne, « Mes livres ».
// Données : flux public koki_public_feed (contrat koki.education.book). Fichiers : liens Storage temporaires.
(function(){'use strict';
const L=KokiLivreContract,H=KokiLivresHorsLigne,C=KokiPortailCore,$=id=>document.getElementById(id);
const TITRE='Éducation · Bibliothèque',TITRE_MES='Éducation · Mes livres';
let generation=0,filtre={acces:'Tous',categorie:'Toutes',q:''},urlLecture=null,enCours=new Map();
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
function ouvrir(t){return KokiPortail.ouvrir(t);}
function actif(t){return $('portail-titre').textContent===t;}
function livres(feed){return feed.contenus.map(row=>({row,livre:L.decode(row)})).filter(x=>x.livre&&!x.livre.archive&&C.visible(x.row));}
function photo(row,parent){if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';parent.append(img);}}
function badge(livre){return livre.acces==='Gratuit'?n('span','Gratuit','biblio-badge biblio-gratuit'):n('span',L.prix(livre.prix),'biblio-badge biblio-payant');}
function whatsapp(livre,row){const d=String(livre.whatsapp||'').replace(/[^0-9]/g,'');if(d.length<9)return null;const num=d.length===9?'221'+d:d;const a=n('a','Commander sur WhatsApp','portail-more biblio-action');a.href='https://wa.me/'+num+'?text='+encodeURIComponent('Bonjour, je souhaite '+(livre.acces==='Payant'?'acheter':'obtenir')+' le livre « '+row.titre+' »'+(livre.acces==='Payant'?' ('+L.prix(livre.prix)+')':'')+', vu sur Koki Connect.');a.target='_blank';a.rel='noopener';return a;}

async function bibliotheque(){
 const g=++generation,box=ouvrir(TITRE);box.append(n('p','Chargement des livres publiés…'));
 let items;try{items=livres(await KokiPublicFeed.charger());}
 catch{if(g!==generation||!actif(TITRE))return;box.replaceChildren(n('p','La bibliothèque est indisponible. Vérifiez votre connexion.'),b('Réessayer',bibliotheque),b('📥 Mes livres téléchargés ('+H.liste().length+')',mesLivres));return;}
 if(g!==generation||!actif(TITRE))return;box.replaceChildren();
 const search=n('input');search.type='search';search.placeholder='Titre, matière, niveau, auteur…';search.setAttribute('aria-label','Rechercher un livre');search.value=filtre.q;
 const tabs=n('div',undefined,'biblio-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Type d’accès');
 const cat=n('select');cat.setAttribute('aria-label','Catégorie');for(const v of ['Toutes',...L.categories]){const o=n('option',v==='Toutes'?'Toutes les catégories':v);o.value=v;cat.append(o);}cat.value=filtre.categorie;
 const compte=n('p',undefined,'portail-meta');compte.setAttribute('aria-live','polite');
 const grid=n('div',undefined,'portail-grid');
 function render(){
  filtre.q=C.normaliser(search.value.trim());filtre.categorie=cat.value;
  const base=L.filtrer(items,{categorie:filtre.categorie,q:filtre.q},C.normaliser);
  const nb={Tous:base.length,Gratuit:base.filter(x=>x.livre.acces==='Gratuit').length,Payant:base.filter(x=>x.livre.acces==='Payant').length};
  tabs.replaceChildren(...[['Tous','Tous'],['Gratuit','Gratuits'],['Payant','Payants']].map(([v,l])=>{const t=b(l+' · '+nb[v],()=>{filtre.acces=v;render();},'biblio-tab');t.setAttribute('aria-pressed',String(filtre.acces===v));return t;}));
  const rows=filtre.acces==='Tous'?base:base.filter(x=>x.livre.acces===filtre.acces);
  compte.textContent=rows.length+(rows.length>1?' livres':' livre');grid.replaceChildren();
  for(const {row,livre} of rows){const a=n('article',undefined,'portail-card biblio-card');photo(row,a);
   a.append(n('p',livre.categorie+(livre.niveau?' · '+livre.niveau:''),'portail-meta'),n('h3',row.titre));
   if(livre.auteur)a.append(n('p',livre.auteur));
   a.append(n('p',livre.format+(livre.taille_mo&&L.telechargeable(livre)?' · '+livre.taille_mo+' Mo':'')+(livre.fournisseur?' · '+livre.fournisseur:''),'portail-meta'));
   const ligne=n('div',undefined,'biblio-ligne');ligne.append(badge(livre));if(H.present(row.id))ligne.append(n('span','📥 Hors ligne','biblio-hors-ligne'));a.append(ligne,b('Voir le livre',()=>detail(row)));grid.append(a);}
  if(!rows.length)grid.append(n('p','Aucun livre publié pour cette recherche.'));
 }
 search.oninput=render;cat.onchange=render;
 const actions=n('div',undefined,'portail-actions');actions.append(b('📥 Mes livres ('+H.liste().length+')',mesLivres),b('Actualiser',bibliotheque),b('🏫 Établissements scolaires',KokiPortail.education));
 box.append(search,tabs,cat,actions,compte,grid);render();
}

function detail(row){
 const livre=L.decode(row);if(!livre)return;const box=ouvrir(row.titre),a=n('article',undefined,'portail-card');photo(row,a);
 a.append(n('p',livre.categorie+(livre.niveau?' · '+livre.niveau:''),'portail-meta'),n('h2',row.titre));if(livre.auteur)a.append(n('p',livre.auteur));
 const ligne=n('div',undefined,'biblio-ligne');ligne.append(badge(livre));a.append(ligne,n('p',row.resume));if(livre.description)a.append(n('p',livre.description));
 const dl=n('dl',undefined,'biblio-infos');for(const [k,v] of [['Accès',livre.acces==='Gratuit'?'Gratuit':L.prix(livre.prix)],['Format',livre.format],['Fourni par',livre.fournisseur||row.source||''],['Taille',L.telechargeable(livre)&&livre.taille_mo?livre.taille_mo+' Mo':'']])if(v)dl.append(n('dt',k),n('dd',v));a.append(dl);
 const zone=n('div',undefined,'biblio-zone');a.append(zone);
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
 actions();box.append(a,b('Retour à la bibliothèque',bibliotheque));
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
 box.append(n('p',xs.length?xs.length+(xs.length>1?' livres':' livre')+' sur ce téléphone · '+H.mo(octets)+' utilisés':'Aucun livre téléchargé pour le moment.','portail-meta'));
 const grid=n('div',undefined,'portail-grid');
 for(const x of xs){const a=n('article',undefined,'portail-card'),zone=n('div',undefined,'biblio-zone');
  a.append(n('h3',x.titre),n('p',x.format+' · '+H.mo(x.octets)+' · téléchargé le '+new Date(x.date).toLocaleDateString('fr-FR',{timeZone:'Africa/Dakar'}),'portail-meta'),n('p','📥 Disponible sans internet','biblio-hors-ligne'),zone);
  zone.append(b('Lire',()=>lire(x.id,zone),'biblio-principal'),b('Supprimer du téléphone',async()=>{if(!confirm('Supprimer « '+x.titre+' » de ce téléphone ?'))return;await H.supprimer(x.id);mesLivres();}));grid.append(a);}
 box.append(grid,n('p','Les livres achetés et les commandes apparaîtront ici avec le paiement en ligne.','portail-note'),b('Retour à la bibliothèque',bibliotheque));
}

window.KokiBibliotheque={ouvrir:bibliotheque,detail,mesLivres};
})();
