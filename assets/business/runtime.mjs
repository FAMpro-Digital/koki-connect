import {mountNotificationPrompt} from './notification-prompt.mjs';
import {renderNotifications,disablePush,enablePush} from './notifications.mjs';
import {requireClientAccount} from './client-access.mjs';
import {isProcessedImage} from './image-processing.mjs';
import {createCartStore,createStatusObserver,searchCatalogue,catalogueCategories,searchDrivers} from './business-state.js';
import {indexCatalogue} from './catalogue-state.mjs';
import {imageSelection} from './ui.mjs';
import {createBusinessClient,HORS_LIGNE,MESSAGE_HORS_LIGNE} from './client.mjs';
// Message d'erreur affichable : jamais d'erreur technique brute (« TypeError: Failed to fetch »…).
const lisible=e=>HORS_LIGNE.test(String(e?.message||e||''))||e?.name==='TypeError'?MESSAGE_HORS_LIGNE:(e?.message||'Une erreur est survenue. Réessayez.');
import {node,field,action,form,accountPanel,history,professional,savedImage,retries} from './ui.mjs';
import {proSpace} from './pro-space.mjs';
import {catalogue as catalogueUI} from './catalogue.mjs';
import * as Pro from './intention.mjs';
let api,db,configuration,sdkLoading,modules={};
// Hors connexion : dernière configuration publique connue (adresse et clé publique, sans secret), revérifiée par backendAutorise.
async function lireConfig(url,cle,message){
 try{const r=await fetch(url);if(!r.ok)throw Error(message);const j=await r.json();try{localStorage.setItem(cle,JSON.stringify(j));}catch{}return j;}
 catch(e){if(e?.name!=='TypeError')throw e;try{const c=JSON.parse(localStorage.getItem(cle)||'null');if(c)return c;}catch{}throw Error(message);}
}
// Session du compte enregistrée par Supabase sur le téléphone (lue sans réseau, même si le jeton a expiré).
const copieSecours={lire:()=>{try{return JSON.parse(localStorage.getItem('koki-session-secours')||'null');}catch{return null;}},ecrire:v=>{try{localStorage.setItem('koki-session-secours',JSON.stringify(v));}catch{}},effacer:()=>{try{localStorage.removeItem('koki-session-secours');}catch{}}};
function sessionEnregistree(){try{return JSON.parse(localStorage.getItem('koki-public-auth')||'null')?.user||null;}catch{return null;}}
// Activation par rubrique : config.json « modules » (absent = suit « enabled »). Transport peut rester fermé quand Commerce est ouvert.
export function moduleActif(flags,module){return flags?.enabled===true&&flags?.modules?.[module]!==false;}
const inactif=createBusinessClient(null,{enabled:false});
const apiDe=module=>modules[module]===false?inactif:api;
async function sdk(){if(window.supabase)return window.supabase;if(!sdkLoading)sdkLoading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/business/vendor/supabase-2.117.3.js';s.onload=()=>resolve(window.supabase);s.onerror=()=>{sdkLoading=null;s.remove();reject(Error('Connexion indisponible. Réessayez.'));};document.head.append(s);});return sdkLoading;}
function retryStorage(){try{return sessionStorage;}catch{return null;}}const cart=[];let catalogue=[],cartStore,cartOwner;const observer=createStatusObserver();
function saveCart(){return cartStore?.save(cart);}
function localCartStorage(){try{return localStorage;}catch{return null;}}
function observe(rows,status){const changes=observer.observe(rows);if(changes.length){status.textContent=changes.map(x=>x.kind+' : '+x.status).join(' · ');window.dispatchEvent(new CustomEvent('koki-business-status',{detail:changes}));}}
// Même règle que assets/portail/feed.js : Supabase LOCAL seulement pour une page servie depuis cet ordinateur.
export function backendAutorise(c,hostname){if(!c||typeof c.publishableKey!=='string'||!c.publishableKey.startsWith('sb_publishable_'))return false;if(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(c.url))return c.local!==true;return c.local===true&&(hostname==='127.0.0.1'||hostname==='localhost')&&/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(c.url);}
async function initialise(){if(configuration)return configuration;configuration=Promise.all([lireConfig('assets/business/config.json','koki-cache-config','Configuration indisponible.'),lireConfig('assets/portail/backend.json','koki-cache-backend','Serveur indisponible.')]).then(async([flags,c])=>{if(!backendAutorise(c,globalThis.location?.hostname))throw Error('Configuration publique invalide.');modules={commerce:moduleActif(flags,'commerce'),transport:moduleActif(flags,'transport')};db=flags.enabled===true?(await sdk()).createClient(c.url,c.publishableKey,{auth:{storageKey:'koki-public-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;db?.auth.onAuthStateChange?.((event,session)=>{if(['SIGNED_IN','SIGNED_OUT'].includes(event))setTimeout(()=>window.dispatchEvent(new Event('koki-auth-changed')),0);if(event==='SIGNED_IN')setTimeout(()=>{document.getElementById('koki-notification-prompt')?.remove();inviterNotifications();},500);if(event==='SIGNED_OUT')document.getElementById('koki-notification-prompt')?.remove();});api=createBusinessClient(db,{enabled:flags.enabled===true,storage:retryStorage(),sessionLocale:sessionEnregistree,secours:copieSecours,beforeLogout:()=>disablePush(db)});return api;}).catch(e=>{configuration=null;throw e;});return configuration;}
// Dossier photo anonyme fourni par le serveur : le chemin publié ne contient pas l'identifiant du compte.
async function upload(result){const file=result?.file||result;if(!isProcessedImage(file))throw Error('Compressez la photo avant son téléversement.');await api.identity();const folder=await api.mediaFolder();const ext=file.type==='image/webp'?'webp':file.type==='image/png'?'png':'jpg';const path=folder+'/'+crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('koki-media').upload(path,file,{contentType:file.type,upsert:false});if(error)throw Error('Téléversement impossible. Votre image précédente est conservée.');return path;}
function container(module){const section=document.getElementById('vue-'+(module==='transport'?'transport':'commerce'));let box=document.getElementById('business-'+module);if(!box){box=node('section');box.id='business-'+module;box.className='business-panel';const ancre=module==='transport'?section.querySelector('.tr-app')||section.querySelector('.transport-demo'):section.querySelector('.market-demo');ancre.after(box);}return box;}
// Commerces & Services : la boutique en ligne est toujours affichée (catalogue réel, démonstration locale, ou vide tant que le service n'est pas activé).
let catalogueHandle=null,apresCommande=async()=>{},apresCourse=async()=>{};
const panierReel={
 lignes:()=>cart.map(x=>({id:x.id,nom:x.nom,prix:x.prix,quantite:x.quantity,stock:x.stock})),
 ajouter:(x,q)=>addToCart(x,q),
 changer(id,q){const l=cart.find(x=>x.id===id);if(!l)return;if(!Number.isInteger(q)||q<1)cart.splice(cart.indexOf(l),1);else{if(!Number.isInteger(l.stock)||q>l.stock)throw Error('Stock indiqué insuffisant.');l.quantity=q;}saveCart();},
 position:async()=>{const p=await window.obtenirPositionActuelle();return p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6);},
 // Commande interne conservée : le serveur confirme prix, stock et boutique.
 async commander(mode,address){
  await requireClientAccount(api,()=>ouvrirConnexion('commerce'));
  if(!cart.length)throw Error('Votre panier est vide.');
  const order=await api.order(cart[0].parent_id,cart.map(x=>({product_id:x.id,quantity:x.quantity})),mode,address);
  cart.length=0;cartStore?.clear();await apresCommande();
  return 'Commande enregistrée · référence '+order.id.slice(0,8)+' · '+order.payload.total+' FCFA · '+order.statut+'. Suivez-la dans « Commandes et demandes ».';
 },
 note:'Paiement à la réception. La boutique confirme le prix, le stock et les frais de livraison. Un compte client est obligatoire pour commander, y compris sur WhatsApp.'
};
const catalogueVide={api:{catalog:async()=>[],image:async()=>{throw Error('Image indisponible.');}},vide:'Aucune boutique validée n’est encore en ligne. Cochez « Tester la démonstration » pour essayer la boutique.'};
export async function show(module,demo=false){const host=container(module);if(module!=='commerce'){host.hidden=demo;if(demo)return;}host.hidden=false;host.replaceChildren(node('p','Chargement de l’espace connecté…'));try{await initialise();host.replaceChildren();const body=node('div');let account=host;if(module==='commerce'){const catalog=node('section');catalog.id='business-catalogue';catalog.className='cat-root';host.append(catalog);catalogueHandle=null;const monter=options=>catalogueUI(catalog,options).then(h=>{catalogueHandle=h;}).catch(e=>{catalog.replaceChildren(node('p',lisible(e)));});const demonstration=demo?window.KokiCommerce?.sourceDemo?.():null;if(demonstration){monter(demonstration);return;}account=node('section');account.id='business-compte';account.className='cat-account';account.append(node('h3','Mes commandes et demandes'));host.append(account);monter(apiDe('commerce').enabled?{api,requireAccount:()=>requireClientAccount(api,()=>ouvrirConnexion('commerce')),requestService,panier:panierReel,vide:'Aucune boutique validée pour le moment. Commerçants et artisans : créez votre compte puis votre fiche dans « Profil ».',raccourcis:[{label:'Mes commandes et demandes',action:()=>account.scrollIntoView({block:'start'})},{label:'Espace professionnel (Profil)',action:()=>versProfil()}]}:catalogueVide);}const status=connexionSurPlace(account,module,async connected=>{body.replaceChildren();if(!connected){cartStore?.clear();cartStore=null;cartOwner=null;observer.reset();cart.length=0;window.dispatchEvent(new Event('koki-cart'));for(const other of document.querySelectorAll('[id^=business-].business-panel'))if(other!==host)other.replaceChildren();return;}if(module==='transport')await transport(body,status);else await commerce(body,status);},{intention:()=>{const t=Pro.lire(proStorage());return t?Pro.TYPES[t].label:null;},retour:()=>Pro.urlRetour(location.href,Pro.lire(proStorage())),erreurLien:prendreErreurLien()});account.append(body);}catch(e){host.replaceChildren(node('p',lisible(e)));action(host,'Réessayer',()=>show(module,demo));}}
async function transport(host,status){const renderRetry=retries(host,api,status,async()=>{await refresh();});
 const follow=node('section');host.append(lienProfil('Vous êtes chauffeur ? Votre inscription, vos véhicules et votre disponibilité se gèrent dans « Profil ».'),node('h3','Mes courses et historique'),follow);action(host,'Actualiser le suivi',refresh,status);
 apresCourse=async()=>{await refresh();};
 async function refresh(){const ids=(await api.mine('chauffeurs')).map(x=>x.id);await history(follow,api,'courses',status,{ownedIds:ids,observe:rows=>observe(rows,status)});renderRetry();}
 window.dispatchEvent(new Event('koki-transport-session'));await refresh();}
// Panier interne conservé : mêmes règles qu'avant (une boutique par panier, stock indiqué, panier lié au compte).
// Panier : une boutique par panier, stock indiqué. Sans connexion, le panier reste en mémoire (connexion obligatoire pour commander) ;
// une fois connecté, il est lié au compte sur cet appareil.
async function addToCart(p,quantity=1){let u=null;try{u=await api.identity();}catch{}if(cart.length&&cart[0].parent_id!==p.parent_id)throw Error('Terminez le panier de cette boutique avant de changer de vendeur.');const old=cart.find(x=>x.id===p.id);const total=(old?.quantity||0)+quantity;if(!Number.isInteger(p.stock)||total>p.stock)throw Error('Stock indiqué insuffisant.');if(old)old.quantity=total;else cart.push({...p,quantity});let stored=false;if(u){if(!cartStore||cartOwner!==u.id){cartOwner=u.id;cartStore=createCartStore(localCartStorage(),db.supabaseUrl+':'+u.id);}stored=saveCart();}window.dispatchEvent(new Event('koki-cart'));return stored;}
// Demande de service interne conservée (besoin, lieu, date, photo facultative).
async function requestService(p,area){await requireClientAccount(api,()=>ouvrirConnexion('commerce'));area.replaceChildren();const status=node('p');status.setAttribute('role','status');const date=new Date().toISOString().slice(0,10);const controls=form(area,'Votre besoin · '+p.nom,[['need','Décrivez votre besoin','textarea'],['address','Lieu d’intervention','text'],['date','Date souhaitée','date',date]],async x=>{try{const pending=api.pending().find(v=>v.operation==='service:'+p.id);let image_path=pending?.input.image_path||null;if(!pending){const file=await photo.get();if(file)image_path=await upload(file);}await api.run('request_service',{service_id:p.id,need:x.need.value,address:x.address.value,date:x.date.value,image_path},'service:'+p.id);area.replaceChildren(node('p','Demande envoyée. Suivez-la dans « Commandes et demandes ».'));}finally{window.dispatchEvent(new Event('koki-cart'));}},status);const photo=imageSelection(controls.f,status);area.append(status);action(area,'Fermer',()=>area.replaceChildren(),status);}
async function commerce(host,status){const u=await api.identity();catalogue=await api.catalog();if(cartOwner!==u.id){observer.reset();cartOwner=u.id;}cartStore=createCartStore(localCartStorage(),db.supabaseUrl+':'+u.id);const restaure=cartStore.restore(catalogue);if(restaure.length||!cart.length)cart.splice(0,cart.length,...restaure);else{cart.splice(0,cart.length,...cart.filter(x=>catalogue.some(p=>p.kind==='produits'&&p.id===x.id)));saveCart();}window.dispatchEvent(new Event('koki-cart'));const basket=node('section'),orders=node('section'),requests=node('section');basket.id='business-panier';host.append(basket,lienProfil('Vous êtes commerçant ou prestataire ? Votre fiche, votre boutique et vos services se gèrent dans « Profil ».'),node('h3','Commandes et demandes'),orders,requests);const renderRetry=retries(host,api,status,async value=>{if(value?.kind==='commandes'){cart.length=0;cartStore?.clear();window.dispatchEvent(new Event('koki-cart'));}await refresh();});function renderCart(){basket.replaceChildren(node('h3','Panier'));const n=cart.reduce((t,x)=>t+x.quantity,0);basket.append(node('p',n?n+' article(s) dans votre panier. Le récapitulatif et la commande se trouvent à côté du catalogue.':'Votre panier est vide.'));action(basket,'Voir mon panier',()=>document.querySelector('#business-catalogue .cat-cart')?.scrollIntoView({block:'start'}),status);}
 const listener=()=>{if(!host.isConnected){window.removeEventListener('koki-cart',listener);return;}renderCart();renderRetry();};window.addEventListener('koki-cart',listener);action(host,'Actualiser commandes et prestations',refresh,status);apresCommande=async()=>{await refresh();};async function refresh(){renderCart();const ids=(await api.mine('professionnels')).map(x=>x.id);await history(orders,api,'commandes',status,{ownedIds:ids,observe:rows=>observe(rows,status)});await history(requests,api,'demandes_services',status,{ownedIds:ids,observe:rows=>observe(rows,status)});renderRetry();}await refresh();}
// Transport : la feuille de réservation (assets/transport/app.js) appelle le serveur par ces fonctions.
async function transportConnecte(){if(!api?.enabled||modules.transport===false)return false;try{await api.identity();return true;}catch{return false;}}
async function estimerCourse(categorie,depart,destination){try{return await api.estimate(categorie,depart,destination);}catch(e){throw Error(/Tarif validé indisponible/.test(e.message)?'Tarif validé indisponible':e.message);}}
async function reserverCourse(quote,vehicule){await requireClientAccount(api,()=>ouvrirConnexion('transport'));const course=await api.reserve(quote,vehicule);try{await apresCourse();}catch{}return course;}
// Course du client : la plus récente active (ou terminée, pour la note), avec code, suivi, contacts, note, signalement.
const ACTIVES=['En attente','Acceptée','Chauffeur en route','Course en cours'];
async function courseClient(){if(!await transportConnecte())return null;const uid=api.user?.id;const rows=(await api.history('courses')).filter(r=>r.client_id===uid);return rows.find(r=>ACTIVES.includes(r.statut))||rows.find(r=>r.statut==='Terminée')||null;}
const transportSuivi={courseClient,code:id=>api.run('ride_code',{id}),position:id=>api.run('ride_tracking',{id}),contacts:id=>api.run('ride_contacts',{id}),
 annuler:async row=>{const r=await api.transition(row,'Annulée');try{await apresCourse();}catch{}return r;},
 noter:(id,rating,tags,comment)=>api.run('rate_ride',{id,rating,tags,...(comment?{comment}:{})}),signaler:(id,motif,details)=>api.run('report_ride',{id,motif,...(details?{details}:{})})};
// Recherche de l'accueil : boutiques, produits et services validés (même règle de publication que la boutique en ligne).
let rechercheCache=null;
async function catalogueRecherche(){
 if(rechercheCache&&Date.now()-rechercheCache.t<120000)return rechercheCache.rows;
 await initialise();if(!api?.enabled||modules.commerce===false)return [];
 const rows=indexCatalogue(await api.catalog()).liste.map(x=>({id:x.id,kind:x.kind,nom:x.nom,description:x.description||'',categorie:x.categorie||'',village:x.village||''}));
 rechercheCache={t:Date.now(),rows};return rows;
}
// Ouvre la fiche d'un résultat dans Commerces & Services, une fois la boutique en ligne affichée.
async function ouvrirFiche(id){
 try{await window.afficherCommerce?.();}catch{}
 for(let i=0;i<80&&!catalogueHandle?.index;i++)await new Promise(r=>setTimeout(r,100));
 catalogueHandle?.ouvrir(id);
}
// Activité du client : ses courses, commandes et demandes de service (null si le service n'est pas disponible).
async function activite(){
 try{await initialise();}catch{return null;}if(!api?.enabled)return null;
 try{await api.identity();}catch{return {connecte:false};}
 const uid=api.user?.id,lire=async k=>{try{return (await api.history(k)).filter(r=>r.client_id===uid);}catch{return [];}};
 const [courses,commandes,demandes]=await Promise.all(['courses','commandes','demandes_services'].map(lire));
 return {connecte:true,courses,commandes,demandes};
}
window.KokiBusiness={show,catalogueRecherche,ouvrirFiche,activite,rafraichir:()=>catalogueHandle?.recharger(),transportConnecte,transportSuivi,estimer:estimerCourse,chauffeursProches:(c,d)=>api.nearby(c,d),reserver:reserverCourse,ouvrirConnexion,get busy(){return !!api?.busy;},get enabled(){return !!api?.enabled&&modules.transport!==false;},actif:module=>!!api?.enabled&&modules[module]!==false};

// Les retours de récupération sont ouverts dans Profil par retourDeLien().

// ——— Parcours d'inscription professionnelle ———
// Le type choisi (commerçant, prestataire, chauffeur) vient du lien de confirmation ou de cet appareil. Au retour du lien,
// la session est établie puis l'utilisateur arrive directement sur le bon formulaire, sans repasser par l'accueil.
function proStorage(){return localCartStorage();}
let erreurLien='';const prendreErreurLien=()=>{const m=erreurLien;erreurLien='';return m;};
function parcoursPro(module){
 const t=Pro.lire(proStorage()),type=t&&Pro.TYPES[t].module===module?t:null,uid=api?.user?.id;
 const forme=module==='transport'?'chauffeur':'fiche';
 return {intention:module==='transport'?type==='chauffeur':(type?Pro.TYPES[type].profil:null),
  brouillon:uid?{lire:()=>Pro.lireBrouillon(proStorage(),uid,forme),ecrire:(v,etape)=>Pro.ecrireBrouillon(proStorage(),uid,forme,v,etape),effacer:()=>Pro.effacerBrouillon(proStorage(),uid,forme)}:null,
  fin:()=>{if(type)Pro.effacer(proStorage());}};
}
// Compte et fiches professionnelles : tout se trouve dans « Profil ». Les rubriques gardent le catalogue, le panier,
// les demandes, les réservations et leur suivi ; la connexion s'y ouvre sur place quand elle est nécessaire.
async function versProfil(){await window.KokiPortail?.profil?.();}
async function ouvrirEspace(){
 await versProfil();
 document.getElementById(api?.user?'profil-pro':'profil-compte')?.scrollIntoView({block:'start'});
}
function lienProfil(texte){const p=node('p',null);p.className='lien-profil';p.append(node('span',texte+' '));const b=node('button','Ouvrir Profil');b.type='button';b.onclick=()=>versProfil();p.append(b);return p;}
// Connexion sur place : un panneau repliable dans la rubrique, ouvert automatiquement quand une action l'exige.
function connexionSurPlace(host,module,onConnected,options){
 const d=node('details');d.className='connexion-sur-place';d.id='connexion-'+module;
 const resume=node('summary',module==='transport'?'Se connecter pour réserver et suivre vos courses':'Se connecter pour commander et suivre vos commandes');d.append(resume);host.append(d);
 if(options?.erreurLien)d.open=true;
 return accountPanel(d,apiDe(module),async connected=>{if(connected){d.open=true;resume.textContent='Mon compte client';}else resume.textContent=module==='transport'?'Se connecter pour réserver et suivre vos courses':'Se connecter pour commander et suivre vos commandes';await onConnected(connected);if(!connected&&module==='transport')window.dispatchEvent(new Event('koki-transport-session'));},options);
}
function ouvrirConnexion(module){const d=document.getElementById('connexion-'+module);if(!d)return;d.open=true;d.scrollIntoView({block:'start'});}
// Profil : « Mon compte » (connexion, inscription, mot de passe) puis « Mon espace professionnel ».
function choixActivite(host,actuel,intro){
 const sec=node('section');sec.className='pro-choix';sec.append(node('p',intro));
 const grille=node('div');grille.className='pro-choix-grille';
 for(const [type,t] of Object.entries(Pro.TYPES)){if(modules[t.module]===false)continue;const c=node('button');c.type='button';c.className='pro-choix-carte'+(type===actuel?' pro-choix-actuel':'');c.dataset.type=type;if(type===actuel)c.setAttribute('aria-current','true');const i=node('span',t.icone);i.setAttribute('aria-hidden','true');c.append(i,node('strong',t.label),node('span',t.description));c.onclick=()=>window.KokiPro.choisir(type);grille.append(c);}
 sec.append(grille);host.append(sec);
}
const nc=(t,x,c)=>{const e=node(t,x);e.className=c;return e;};
// Espace pro replié en une ligne pour les clients ; ouvert dès qu'une activité est choisie.
function replie(host,t){host.querySelector?.('h3')?.remove();const d=node('details');d.className='pro-replie';d.open=!!t;const s=node('summary');s.append(nc('span','💼','pro-replie-icone'),node('span','Vous êtes commerçant, prestataire ou chauffeur ?'));d.append(s);host.append(d);return d;}
async function espacePro(host,connected){
 host.replaceChildren(node('h3','Mon espace professionnel'));const status=node('p');status.setAttribute('role','status');host.append(status);
 const t=Pro.lire(proStorage());
 if(!connected){
  const d=replie(host,t);
  choixActivite(d,t,t?'Activité choisie : '+Pro.TYPES[t].label+'. Connectez-vous ci-dessus avec votre adresse e-mail et votre mot de passe : votre fiche s’ouvrira ensuite ici.':'Choisissez votre activité, puis connectez-vous ci-dessus. Votre fiche sera vérifiée par l’administration avant publication.');
  if(t)action(d,'Annuler ce choix',async()=>{Pro.effacer(proStorage());await versProfil();},status);
  return;
 }
 const [fiches,chauffeurs]=await Promise.all([modules.commerce?api.mine('professionnels'):[],modules.transport?api.mine('chauffeurs'):[]]);
 // Un client déjà connecté doit aussi définir un mot de passe avant sa première fiche professionnelle.
 // Ce marqueur facilite le parcours ; il ne confère aucun rôle ni aucune autorisation.
 if(Pro.premiereCreationSansMotDePasse(t,api.user,fiches,chauffeurs)){
  const f=form(host,'Définir mon mot de passe professionnel',[['password','Mot de passe (12 caractères minimum)','password'],['confirm','Confirmer le mot de passe','password']],async x=>{
   if(x.password.value!==x.confirm.value)throw Error('Les mots de passe ne correspondent pas.');
   try{await api.setProfessionalPassword(x.password.value);}finally{x.password.value='';x.confirm.value='';}await espacePro(host,true);
  },status);f.inputs.password.minLength=12;f.inputs.confirm.minLength=12;f.inputs.password.autocomplete=f.inputs.confirm.autocomplete='new-password';f.b.textContent='Enregistrer mon mot de passe';return;
 }
 const commerce=modules.commerce&&(fiches.length>0||t==='commercant'||t==='prestataire'),transport=modules.transport&&(chauffeurs.length>0||t==='chauffeur');
 if(commerce){const s=node('section');host.append(s);await proSpace(s,api,status,{upload,imageSelection,...parcoursPro('commerce')});}
 if(transport){const s=node('section');s.className='business-panel';host.append(s);await professional(s,api,'transport',status,{upload,...parcoursPro('transport')});}
 if(!commerce&&!transport){choixActivite(replie(host,t),t,'Choisissez votre activité pour créer votre fiche professionnelle.');return;}
 if(fiches.some(f=>['Commerçant','Les deux'].includes(f.payload?.type)))return;
 const autre=node('details');autre.className='pro-autre';autre.append(node('summary','Ajouter une autre activité'));choixActivite(autre,t,'Choisissez l’activité à ajouter :');host.append(autre);
}
// Profil façon application : en-tête (compte), raccourcis, compte / connexion, espace professionnel, déconnexion.
function raccourcis(){
 const nav=node('div');nav.className='pf-raccourcis';nav.setAttribute('role','group');nav.setAttribute('aria-label','Raccourcis');
 for(const [icone,texte,fn] of [['🧾','Mes commandes et courses',()=>window.KokiActivite?.ouvrir()],['❤️','Mes favoris',()=>window.KokiPortail?.favoris()],['🔔','Notifications',()=>window.afficherNotifications?.()],['ℹ️','Aide et informations',()=>window.afficherMenu?.()]]){
  const b=node('button');b.type='button';b.className='pf-raccourci';b.append(nc('span',icone,'pf-raccourci-icone'),node('span',texte),nc('span','›','pf-chevron'));b.onclick=fn;nav.append(b);}
 return nav;
}
function entete(tete,u,qui){
 tete.replaceChildren();const a=nc('span',u?String(qui||'K').replace(/^\+?221\s?/,'').trim().charAt(0).toUpperCase()||'K':'👤','pf-avatar');
 const t=nc('div','','pf-tete-texte');t.append(node('strong',u?qui:'Bienvenue sur Koki Connect'),node('span',u?'Compte connecté sur cet appareil':'Connectez-vous avec le lien reçu par e-mail pour commander, réserver une course et suivre vos demandes. Les professionnels peuvent aussi utiliser leur mot de passe.'));
 tete.append(a,t);tete.classList.toggle('pf-tete-connecte',!!u);
}
async function espaceProfil(host){
 host.replaceChildren(node('p','Chargement de votre espace…'));
 try{await initialise();}catch(e){host.replaceChildren(node('p',lisible(e)));return;}
 host.replaceChildren();
 const tete=node('section');tete.className='pf-tete';entete(tete,null);
 const compte=node('section');compte.id='profil-compte';compte.className='business-panel profil-compte';const titre=node('h3','Se connecter');compte.append(titre);
 const pro=node('section');pro.id='profil-pro';pro.className='profil-pro';const fin=node('div');fin.className='pf-fin';
 const liens=raccourcis();host.append(tete,compte,liens,pro,fin);
 const service=modules.commerce?apiDe('commerce'):apiDe('transport');
 accountPanel(compte,service,async connected=>{titre.hidden=!!connected;compte.classList.toggle('pf-compte-connecte',!!connected);if(!connected)entete(tete,null);tete.hidden=false;liens.hidden=false;host.classList.remove('profil-boutique');try{await espacePro(pro,connected&&service.enabled);if(connected&&modules.commerce){const boutiques=await api.mine('boutiques');const marchand=boutiques.some(b=>b.statut!=='Archivé');tete.hidden=marchand;liens.hidden=marchand;host.classList.toggle('profil-boutique',marchand);}}catch(e){pro.append(node('p',lisible(e)));}},{intention:()=>{const t=Pro.lire(proStorage());return t?Pro.TYPES[t].label:null;},retour:()=>Pro.urlRetour(location.href,Pro.lire(proStorage())),erreurLien:prendreErreurLien(),
  connecte:(box,u,qui)=>entete(tete,u,qui),deconnexion:fin});
 // Avant connexion (ou service en préparation), le choix d'activité est déjà proposé.
 if(!api?.user)await espacePro(pro,false);
}
window.KokiPro=Object.freeze({types:Pro.TYPES,choix:()=>Pro.lire(proStorage()),monter:espaceProfil,
 async choisir(type){Pro.enregistrer(proStorage(),type);await ouvrirEspace(type);},
 oublier(){Pro.effacer(proStorage());}});
(function retourDeLien(){
 const href=location.href,type=Pro.depuisURL(href),auth=Pro.retourAuth(href);
 if(type)Pro.enregistrer(proStorage(),type);
 if(auth.erreur)erreurLien=Pro.messageLien(auth.erreur);
 // Nettoyage de l'adresse : paramètre du parcours retiré ; fragment d'erreur retiré ; les jetons de session restent pour Supabase.
 try{if(type||auth.erreur){const u=new URL(href);u.searchParams.delete('koki-pro');if(auth.erreur)u.hash='';window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);}}catch{}
 if(!type&&!auth.session&&!auth.erreur&&new URLSearchParams(location.search).get('koki-recovery')!=='1')return;
 queueMicrotask(async()=>{
  const choix=Pro.lire(proStorage());
  try{await initialise();}catch{}
  // Retour du lien (session, type choisi ou lien expiré) : tout se passe dans « Profil » (compte puis fiche).
  if(!choix&&auth.session&&!auth.erreur&&window.KokiPortail?.profil){await window.KokiPortail.profil();return;}
  await ouvrirEspace(choix);
 });
})();

window.KokiNotifications={async ouvrir(){const host=document.getElementById('notifications-personnelles');if(!host)return;try{await initialise();let c={};try{const r=await fetch('assets/business/notifications.json',{cache:'no-store'});if(r.ok)c=await r.json();}catch{}await renderNotifications(host,db,c);}catch{host.textContent='Notifications indisponibles. Réessayez.';}}};
window.addEventListener?.('koki-notifications-open',()=>window.KokiNotifications.ouvrir());
globalThis.navigator?.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='koki-notifications-open')window.afficherNotifications?.();});
if(new URLSearchParams(location.search).get('notifications')==='1')queueMicrotask(()=>window.afficherNotifications?.());

function inviterNotifications(){
 return mountNotificationPrompt({signedIn:()=>!!sessionEnregistree()&&!sessionEnregistree().is_anonymous,openAccount:()=>window.KokiPortail?.profil?.(),activate:async(key,permission)=>{if(await permission!=='granted')return false;await initialise();if(!db)return false;return enablePush(db,key,permission);}}).catch(()=>{});
}
if(globalThis.document?.body&&window.addEventListener){
 window.addEventListener('koki-push-enabled',()=>document.getElementById('koki-notification-prompt')?.remove());
 setTimeout(()=>inviterNotifications(),4000);
}

// API des publications : la session est rafraîchie par le client partagé, jamais un jeton copié.
window.KokiSocialAPI=async args=>{
 await initialise();if(!db)throw Error('Interactions momentanément indisponibles.');
 if(args.p_action&&args.p_action!=='read'){
  const {data,error}=await db.auth.getUser();
  if(error||!data?.user||data.user.is_anonymous){const e=Error('Connectez-vous pour aimer ou commenter.');e.code='LOGIN';throw e;}
 }
 const {data,error}=await db.rpc('koki_content_social',args);
 if(error)throw Error(error.code==='42501'?'Connectez-vous pour participer.':/Trop de commentaires/.test(error.message)?'Trop de commentaires. Réessayez plus tard.':'Impossible de charger ou enregistrer les interactions. Réessayez.');
 return data;
};

window.KokiSocialSummary=async ids=>{await initialise();if(!db)return [];const {data,error}=await db.rpc('koki_social_summaries',{p_ids:ids});if(error)throw Error('Compteurs indisponibles');return data;};
