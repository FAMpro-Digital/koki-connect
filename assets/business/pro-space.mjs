import {registrationPhoto,clearRegistrationPhoto} from './registration-photo.mjs';
// Espace professionnel « Commerces & Services » (téléphone d'abord).
// Fiche en plusieurs étapes, boutique(s), produits et services, prix, stocks et disponibilités.
// Toutes les règles sont vérifiées par le serveur (koki_business) ; cette interface ne demande
// jamais d'identifiant technique : ils viennent de l'état chargé depuis le compte connecté.
import './commerce-contract.js';
import {niveauStock,produitsStockBas,SEUIL_STOCK_BAS} from './catalogue-extras.mjs';
const C=globalThis.KokiCommerceContract;
const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(className)e.className=className;return e;};
let uid=0;const nextId=prefix=>'pro-'+prefix+'-'+(++uid);

function button(label,onClick,{kind='primary',type='button'}={}){const b=node('button',label,'pro-btn pro-btn-'+kind);b.type=type;if(onClick)b.onclick=onClick;return b;}
// Champ avec étiquette, aide et message d'erreur reliés (lisibles par les lecteurs d'écran).
function input(host,{label,type='text',value='',required=false,hint,options,list,attrs={}}){
 const id=nextId('f'),wrap=node('div',null,'pro-field');const l=node('label',label+(required?'':' (facultatif)'));l.htmlFor=id;wrap.append(l);
 let el;
 if(options){el=node('select');for(const o of options){const opt=node('option',typeof o==='string'?o:o.label);opt.value=typeof o==='string'?o:o.value;el.append(opt);}}
 else if(type==='textarea'){el=node('textarea');el.rows=3;}
 else{el=node('input');el.type=type;}
 el.id=id;el.required=required;if(value!==undefined&&value!==null)el.value=value;
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
 if(type==='number'){el.inputMode='numeric';el.min='0';el.step='1';}
 if(list){const dl=node('datalist');dl.id=nextId('l');for(const v of list){const o=node('option');o.value=v;dl.append(o);}el.setAttribute('list',dl.id);wrap.append(dl);}
 wrap.append(el);
 if(hint){const h=node('p',hint,'pro-hint');h.id=id+'-aide';el.setAttribute('aria-describedby',h.id);wrap.append(h);}
 host.append(wrap);return el;
}
function choice(host,{legend,name,values,value}){
 const fs=node('fieldset',null,'pro-choice');fs.append(node('legend',legend));const n=nextId(name);
 for(const v of values){const l=node('label'),r=node('input');r.type='radio';r.name=n;r.value=typeof v==='string'?v:v.value;r.checked=r.value===value;l.append(r,' '+(typeof v==='string'?v:v.label));fs.append(l);}
 host.append(fs);return {get value(){return fs.querySelector('input:checked')?.value||'';},set onchange(fn){for(const r of fs.querySelectorAll('input'))r.onchange=fn;}};
}
function badge(kind,statut,row){
 const pending=statut==='Masqué'&&row?.payload?.moderation?.decision==='pending_review';const locked=row?.payload?.moderation_lock===true;const b=node('span',pending?'En attente de validation':locked?'Suspendu par l’administration':(['En attente','À valider'].includes(statut)?'En attente de validation':statut),'pro-badge pro-badge-'+(locked?'bloque':({'Actif':'ok','Disponible':'ok','À valider':'attente','En attente':'attente','Épuisé':'info','Indisponible':'info','Masqué':'info','Refusé':'alerte','Suspendu':'alerte','Fermé':'alerte','Archivé':'neutre'})[statut]||'neutre'));return b;
}
function explanation(kind,row){const box=node('div',null,'pro-explain');box.append(node('p',row.statut==='Masqué'&&row.payload?.moderation?.decision==='pending_review'?'Produit envoyé à l’administration. Il sera visible après validation.':row.payload?.moderation_lock?'Suspendu par l’administration : contactez Koki Connect pour le remettre en ligne.':C.explicationStatut(kind,row.statut)));const m=row.payload?.moderation;if(m?.note&&(['Refusé','Suspendu','Fermé','Archivé','Masqué'].includes(row.statut)||m.decision==='reject_changes'))box.append(node('p',(m.decision==='reject_changes'?'Modifications refusées. ':'')+'Motif indiqué : '+m.note,'pro-note'));
 if(row.payload?.modification){const w=node('div',null,'pro-pending');w.append(node('strong','Modifications en attente de validation'),node('p','Votre fiche reste visible avec les informations déjà validées. Les changements de nom, d’activité, de numéros ou de photos seront publiés après validation.'));box.append(w);}return box;}
function prixTexte(p){if(p.tarif==='devis')return 'Sur devis';return C.formaterPrix(p.prix);}

