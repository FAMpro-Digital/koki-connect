// Rubrique Services publics : annuaire des services (horaires, « Ouvert maintenant », appel, itinéraire),
// guides des démarches (pièces à fournir, étapes, coût, délai, où s'adresser) et avis officiels.
// Données : flux public, contrat koki.service.* (voir service-contract.js) ; numéros utiles des groupes concernés.
(function(){'use strict';
const S=KokiServiceContract,C=KokiPortailCore,$=id=>document.getElementById(id);
const TITRE='🏛️ Services publics',ONGLETS=[['annuaire','Annuaire'],['demarches','Démarches'],['avis','Avis officiels']];
const GROUPES=['Administration','Sécurité','Eau et électricité'];
let generation=0,etat={onglet:'annuaire',famille:'tout',ouvert:false,domaine:'Tous',q:''};
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
function lien(text,href,cls,externe){const a=n('a',text,cls);a.href=href;if(externe){a.target='_blank';a.rel='noopener';}return a;}
const tel=x=>'tel:'+String(x).replace(/[^+0-9]/g,'');
const date=iso=>new Date(iso).toLocaleDateString('fr-FR',{timeZone:'Africa/Dakar',day:'numeric',month:'long'});
const actif=t=>$('portail-titre').textContent===t;
function donnees(feed){
 const services=[],demarches=[],avis=[],numeros=[];
 for(const row of feed.contenus){if(!C.visible(row))continue;
  const s=S.decodeService(row);if(s){if(!s.archive)services.push({row,v:s});continue;}
  const d=S.decodeDemarche(row);if(d){if(!d.archive)demarches.push({row,v:d});continue;}
  const num=window.KokiNumeroContract?.decode(row);if(num){if(!num.archive&&GROUPES.includes(num.groupe))numeros.push({row,v:num});continue;}
  if(S.avis(row))avis.push(row);}
 services.sort((a,b)=>a.row.titre.localeCompare(b.row.titre,'fr'));demarches.sort((a,b)=>a.row.titre.localeCompare(b.row.titre,'fr'));
 return {services,demarches,avis:C.trier(avis),numeros};
}
function statut(v){const o=S.ouvert(v);return n('span',o===null?'Horaires à confirmer':o?'Ouvert':'Fermé','sp-statut '+(o===null?'inconnu':o?'ouvert':'ferme'));}
function actions({row,v}){const box=n('div',undefined,'sp-actions');
 if(v.telephone)box.append(lien('📞 Appeler',tel(v.telephone),'sp-btn sp-btn-plein'));
 box.append(lien('🗺️ Itinéraire',v.latitude!==null?'https://www.google.com/maps/dir/?api=1&destination='+v.latitude+','+v.longitude:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(row.titre+', '+row.lieu+', Koki, Sénégal'),'sp-btn',true));
 return box;}
function carteService(x,avecFiche=true){const {row,v}=x,g=S.genre(v.genre),a=n('article',undefined,'sp-carte');
 const haut=n('div',undefined,'sp-carte-haut');haut.append(n('span',g.icone+' '+v.genre,'sp-genre'),statut(v));a.append(haut,n('h3',row.titre),n('p','📍 '+row.lieu+' · '+S.horairesTexte(v),'sp-lieu'));
 if(v.services.length){const s=n('div',undefined,'sp-prestations');for(const p of v.services.slice(0,6))s.append(n('span',p));a.append(s);}
 a.append(actions(x));if(avecFiche)a.append(b('Voir la fiche',()=>detail(row),'sp-lien'));return a;}
function carteDemarche({row,v}){const d=S.domaine(v.domaine),a=b('',()=>detail(row),'sp-demarche');
 a.append(n('span',d.icone,'sp-demarche-icone'));const t=n('span',undefined,'sp-demarche-texte');t.append(n('span',v.domaine,'sp-genre'),n('strong',row.titre));
 const infos=[v.pieces.length?v.pieces.length+(v.pieces.length>1?' pièces':' pièce'):'',v.cout,v.delai].filter(Boolean).join(' · ');if(infos)t.append(n('span',infos,'sp-lieu'));a.append(t,n('span','›','sp-chevron'));return a;}
function carteAvis(row){const a=b('',()=>KokiPortail.detail(row),'sp-avis'+(row.categorie==='Avis important'?' sp-avis-important':''));
 a.append(n('span',(row.categorie==='Avis important'?'⚠️ Avis important':'📢 '+(row.categorie||row.type))+' · '+date(row.publication),'sp-avis-date'),n('strong',row.titre),n('span',row.resume,'sp-lieu'));return a;}
function chips(liste,courant,fn,label){const box=n('div',undefined,'sp-chips');box.setAttribute('role','group');box.setAttribute('aria-label',label);
 for(const [cle,texte] of liste){const c=b(texte,()=>fn(cle),'sp-chip');c.setAttribute('aria-pressed',String(cle===courant));box.append(c);}return box;}

async function ouvrir(onglet){
 if(onglet)etat.onglet=onglet;const g=++generation,box=KokiPortail.ouvrir(TITRE);box.append(n('p','Chargement des services publics…','portail-meta'));
 let D;try{D=donnees(await KokiPublicFeed.charger());}catch{if(g!==generation||!actif(TITRE))return;box.replaceChildren(n('p','Connexion internet indisponible. Les services publics se chargeront au retour de la connexion.','portail-note'),b('Réessayer',()=>ouvrir(),'sp-btn sp-btn-plein'));return;}
 if(g!==generation||!actif(TITRE))return;box.replaceChildren();
 const hero=n('section',undefined,'sp-hero');hero.append(n('p','KOKI CONNECT · SERVICES PUBLICS','sp-hero-sur'),n('h3','Vos démarches et services à Koki','sp-hero-titre'));
 const important=D.avis.find(r=>r.categorie==='Avis important'&&Date.now()-Date.parse(r.publication)<7*86400000);
 if(important)hero.append(carteAvis(important));else hero.append(n('p','Horaires, numéros, pièces à fournir : tout pour éviter un déplacement inutile.','sp-hero-texte'));
 const label=n('label',undefined,'sp-recherche');const input=n('input');input.type='search';input.placeholder='Mairie, acte de naissance, électricité…';input.setAttribute('aria-label','Rechercher un service ou une démarche');input.value=etat.q;label.append(input);
 const onglets=n('div',undefined,'sp-onglets');onglets.setAttribute('role','tablist');const zone=n('div',undefined,'sp-zone');
 box.append(hero,label,onglets,zone);
 function rendre(){
  etat.q=C.normaliser(input.value.trim());const ok=t=>!etat.q||C.normaliser(t).includes(etat.q);
  const services=D.services.filter(x=>ok([x.row.titre,x.row.lieu,x.v.genre,...x.v.services].join(' ')));
  const demarches=D.demarches.filter(x=>ok([x.row.titre,x.row.resume,x.v.domaine,...x.v.pieces].join(' ')));
  const avis=D.avis.filter(r=>ok(r.titre+' '+r.resume));
  const nb={annuaire:services.length,demarches:demarches.length,avis:avis.length};
  onglets.replaceChildren(...ONGLETS.map(([k,l])=>{const o=b(l+' · '+nb[k],()=>{etat.onglet=k;rendre();},'sp-onglet');o.setAttribute('role','tab');o.setAttribute('aria-selected',String(etat.onglet===k));return o;}));
  zone.replaceChildren();
  if(etat.onglet==='annuaire'){
   const presentes=new Set(services.map(x=>S.genre(x.v.genre).famille));
   const f=chips(S.familles.filter(x=>x.cle==='tout'||presentes.has(x.cle)).map(x=>[x.cle,x.nom]),etat.famille,k=>{etat.famille=k;rendre();},'Type de service');
   const o=b('Ouvert maintenant',()=>{etat.ouvert=!etat.ouvert;rendre();},'sp-chip sp-chip-ouvert');o.setAttribute('aria-pressed',String(etat.ouvert));f.append(o);zone.append(f);
   const rows=services.filter(x=>(etat.famille==='tout'||S.genre(x.v.genre).famille===etat.famille)&&(!etat.ouvert||S.ouvert(x.v)===true)).sort((a,b)=>(S.ouvert(b.v)===true)-(S.ouvert(a.v)===true));
   const grille=n('div',undefined,'sp-grille');grille.append(...rows.map(x=>carteService(x)));zone.append(grille);
   if(!rows.length)zone.append(n('p',D.services.length?'Aucun service pour ce filtre.':'L’annuaire des services publics de Koki sera bientôt publié.','sp-vide'));
   if(D.numeros.length){const nb=n('section',undefined,'sp-bloc');nb.append(n('h3','📞 Numéros utiles'));for(const {row,v} of D.numeros.slice(0,8)){const a=lien(undefined,tel(v.telephone),'sp-numero');a.append(n('span',row.titre),n('strong',v.telephone));nb.append(a);}zone.append(nb);}
   zone.append(b('📍 Voir sur la carte',()=>KokiPortail.lieux('Services publics'),'sp-btn'));
  }else if(etat.onglet==='demarches'){
   const presents=new Set(demarches.map(x=>x.v.domaine));
   zone.append(chips([['Tous','Tous'],...S.domaines.filter(d=>presents.has(d.nom)).map(d=>[d.nom,d.icone+' '+d.nom])],etat.domaine,k=>{etat.domaine=k;rendre();},'Domaine'));
   const rows=demarches.filter(x=>etat.domaine==='Tous'||x.v.domaine===etat.domaine);const l=n('div',undefined,'sp-liste');l.append(...rows.map(carteDemarche));zone.append(l);
   if(!rows.length)zone.append(n('p',D.demarches.length?'Aucune démarche pour ce filtre.':'Les guides des démarches (acte de naissance, certificat de résidence…) seront bientôt publiés.','sp-vide'));
   zone.append(n('p','Les coûts et délais sont donnés à titre indicatif : le service concerné fait foi.','sp-rappel'));
  }else{
   const l=n('div',undefined,'sp-liste');l.append(...avis.slice(0,30).map(carteAvis));zone.append(l);
   if(!avis.length)zone.append(n('p','Aucun avis officiel pour le moment.','sp-vide'));
  }
 }
 input.oninput=rendre;rendre();
}
async function detail(row){
 const s=S.decodeService(row),d=S.decodeDemarche(row);if(!s&&!d)return;
 const box=KokiPortail.ouvrir(row.titre);let D=null;try{D=donnees(await KokiPublicFeed.charger());}catch{}
 if(!actif(row.titre))return;
 if(s){const a=carteService({row,v:s},false);a.classList.add('sp-fiche');
  if(row.image&&KokiPublicFeed.imagePermise(row.image)){const img=n('img');img.src=row.image;img.alt='';img.loading='lazy';img.className='sp-photo';a.prepend(img);}
  a.append(n('p','🕒 '+S.horairesTexte(s),'sp-horaires'));if(row.resume)a.append(n('p',row.resume));if(s.description)a.append(n('p',s.description,'sp-texte'));
  if(s.whatsapp)a.append(lien('💬 Écrire sur WhatsApp','https://wa.me/'+s.whatsapp.replace(/\D/g,'').replace(/^(\d{9})$/,'221$1'),'sp-btn',true));
  if(row.source)a.append(n('p','Source : '+row.source,'portail-meta'));box.append(a);
  const ici=(D?.demarches||[]).filter(x=>x.v.service===row.id);if(ici.length){const sec=n('section',undefined,'sp-bloc');sec.append(n('h3','📄 Démarches à faire ici'),...ici.map(carteDemarche));box.append(sec);}
 }else{const dm=S.domaine(d.domaine),tete=n('section',undefined,'sp-fiche-tete');tete.append(n('span',dm.icone+' '+d.domaine,'sp-genre'),n('h2',row.titre),n('p',row.resume));box.append(tete);
  const infos=n('div',undefined,'sp-infos');for(const [k,x] of [['💰 Coût',d.cout],['⏱️ Délai',d.delai]])if(x){const c=n('div');c.append(n('span',k),n('strong',x));infos.append(c);}if(infos.children.length)box.append(infos);
  if(d.pieces.length){const sec=n('section',undefined,'sp-bloc');sec.append(n('h3','📋 Pièces à fournir'),n('p','Cochez au fur et à mesure pour préparer votre dossier.','portail-meta'));
   for(const p of d.pieces){const l=n('label',undefined,'sp-piece');const c=n('input');c.type='checkbox';l.append(c,n('span',p));sec.append(l);}box.append(sec);}
  if(d.etapes.length){const sec=n('section',undefined,'sp-bloc');sec.append(n('h3','🧭 Étapes'));const ol=n('ol',undefined,'sp-etapes');for(const e of d.etapes)ol.append(n('li',e));sec.append(ol);box.append(sec);}
  const service=(D?.services||[]).find(x=>x.row.id===d.service);
  if(service){const sec=n('section',undefined,'sp-bloc');sec.append(n('h3','🏛️ Où s’adresser'),carteService(service));box.append(sec);}
  else if(row.lieu){const sec=n('section',undefined,'sp-bloc');sec.append(n('h3','🏛️ Où s’adresser'),n('p',row.lieu));box.append(sec);}
  if(d.conseils){const sec=n('section',undefined,'sp-bloc sp-conseils');sec.append(n('h3','💡 Conseils'),n('p',d.conseils,'sp-texte'));box.append(sec);}
  const texte=row.titre+' — pièces à fournir :\n'+d.pieces.map(p=>'• '+p).join('\n')+(d.cout?'\nCoût : '+d.cout:'')+(d.delai?'\nDélai : '+d.delai:'')+'\n(Koki Connect)';
  box.append(lien('💬 Partager sur WhatsApp','https://wa.me/?text='+encodeURIComponent(texte),'sp-btn',true),n('p','Coût et délai indicatifs : le service concerné fait foi.','sp-rappel'));
 }
 box.append(b('🏛️ Tous les services publics',()=>ouvrir(),'sp-btn'));
}
window.KokiServicesPublics=Object.freeze({ouvrir,detail,donnees});
})();