// Photos : celles déjà enregistrées (à conserver ou retirer) + nouvelles, compressées avant envoi, 5 au total.
function photosField(host,{existing=[],api,upload,imageSelection,status}){
 const fs=node('fieldset',null,'pro-photos');fs.append(node('legend','Logo et photos ('+C.maxPhotos+' maximum)'),node('p','Les photos sont compressées sur votre téléphone avant l’envoi.','pro-hint'));
 const kept=[];const grid=node('div',null,'pro-thumbs');fs.append(grid);
 for(const path of existing){const fig=node('figure',null,'pro-thumb'),img=node('img');img.alt='Photo enregistrée';img.loading='lazy';api.image(path).then(u=>{img.src=u;}).catch(()=>{img.alt='Photo indisponible';});const l=node('label'),c=node('input');c.type='checkbox';c.checked=true;l.append(c,' Conserver');fig.append(img,l);grid.append(fig);kept.push({path,keep:c});}
 const selections=[];const slots=node('div');fs.append(slots);
 const addSlot=()=>{if(selections.length+existing.length>=C.maxPhotos)return;selections.push(imageSelection(slots,status,{label:'Nouvelle photo '+(selections.length+1)}));more.hidden=selections.length+existing.length>=C.maxPhotos;};
 const more=button('Ajouter une autre photo',addSlot,{kind:'secondary'});fs.append(more);host.append(fs);addSlot();
 const uploaded=new Map();let draftPath;const draft=existing.length?Promise.resolve(null):registrationPhoto(api.user);draft.then(file=>{if(file){const img=node('img');img.alt='Logo choisi lors de l’inscription';const url=URL.createObjectURL(file);img.onload=()=>URL.revokeObjectURL(url);img.src=url;grid.append(img);}});
 return {
  count(){return kept.filter(k=>k.keep.checked).length+selections.filter(s=>s.input.files.length).length;},
  async collect(){
   if(this.count()>C.maxPhotos)throw Error('Cinq photos maximum : retirez-en une.');
   const paths=kept.filter(k=>k.keep.checked).map(k=>k.path);
   for(const s of selections){const file=await s.get();if(!file)continue;if(!upload)throw Error('Envoi de photos indisponible.');if(!uploaded.has(file))uploaded.set(file,await upload(file));paths.push(uploaded.get(file));}
   if(!paths.length){const file=await draft;if(file){if(!draftPath)draftPath=await upload(file);paths.push(draftPath);}}return paths;
  }
 };
}
async function gps(host,initial,status){
 let value=initial||null;const box=node('div',null,'pro-gps');const info=node('p',null,'pro-hint');info.setAttribute('role','status');
 const show=()=>{info.textContent=value?'Position enregistrée : '+value.latitude.toFixed(5)+', '+value.longitude.toFixed(5):'Aucune position : seul votre village ou quartier sera affiché.';remove.hidden=!value;};
 const take=button('Ajouter ma position actuelle',async()=>{take.disabled=true;try{if(typeof window.obtenirPositionActuelle!=='function')throw Error('Localisation indisponible sur cet appareil.');const p=await window.obtenirPositionActuelle();value={latitude:Number(p.coords.latitude.toFixed(6)),longitude:Number(p.coords.longitude.toFixed(6))};show();status.textContent='Position ajoutée. Vérifiez qu’elle correspond bien à votre activité.';}catch(e){status.textContent=e.message||'Position indisponible.';}finally{take.disabled=false;}},{kind:'secondary'});
 const remove=button('Retirer la position',()=>{value=null;show();},{kind:'secondary'});
 box.append(node('p','Localisation GPS (facultative)','pro-label'),info,take,remove);host.append(box);show();
 return {get value(){return value;}};
}

// intention : profil choisi avant l'inscription (« Commerçant » ou « Prestataire de services ») → formulaire ouvert directement.
// brouillon : {lire(), ecrire(valeurs,etape), effacer()} — sauvegarde locale de la fiche en cours (par compte).
// fin() : appelé quand le parcours d'inscription est terminé (fiche envoyée ou déjà existante).
export async function proSpace(host,api,outer,{upload,imageSelection,intention=null,brouillon=null,fin=()=>{}}={}){
 // Messages affichés au plus près de l'écran en cours (et repris dans la zone de statut générale).
 const local=node('p',null,'pro-message');local.setAttribute('role','status');
 const status={get textContent(){return local.textContent;},set textContent(v){local.textContent=v;outer.textContent=v;}};
 const state={profile:null,boutiques:[],produits:[],services:[],localites:[]};
 const stack=[{view:'accueil'}];let open=false,intentionVue=false;
 async function load(){
  const [profiles,boutiques,produits,services]=await Promise.all(['professionnels','boutiques','produits','services'].map(k=>api.mine(k)));
  state.profile=profiles[0]||null;state.boutiques=boutiques;state.produits=produits;state.services=services;
  if(!state.localites.length)state.localites=await api.localites();
 }
 const has=t=>state.profile&&(state.profile.payload.type===t||state.profile.payload.type==='Les deux');
 const activeShops=()=>state.boutiques.filter(b=>b.statut==='Actif');
 // Navigation : chaque écran est une entrée d'historique, le bouton retour du téléphone revient à l'écran précédent.
 function go(view,params={}){local.textContent='';stack.push({view,params});try{history.pushState({...(history.state||{}),kokiPro:stack.length},'');}catch{}render();host.scrollIntoView({block:'start'});}
 function back(){if(stack.length>1){try{if(history.state?.kokiPro===stack.length){history.back();return;}}catch{}stack.pop();render();}}
 const onPop=e=>{if(!host.isConnected){window.removeEventListener('popstate',onPop);return;}const depth=e.state?.kokiPro||1;if(depth<stack.length){stack.length=Math.max(1,depth);render();}};
 window.addEventListener('popstate',onPop);
 async function done(message,steps=1){status.textContent=message;await load();const target=Math.max(1,stack.length-steps);if(target<stack.length){try{if(history.state?.kokiPro===stack.length){history.go(target-stack.length);stack.length=target;render();return;}}catch{}stack.length=target;}render();}
 function frame(title){
  host.replaceChildren();const bar=node('div',null,'pro-bar');
  if(stack.length>1)bar.append(button('← Retour',back,{kind:'back'}));
  else bar.append(button('← Retour à ma boutique',()=>{stack.length=1;render();},{kind:'back'}));
  const h=node('h3',title,'pro-title');h.tabIndex=-1;bar.append(h);host.append(bar,local);queueMicrotask(()=>{if(stack.length>1)h.focus({preventScroll:true});});
  const body=node('div',null,'pro-body');host.append(body);return body;
 }
 async function guarded(btn,fn){if(btn.disabled)return;btn.disabled=true;host.setAttribute('aria-busy','true');try{await fn();}catch(e){status.textContent=e.message||'Opération impossible.';}finally{btn.disabled=false;host.setAttribute('aria-busy','false');}}

 function render(){const {view,params}=stack.at(-1);({accueil,fiche,boutiques,boutique:boutiqueForm,produits,produit:produitForm,services,service:serviceForm,statistiques})[view](params||{});}

 function accueil(){
  host.replaceChildren();const head=node('div',null,'pro-head');head.append(node('h3',state.boutiques.some(b=>b.statut!=='Archivé')?'Ma boutique':'Espace professionnel','pro-title'));host.append(head,local);
  if(state.profile)fin();
  if(!state.profile&&intention&&!intentionVue){intentionVue=true;open=true;queueMicrotask(()=>go('fiche',{profil:intention}));}
  const reprise=!state.profile&&brouillon?.lire();
  if(!open&&!state.profile){head.append(node('p','Vous êtes commerçant ou prestataire à Koki ? Présentez votre activité, vos produits et vos services.'),button('Ouvrir mon espace professionnel',()=>{open=true;render();}));return;}
  const body=node('div',null,'pro-body');host.append(body);
  if(!state.profile){
   body.append(node('p','Créez votre fiche sur un seul écran : nom, catégorie, téléphone et village. Elle sera vérifiée par l’administration de Koki Connect avant d’apparaître dans le catalogue.'));
   body.append(button(reprise?'Reprendre ma fiche (brouillon)':'Créer ma fiche professionnelle',()=>go('fiche')));
   if(reprise)body.append(node('p','Brouillon enregistré sur cet appareil le '+new Date(reprise.at).toLocaleString('fr-FR')+'. Les photos sont à ajouter au moment de l’envoi.','pro-hint'));return;
  }
  const p=state.profile,card=node('article',null,'pro-card');
  const title=node('div',null,'pro-card-head');title.append(node('h4',p.payload.nom),badge('professionnels',p.statut,p));card.append(title,node('p',p.payload.type+(p.payload.village?' · '+p.payload.village:'')),explanation('professionnels',p));
  if(!['Suspendu','Archivé'].includes(p.statut))card.append(button('Modifier ma fiche',()=>go('fiche',{edit:true}),{kind:'secondary'}));
  if(!state.boutiques.some(b=>b.statut!=='Archivé'))body.append(card);else{const infos=node('details');infos.append(node('summary','Informations professionnelles'),card);body.append(infos);for(const boutique of state.boutiques.filter(b=>b.statut!=='Archivé'))body.append(listCard('boutiques',boutique,{details:[boutique.payload.adresse],actions:[]}));}
  const actif=p.statut==='Actif',envoyee=['En attente','Actif'].includes(p.statut),menu=node('div',null,'pro-menu');
  const entry=(label,count,view,enabled,reason)=>{const b=button(label+' ('+count+')',()=>go(view),{kind:'tile'});if(!enabled){b.disabled=true;b.title=reason;}menu.append(b);};
  const wait='Disponible après la validation de votre fiche.';
  if(has('Commerçant')){entry('Mes boutiques',state.boutiques.filter(b=>b.statut!=='Archivé').length,'boutiques',envoyee,wait);entry('Ajouter et gérer mes produits',state.produits.filter(x=>x.statut!=='Archivé').length,'produits',actif&&activeShops().length>0,activeShops().length?wait:'Disponible quand une boutique est validée.');}
  if(has('Prestataire de services'))entry('Mes services',state.services.filter(x=>x.statut!=='Archivé').length,'services',envoyee,wait);
  if(has('Commerçant')||has('Prestataire de services')){const b=button('Statistiques (30 jours)',()=>go('statistiques'),{kind:'tile'});if(!actif){b.disabled=true;b.title=wait;}menu.append(b);}
  const bas=produitsStockBas(state.produits);if(has('Commerçant')&&actif&&bas.length){const a=button('⚠ Stock bas : '+bas.length+' produit'+(bas.length>1?'s':''),()=>go('produits'),{kind:'secondary'});a.classList.add('pro-alerte-btn');menu.prepend(a);}
  if(has('Commerçant')&&envoyee&&!state.boutiques.some(b=>b.statut!=='Archivé'))menu.prepend(button('Créer ma boutique en ligne',()=>go('boutique')));
  body.append(menu);if(!actif)body.append(node('p',p.statut==='Refusé'?'Corrigez votre fiche pour la renvoyer en validation.':envoyee?'Votre fiche est en cours de validation. Vous pouvez déjà créer votre boutique ; les produits et les statistiques s’ouvrent après validation.':wait,'pro-hint'));
  if(has('Commerçant')){const shops=state.boutiques.filter(b=>b.statut!=='Archivé'),shopOn=shops.some(b=>b.statut==='Actif');
   const etapes=node('ol',null,'pro-steps');for(const [fait,txt] of [[true,'Compte créé'],[actif,actif?'Fiche validée':'Fiche envoyée : validation par l’administration en cours'],[shops.length>0,shops.length?(shopOn?'Boutique validée':'Boutique envoyée : validation en cours'):(envoyee?'Créer ma boutique avec le bouton vert ci-dessus':'Créer ma boutique (dès que la fiche est envoyée)')],[state.produits.some(x=>x.statut!=='Archivé'),'Ajouter mes produits (dès que la boutique est validée)']])etapes.append(node('li',(fait?'✅ ':'⏳ ')+txt));
   body.append(node('h4','Où j’en suis'),etapes);}
 }

 function fiche({edit,profil}){
  // Un seul écran : quatre informations obligatoires, le reste est facultatif et repliable.
  // Les valeurs en attente de validation sont reprises pour continuer la saisie.
 const draft=api.user?.user_metadata?.professional_registration;const p=edit&&state.profile?{...state.profile.payload,...(state.profile.payload.modification||{})}:draft?{nom:draft.name,telephone:draft.phone,categorie:draft.category,adresse:draft.address,village:draft.village,description:draft.description}:{};const row=edit?state.profile:null;
  const accountPhone=api.user?.phone?'+'+String(api.user.phone).replace(/^\+/,''):'';
  const v={name:p.nom||'',profile:p.type||'Commerçant',category:p.categorie||'',phone:p.telephone||accountPhone,whatsapp:p.whatsapp||'',sameWhatsapp:!p.whatsapp||p.whatsapp===p.telephone,village:p.village||'',address:p.adresse||'',zone:p.zone||'',hours:p.horaires||'',description:p.description||'',location:p.localisation||null};
  // Brouillon (nouvelle fiche seulement) : reprise des valeurs ; le profil choisi avant l'inscription est proposé.
  if(!edit){if(profil)v.profile=profil;const d=brouillon?.lire();if(d)Object.assign(v,d.valeurs);}
  const body=frame(edit?'Modifier ma fiche':'Créer ma fiche');
  const panel=node('form',null,'pro-form');panel.noValidate=true;body.append(panel);
  if(!edit)panel.append(node('p','Quatre informations suffisent pour commencer. Le reste est facultatif et se complète à tout moment.','pro-hint'));
  const fields={};
  fields.name=input(panel,{label:'Nom de votre commerce ou activité',value:v.name,required:true,attrs:{maxlength:'180',autocomplete:'organization'}});
  fields.profile=choice(panel,{legend:'Vous proposez',name:'type',value:v.profile,values:[{value:'Commerçant',label:'Des produits (commerce)'},{value:'Prestataire de services',label:'Des services (métier)'},{value:'Les deux',label:'Les deux'}]});
  fields.category=input(panel,{label:'Catégorie ou métier principal',value:v.category,required:true,list:[...C.categoriesCommerce,...C.metiers],hint:'Exemple : Alimentation, Couture, Plomberie.',attrs:{maxlength:'100'}});
  fields.phone=input(panel,{label:'Téléphone',type:'tel',value:v.phone,required:true,hint:'Exemple : 77 123 45 67. Le +221 est ajouté automatiquement.',attrs:{autocomplete:'tel'}});
  fields.village=input(panel,{label:'Village ou quartier',required:true,value:v.village,options:[{value:'',label:'Choisissez…'},...state.localites]});
  const plus=node('details',null,'pro-autre');plus.open=!!edit;plus.append(node('summary','Ajouter plus d’informations (facultatif)'));panel.append(plus);
  fields.address=input(plus,{label:'Adresse ou repère',value:v.address,hint:'Exemple : près du marché central.',attrs:{maxlength:'500'}});
  fields.zone=input(plus,{label:'Zone d’intervention (services)',value:v.zone,hint:'Exemple : Koki et villages voisins.',attrs:{maxlength:'180'}});
  fields.hours=input(plus,{label:'Horaires d’ouverture',value:v.hours,hint:'Exemple : lundi–samedi 8 h–20 h.',attrs:{maxlength:'500'}});
  fields.description=input(plus,{label:'Présentation de votre activité',type:'textarea',value:v.description,attrs:{maxlength:'2000'}});
  const same=node('label',null,'pro-check'),cb=node('input');cb.type='checkbox';cb.checked=v.sameWhatsapp;same.append(cb,' Mon WhatsApp est ce même numéro');plus.append(same);
  const wa=node('div');plus.append(wa);const draw=()=>{wa.replaceChildren();fields.whatsapp=cb.checked?null:input(wa,{label:'Numéro WhatsApp',type:'tel',value:v.whatsapp,required:true});};cb.onchange=draw;draw();
  let where=null;gps(plus,v.location,status).then(g=>{where=g;});
  const photos=photosField(plus,{existing:p.photos||[],api,upload,imageSelection,status});
  if(row?.statut==='Actif')panel.append(node('p','Si vous changez le nom, l’activité, un numéro ou les photos, ces changements seront vérifiés avant publication. En attendant, votre fiche reste visible avec les informations déjà validées.','pro-hint'));
  const read=()=>{
   v.name=fields.name.value.trim();v.profile=fields.profile.value;v.category=fields.category.value.trim();
   if(!v.name||!v.category)throw Error('Indiquez le nom et la catégorie de votre activité.');
   const t=C.normaliserTelephone(fields.phone.value);if(!t)throw Error('Téléphone invalide. Exemple : 77 123 45 67.');v.phone=t;
   v.village=fields.village.value;if(!v.village)throw Error('Choisissez votre village ou quartier.');
   v.sameWhatsapp=cb.checked;if(!v.sameWhatsapp){const w=C.normaliserTelephone(fields.whatsapp.value);if(!w)throw Error('Numéro WhatsApp invalide.');v.whatsapp=w;}
   v.address=fields.address.value.trim();if(v.address&&v.address.length<3)throw Error('Adresse trop courte.');
   v.zone=fields.zone.value.trim();v.hours=fields.hours.value.trim();if(v.hours&&v.hours.length<3)throw Error('Horaires trop courts.');
   v.description=fields.description.value.trim();v.location=where?.value||null;
  };
  const nav=node('div',null,'pro-nav');body.append(nav);
  const send=button(row?'Enregistrer ma fiche':'Envoyer ma fiche pour validation');send.onclick=()=>guarded(send,async()=>{
   try{read();}catch(err){plus.open=true;throw err;}
   const values={name:v.name,profile:v.profile,category:v.category,phone:v.phone,whatsapp:v.sameWhatsapp?v.phone:v.whatsapp,village:v.village,photos:await photos.collect()};
   if(v.address)values.address=v.address;if(v.hours)values.hours=v.hours;if(v.description)values.description=v.description;if(v.zone&&v.profile!=='Commerçant')values.zone=v.zone;if(v.location)values.location=v.location;
   const saved=await api.saveProfile(values,row);if(!row){await clearRegistrationPhoto(api.user);brouillon?.effacer();fin();}
   await done(saved.statut!=='Actif'?'Fiche envoyée : elle est en attente de validation par l’administration.':saved.payload?.modification?'Modifications envoyées pour validation. Votre fiche reste visible avec les informations déjà validées.':'Fiche enregistrée. Elle reste visible dans le catalogue.');
  });nav.append(send);
  if(!edit&&brouillon){const save=button('Enregistrer le brouillon',()=>{try{read();}catch{}brouillon.ecrire({...v},0);status.textContent='Brouillon enregistré sur cet appareil : vous pourrez reprendre votre fiche plus tard depuis l’Espace professionnel.';},{kind:'secondary'});nav.append(save);}
  panel.onsubmit=e=>{e.preventDefault();send.click();};
  queueMicrotask(()=>panel.querySelector('input,select,textarea')?.focus({preventScroll:true}));
 }

 function listCard(kind,row,{details=[],actions=[]}){
  const card=node('article',null,'pro-card'),head=node('div',null,'pro-card-head');head.append(node('h4',row.payload.nom),badge(kind,row.statut,row));card.append(head);
  for(const d of details.filter(Boolean))card.append(node('p',d));card.append(explanation(kind,row));
  if(actions.length){const a=node('div',null,'pro-actions');a.append(...actions);card.append(a);}return card;
 }
 function archiveButton(kind,row,label){const b=button('Archiver',()=>guarded(b,async()=>{if(!confirm('Archiver « '+row.payload.nom+' » ? '+label))return;await api.archive(row);await done('« '+row.payload.nom+' » est archivé.',0);}),{kind:'danger'});return b;}
 function availability(kind,row){
  if(row.statut==='Archivé'||row.payload.moderation_lock)return null;
  const wrap=node('div',null,'pro-field pro-inline');const id=nextId('d'),l=node('label','Disponibilité');l.htmlFor=id;const sel=node('select');sel.id=id;sel.setAttribute('aria-label','Disponibilité de '+row.payload.nom);
  for(const s of C.disponibilites[kind]){const o=node('option',s);o.value=s;sel.append(o);}sel.value=row.statut;
  sel.onchange=()=>guarded(sel,async()=>{const target=sel.value;try{await api.setAvailability(row,target);await done('« '+row.payload.nom+' » : '+target+'.',0);}catch(e){sel.value=row.statut;throw e;}});
  wrap.append(l,sel);return wrap;
 }

 function boutiques(){
  const body=frame('Mes boutiques');const rows=state.boutiques.filter(b=>b.statut!=='Archivé');
  body.append(node('p','Chaque nouvelle boutique est vérifiée par l’administration avant d’apparaître dans le catalogue.','pro-hint'),button('Ajouter une boutique',()=>go('boutique')));
  if(!rows.length)body.append(node('p','Aucune boutique pour le moment.'));
  for(const b of rows)body.append(listCard('boutiques',b,{details:[[b.payload.categorie,b.payload.village].filter(Boolean).join(' · '),b.payload.adresse,b.payload.horaires&&'Horaires : '+b.payload.horaires],actions:[...(['Fermé'].includes(b.statut)?[]:[button('Modifier',()=>go('boutique',{id:b.id}),{kind:'secondary'})]),archiveButton('boutiques',b,'Ses produits ne seront plus visibles.')]}));
  archived(body,state.boutiques);
 }
 function archived(body,rows){const old=rows.filter(r=>r.statut==='Archivé');if(!old.length)return;const d=node('details',null,'pro-archives');d.append(node('summary','Éléments archivés ('+old.length+')'));
  for(const r of old){const li=node('div',null,'pro-archive');li.append(node('span',r.payload.nom));
   const b=button('Désarchiver',()=>guarded(b,async()=>{await api.unarchive(r);await done('« '+r.payload.nom+' » est désarchivé'+(rows===state.boutiques?'e : la boutique repasse en validation par l’administration.':' : il est masqué, rendez-le disponible depuis sa fiche.'),0);}),{kind:'secondary'});li.append(b);d.append(li);}
  body.append(d);}

 function boutiqueForm({id}){
  const row=state.boutiques.find(b=>b.id===id)||null,p=row?.payload||{},pro=state.profile.payload;
  const body=frame(row?'Modifier la boutique':'Nouvelle boutique');const f=node('form',null,'pro-form');f.noValidate=true;body.append(f);
  const name=input(f,{label:'Nom de la boutique',value:p.nom||pro.nom||'',required:true,attrs:{maxlength:'180'}});
  const village=input(f,{label:'Village ou quartier',required:true,value:p.village||pro.village||'',options:[{value:'',label:'Choisissez…'},...state.localites]});
  if(!row)f.append(node('p','Nom et village suffisent : vous pourrez ajouter le reste plus tard.','pro-hint'));
  const plus=node('details',null,'pro-autre');plus.open=!!row;plus.append(node('summary','Ajouter plus d’informations (facultatif)'));f.append(plus);
  const category=input(plus,{label:'Catégorie',value:p.categorie||pro.categorie||'',list:C.categoriesCommerce,attrs:{maxlength:'100'}});
  const address=input(plus,{label:'Adresse ou repère',value:p.adresse||pro.adresse||'',attrs:{maxlength:'500'}});
  const hours=input(plus,{label:'Horaires d’ouverture',value:p.horaires||pro.horaires||'',hint:'Exemple : tous les jours 9 h–19 h.',attrs:{maxlength:'500'}});
  const whatsapp=input(plus,{label:'WhatsApp de la boutique',type:'tel',value:p.whatsapp||'',hint:'Laissez vide pour utiliser le numéro de votre fiche.'});
  const description=input(plus,{label:'Description',type:'textarea',value:p.description||'',attrs:{maxlength:'2000'}});
  let where=null;gps(plus,p.localisation,status).then(g=>{where=g;});const photos=photosField(plus,{existing:p.photos||[],api,upload,imageSelection,status});
  const send=button(row?'Enregistrer la boutique':'Envoyer pour validation');body.append(send);
  send.onclick=()=>guarded(send,async()=>{
   const values={name:name.value.trim(),village:village.value,photos:await photos.collect()};if(!values.name)throw Error('Indiquez le nom de la boutique.');if(!values.village)throw Error('Choisissez le village ou quartier.');
   if(category.value.trim())values.category=category.value.trim();if(address.value.trim())values.address=address.value.trim();if(hours.value.trim())values.hours=hours.value.trim();if(description.value.trim())values.description=description.value.trim();
   if(whatsapp.value.trim()){const w=C.normaliserTelephone(whatsapp.value);if(!w)throw Error('Numéro WhatsApp invalide.');values.whatsapp=w;}
   if(where?.value)values.location=where.value;
   const saved=await api.saveShop(values,row);await done(saved.statut==='Actif'?'Boutique enregistrée.':'Boutique envoyée : en attente de validation par l’administration.');
  });
 }

 function produits(){
  const body=frame('Mes produits');const shops=activeShops();const rows=state.produits.filter(x=>x.statut!=='Archivé');
  body.append(button('Ajouter un produit',()=>go('produit')));
  const bas=produitsStockBas(rows);
  if(bas.length){const al=node('div',null,'pro-alerte');al.setAttribute('role','status');al.append(node('strong','⚠ Stock à renouveler'),node('p',bas.map(x=>x.payload.nom+' ('+(x.payload.stock===0?'épuisé':x.payload.stock+' restant'+(x.payload.stock>1?'s':''))+')').join(' · ')));body.append(al);}
  if(!rows.length)body.append(node('p','Aucun produit pour le moment.'));
  for(const x of rows){const shop=state.boutiques.find(b=>b.id===x.parent_id);
   const price=node('p',null,'pro-price');price.append(node('strong',C.formaterPrix(x.payload.prix)));if(x.payload.ancien_prix){const s=node('s',C.formaterPrix(x.payload.ancien_prix));s.setAttribute('aria-label','Ancien prix '+C.formaterPrix(x.payload.ancien_prix));price.append(' ',s);}
   const card=listCard('produits',x,{details:[shops.length>1||shop?.statut!=='Actif'?'Boutique : '+(shop?.payload.nom||'—')+(shop&&shop.statut!=='Actif'?' ('+shop.statut+')':''):null,'Stock : '+x.payload.stock],actions:[button('Modifier le prix ou le stock',()=>go('produit',{id:x.id}),{kind:'secondary'}),archiveButton('produits',x,'Il disparaîtra du catalogue.')]});
   card.querySelector('h4').after(price);const d=availability('produits',x);if(d)card.querySelector('.pro-actions').before(d);
   const rapide=stockRapide(x);if(rapide)card.querySelector('.pro-actions').before(rapide);body.append(card);}
  archived(body,state.produits);
 }
 // Mise à jour rapide du stock depuis la liste : mêmes règles et même enregistrement que le formulaire du produit.
 function stockRapide(row){
  if(row.statut==='Archivé'||row.payload.moderation_lock)return null;
  const p=row.payload,niveau=niveauStock(p.stock);
  const wrap=node('div',null,'pro-field pro-inline pro-stock-rapide');const id=nextId('st'),l=node('label','Stock');l.htmlFor=id;
  const champ=node('input');champ.id=id;champ.type='number';champ.inputMode='numeric';champ.min='0';champ.step='1';champ.value=String(p.stock??0);champ.setAttribute('aria-label','Nouveau stock de '+p.nom);
  if(niveau==='bas'||niveau==='epuise'){const e=node('span',niveau==='epuise'?'Épuisé':'Stock bas','pro-pastille-stock');wrap.append(l,champ,e);}else wrap.append(l,champ);
  const ok=button('Mettre à jour',()=>guarded(ok,async()=>{
   const n=champ.value.trim()===''?NaN:Number(champ.value);if(!Number.isInteger(n)||n<0)throw Error('Indiquez un stock entier, 0 ou plus.');
   if(n===p.stock){status.textContent='Le stock n’a pas changé.';return;}
   const values={name:p.nom,price:p.prix,stock:n,photos:p.photos||(p.image_path?[p.image_path]:[])};if(p.ancien_prix)values.old_price=p.ancien_prix;if(p.categorie)values.category=p.categorie;if(p.description)values.description=p.description;
   const errors=C.verifierOffre('produits',{nom:values.name,prix:values.price,ancien_prix:values.old_price,stock:values.stock});if(errors.length)throw Error(errors.join(' '));
   await api.saveProduct(values,row);await done('Stock de « '+p.nom+' » mis à jour : '+n+'.',0);
  }),{kind:'secondary'});
  wrap.append(ok);return wrap;
 }
 // Statistiques des 30 derniers jours (vues, appels, WhatsApp, commandes, partages), calculées par le serveur pour le compte connecté.
 async function statistiques(){
  const body=frame('Statistiques (30 jours)');const zone=node('div',null,'pro-stats');body.append(zone);zone.append(node('p','Chargement…','pro-hint'));
  let d=null;try{d=await api.statistiques(30);}catch(e){zone.replaceChildren(node('p',e.message||'Statistiques indisponibles.'));return;}
  zone.replaceChildren();
  if(!d||!Array.isArray(d.elements)){zone.append(node('p','Les statistiques seront disponibles prochainement.','pro-hint'));return;}
  const LIB={vue:'Vues',appel:'Appels',whatsapp:'WhatsApp',commander:'Clics sur Commander',partage:'Partages',panier:'Ajouts au panier',devis:'Devis'};
  const tot=d.totaux||{};const grille=node('div',null,'pro-stats-totaux');
  for(const k of Object.keys(LIB)){const t=node('div',null,'pro-stat');t.append(node('strong',String(Number(tot[k])||0)),node('span',LIB[k]));grille.append(t);}
  zone.append(grille);
  if(!d.elements.length)zone.append(node('p','Aucune activité enregistrée pour le moment.','pro-hint'));
  for(const e of [...d.elements].sort((a,b)=>(b.vue||0)-(a.vue||0)).slice(0,50)){
   const c=node('article',null,'pro-card');c.append(node('h4',e.nom||'—'));
   c.append(node('p',Object.keys(LIB).filter(k=>Number(e[k])>0).map(k=>LIB[k]+' : '+Number(e[k])).join(' · ')||'Aucune activité.'));zone.append(c);
  }
  zone.append(node('p','Chiffres indicatifs : depuis la mise à jour de sécurité, chaque action est comptée au plus une fois par compte, fiche et jour. Les visites sans connexion ne sont plus comptées. Ces clics ne représentent pas des commandes payées ; les anciennes données peuvent contenir des doublons.','pro-hint'));
 }
 function produitForm({id}){
  const row=state.produits.find(x=>x.id===id)||null,p=row?.payload||{};const shops=activeShops();
  const body=frame(row?'Modifier le produit':'Nouveau produit');const f=node('form',null,'pro-form');f.noValidate=true;body.append(f);
  let shop=null;
  if(row)f.append(node('p','Boutique : '+(state.boutiques.find(b=>b.id===row.parent_id)?.payload.nom||'—'),'pro-hint'));
  else if(shops.length>1)shop=input(f,{label:'Boutique',required:true,options:shops.map(b=>({value:b.id,label:b.payload.nom}))});
  else f.append(node('p','Boutique : '+shops[0]?.payload.nom,'pro-hint'));
  const name=input(f,{label:'Nom du produit',value:p.nom||'',required:true,attrs:{maxlength:'180'}});
  const category=input(f,{label:'Catégorie',value:p.categorie||'',list:C.categoriesCommerce,attrs:{maxlength:'100'}});
  const price=input(f,{label:'Prix (FCFA)',type:'number',value:p.prix??'',required:true});
  const old=input(f,{label:'Ancien prix (FCFA)',type:'number',value:p.ancien_prix??'',hint:'Pour afficher une promotion : doit être supérieur au prix.'});
  const stock=input(f,{label:'Stock disponible',type:'number',value:p.stock??1,required:true,hint:'À 0, le produit s’affiche « Épuisé ».'});
  const description=input(f,{label:'Description',type:'textarea',value:p.description||'',attrs:{maxlength:'2000'}});
  const photos=photosField(f,{existing:p.photos||(p.image_path?[p.image_path]:[]),api,upload,imageSelection,status});
  const send=button(row?'Enregistrer le produit':'Envoyer le produit pour validation');body.append(send);
  send.onclick=()=>guarded(send,async()=>{
   const num=el=>el.value.trim()===''?null:Number(el.value);
   const values={name:name.value.trim(),price:num(price),stock:num(stock)};if(num(old)!==null)values.old_price=num(old);
   const errors=C.verifierOffre('produits',{nom:values.name,prix:values.price,ancien_prix:values.old_price,stock:values.stock});if(errors.length)throw Error(errors.join(' '));
   if(category.value.trim())values.category=category.value.trim();if(description.value.trim())values.description=description.value.trim();
   values.photos=await photos.collect();if(shop)values.parent_id=shop.value;
   if(state.produits.some(x=>x.id!==row?.id&&x.statut!=='Archivé'&&x.parent_id===(row?.parent_id||shop?.value||shops[0]?.id)&&C.cleNom(x.payload.nom)===C.cleNom(values.name)))throw Error('Un produit porte déjà ce nom dans cette boutique.');
   const saved=await api.saveProduct(values,row);await done(saved.payload?.moderation?.decision==='pending_review'?'Produit envoyé : en attente de validation par l’administration.':row?'Produit mis à jour.':'Produit enregistré.');
  });
 }

 function services(){
  const body=frame('Mes services');const rows=state.services.filter(x=>x.statut!=='Archivé');
  body.append(button('Ajouter un service',()=>go('service')));
  if(!rows.length)body.append(node('p','Aucun service pour le moment.'));
  for(const x of rows){const card=listCard('services',x,{details:[prixTexte(x.payload),x.payload.categorie&&'Métier : '+x.payload.categorie,x.payload.zone&&'Zone : '+x.payload.zone],actions:[button('Modifier',()=>go('service',{id:x.id}),{kind:'secondary'}),archiveButton('services',x,'Il disparaîtra du catalogue.')]});const d=availability('services',x);if(d)card.querySelector('.pro-actions').before(d);body.append(card);}
  archived(body,state.services);
 }
 function serviceForm({id}){
  const row=state.services.find(x=>x.id===id)||null,p=row?.payload||{};
  const body=frame(row?'Modifier le service':'Nouveau service');const f=node('form',null,'pro-form');f.noValidate=true;body.append(f);
  const name=input(f,{label:'Nom du service',value:p.nom||'',required:true,hint:'Exemple : Réparation de fuite d’eau.',attrs:{maxlength:'180'}});
  const category=input(f,{label:'Métier',value:p.categorie||state.profile.payload.categorie||'',list:C.metiers,attrs:{maxlength:'100'}});
  const tarif=choice(f,{legend:'Tarif',name:'tarif',value:p.tarif||(p.prix==null?'devis':'fixe'),values:[{value:'fixe',label:'Prix fixe'},{value:'devis',label:'Sur devis'}]});
  const priceBox=node('div');f.append(priceBox);let price=null;const drawPrice=()=>{priceBox.replaceChildren();price=tarif.value==='fixe'?input(priceBox,{label:'Prix (FCFA)',type:'number',value:p.prix??'',required:true}):null;};tarif.onchange=drawPrice;drawPrice();
  const zone=input(f,{label:'Zone d’intervention',value:p.zone||state.profile.payload.zone||'',attrs:{maxlength:'180'}});
  const description=input(f,{label:'Description',type:'textarea',value:p.description||'',attrs:{maxlength:'2000'}});
  const photos=photosField(f,{existing:p.photos||(p.image_path?[p.image_path]:[]),api,upload,imageSelection,status});
  const send=button(row?'Enregistrer le service':'Publier le service');body.append(send);
  send.onclick=()=>guarded(send,async()=>{
   const values={name:name.value.trim(),pricing:tarif.value};if(values.pricing==='fixe')values.price=price.value.trim()===''?null:Number(price.value);
   const errors=C.verifierOffre('services',{nom:values.name,tarif:values.pricing,prix:values.price});if(errors.length)throw Error(errors.join(' '));
   if(category.value.trim())values.category=category.value.trim();if(zone.value.trim().length>=2)values.zone=zone.value.trim();if(description.value.trim())values.description=description.value.trim();
   values.photos=await photos.collect();
   if(state.services.some(x=>x.id!==row?.id&&x.statut!=='Archivé'&&C.cleNom(x.payload.nom)===C.cleNom(values.name)))throw Error('Un service porte déjà ce nom.');
   await api.saveService(values,row);await done(row?'Service mis à jour.':'Service publié dans le catalogue.');
  });
 }

 await load();open=!!state.profile;render();
 return state.profile?[state.profile.id]:[];
}
