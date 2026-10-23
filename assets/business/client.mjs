// Coupure de réseau : message compréhensible, et la demande en attente est conservée pour être reprise.
// Données de trajet conservées sur l'appareil (course en cours, notes de chauffeurs) : liées au compte, effacées à la déconnexion.
// Les favoris et les fiches enregistrées par la personne sur son appareil ne sont pas touchés.
const CLES_COMPTE=['koki.transport.demo.course.v1','koki.transport.notees.v1'];
function purgerDonneesCompte(){for(const k of CLES_COMPTE){try{globalThis.localStorage?.removeItem(k);}catch{}try{globalThis.sessionStorage?.removeItem(k);}catch{}}}
export const HORS_LIGNE=/Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|AuthRetryableFetchError/i;
// Erreur passagère (réseau, serveur occupé ou en panne) : jamais une raison de déconnecter le client.
export const transitoire=e=>!!e&&(HORS_LIGNE.test(String(e.message||e.name||''))||e.name==='AuthRetryableFetchError'||e.name==='AuthUnknownError'||e.status===0||e.status===429||e.status>=500||/timeout|timed out|temporar/i.test(String(e.message||'')));
export const MESSAGE_HORS_LIGNE='Connexion internet indisponible. Vérifiez votre connexion puis réessayez.';
import './commerce-contract.js';
const C=globalThis.KokiCommerceContract;
// Lectures et actions uniques sans clé de reprise (le serveur refuse le doublon : note, signalement).
const reads=new Set(['catalog','history','get','quote','nearby_drivers','ride_contacts','localites','media_folder','ride_code','ride_tracking','rate_ride','report_ride','driver_stats']);
export const vehicles=['Moto','Taxi','Voiture','Minicar'];
// Numéros sénégalais (77 123 45 67, 33 …) complétés en +221 ; autres pays au format international. Règle du contrat partagé.
export function normalizePhone(value){const v=C.normaliserTelephone(value);if(!v)throw Error('Numéro invalide : utilisez le format international (+221…).');return v;}
// Messages d'inscription selon le code renvoyé par Supabase Auth (aucun détail technique ni secret affiché).
export function messageInscription(error){const code=String(error?.code||''),status=error?.status;
 if(code==='signup_disabled'||code==='email_provider_disabled')return 'Les inscriptions ne sont pas encore ouvertes sur Koki Connect. Réessayez plus tard ou contactez Koki Connect.';
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||status===429)return 'Trop de demandes d’inscription pour le moment. Patientez quelques minutes puis réessayez.';
 if(code==='weak_password')return 'Mot de passe jugé trop faible : choisissez au moins 12 caractères en mélangeant lettres, chiffres et symboles.';
 if(code==='user_already_exists'||code==='email_exists')return 'Un compte existe déjà avec cette adresse : connectez-vous ou utilisez « Mot de passe oublié ».';
 if(code==='email_address_invalid'||code==='validation_failed')return 'Adresse e-mail refusée : vérifiez-la et réessayez.';
 if(code==='email_address_not_authorized')return 'L’e-mail de confirmation ne peut pas être envoyé à cette adresse pour le moment. Contactez Koki Connect.';
 return 'Inscription impossible. Réessayez ou contactez Koki Connect.';}
// Adresse de retour acceptée : même origine que la page, en https (ou poste local) ; sinon la page publique actuelle.
export function lienRetour(retour){try{const url=new URL(retour||location.origin+location.pathname,location.href);if(url.origin!==location.origin)return null;if(!(url.protocol==='https:'||url.hostname==='127.0.0.1'||url.hostname==='localhost'))return null;url.hash='';return url.href;}catch{return null;}}
export function nextStatus(row){const chain=row.kind==='courses'?['En attente','Acceptée','Chauffeur en route','Course en cours','Terminée']:row.kind==='commandes'?(row.payload.mode==='retrait'?['Commande reçue','Confirmée','Préparation','Prête au retrait','Retirée']:['Commande reçue','Confirmée','Préparation','En livraison','Livrée']):['Demande envoyée','Acceptée','Prestataire en route','Service en cours','Terminé'];return chain[chain.indexOf(row.statut)+1]||null;}
export function createBusinessClient(db,{enabled=false,storage=null,uuid=()=>crypto.randomUUID(),notify=()=>{},sessionLocale=()=>null,secours={lire:()=>null,ecrire:()=>{},effacer:()=>{}}}={}){
 let recovering=false,voulue=false,restauration=false;
 // Jamais de déconnexion automatique : seule la déconnexion demandée par le client ferme le compte.
 // Copie de secours de la session ; si elle disparaît sans demande du client, on la rétablit une fois.
 db?.auth.onAuthStateChange?.((event,session)=>{
  if(session?.refresh_token&&event!=='SIGNED_OUT'){try{secours.ecrire({access_token:session.access_token,refresh_token:session.refresh_token});}catch{}}
  if(event==='SIGNED_OUT'){
   if(voulue){try{secours.effacer();}catch{}}
   else if(!restauration){let c=null;try{c=secours.lire();}catch{}
    if(c?.refresh_token){restauration=true;setTimeout(async()=>{try{const r=await db.auth.setSession(c);if(r?.error&&!transitoire(r.error))secours.effacer();}catch{}finally{restauration=false;}},0);}}
  }
  if(event==='PASSWORD_RECOVERY'){recovering=true;queueMicrotask(()=>emit({state:'recovery'}));}else if(event==='SIGNED_IN'){setTimeout(()=>emit({state:'signed-in'}),0);}});
 const UUID=/^[0-9a-f-]{36}$/,EVENEMENTS=['vue','appel','whatsapp','commander','partage','panier','devis'],deja=new Set();let suiviIndisponible=false;
 let user=null,mediaFolder=null;const pending=new Map(),listeners=new Set(),waiters=[];let busy=false;const emit=value=>{notify(value);for(const listener of listeners)listener(value);};
 const requireReady=()=>{if(!enabled||!db)throw Error('Service connecté en préparation : activation après validation des migrations.');};
 const scope=()=>`koki.business.pending.${user?.id}`;
 function restore(){pending.clear();try{for(const [k,v] of JSON.parse(storage?.getItem(scope())||'[]'))pending.set(k,v);}catch{}}
 function persist(){try{storage?.setItem(scope(),JSON.stringify([...pending]));}catch{/* Retry remains available in memory. */}}
 function sessionHorsLigne(){let l=null;try{l=sessionLocale();}catch{}if(!l?.id||l.is_anonymous)return null;if(user?.id!==l.id){user=l;mediaFolder=null;restore();}else user=l;return user;}
 async function identity(){requireReady();
  // Téléphone en mode hors connexion : réponse immédiate avec la session enregistrée (pas d'attente réseau).
  if(typeof navigator!=='undefined'&&navigator.onLine===false){const l=sessionHorsLigne();if(l)return l;}
  const {data,error}=await db.auth.getUser();if(error&&transitoire(error)){
  // Sans connexion, le client reste connecté : on garde la session enregistrée sur le téléphone (aucune déconnexion).
  {const l=sessionHorsLigne();if(l)return l;}
  const e=Error(MESSAGE_HORS_LIGNE);e.horsLigne=true;throw e;}if(error||!data?.user||data.user.is_anonymous){user=null;pending.clear();throw Error('Connectez-vous avec un compte client permanent.');}if(user?.id!==data.user.id){user=data.user;mediaFolder=null;restore();}else user=data.user;return user;}
 async function run(command,input={},operation=command){requireReady();const mutation=!reads.has(command);if(command!=='catalog')await identity();while(busy){if(mutation)throw Error('Une opération est déjà en cours.');await new Promise(resolve=>waiters.push(resolve));}
 const body=structuredClone(input);let item;
 if(mutation){const fingerprint=JSON.stringify(body);item=pending.get(operation);if(item&&(item.command!==command||item.fingerprint!==fingerprint))throw Error('Une demande attend confirmation. Reprenez-la avec les mêmes informations avant de les modifier.');if(!item){item={command,fingerprint,input:structuredClone(body),request_id:uuid()};pending.set(operation,item);persist();}body.request_id=item.request_id;}
 busy=true;emit({state:'loading',command});try{const {data,error}=await db.rpc('koki_business',{command,input:body});if(error){const e=Error(HORS_LIGNE.test(String(error.message||''))?MESSAGE_HORS_LIGNE:error.code==='42501'?'Autorisation refusée. Vérifiez votre compte et vos droits.':error.code==='PGRST202'?'Fonctions serveur non activées sur cet environnement.':error.message||'Opération refusée.');if(e.message===MESSAGE_HORS_LIGNE)e.horsLigne=true;e.definitive=!!error.code&&!['57014','08006','08000'].includes(error.code)&&!String(error.code).startsWith('5');throw e;}
 if(mutation){pending.delete(operation);persist();}emit({state:'success',command});return data;
 }catch(e){if(mutation&&e.definitive){pending.delete(operation);persist();}emit({state:'error',command,retry:mutation&&pending.has(operation)});throw e;}finally{busy=false;emit({state:'idle',command});waiters.shift()?.();}}
 return {subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},get enabled(){return enabled&&!!db;},get busy(){return busy;},get user(){return user;},get recovering(){return recovering;},identity,run,
 async recover(email,redirect){requireReady();const url=new URL(redirect);if(url.origin!==location.origin||!(url.protocol==='https:'||url.hostname==='127.0.0.1'||url.hostname==='localhost'))throw Error('Lien de récupération invalide.');const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:url.href});if(error)throw Error('Envoi indisponible. Patientez avant de réessayer.');},
 async changePassword(password){requireReady();await identity();if(password.length<12)throw Error('Choisissez au moins 12 caractères.');const {error}=await db.auth.updateUser({password});if(error)throw Error('Modification refusée. Vérifiez votre session et la double authentification si elle est activée.');recovering=false;},
 async sendEmailLink(email,{retour}={}){
  requireReady();const address=String(email||'').trim(),to=lienRetour(retour);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw Error('Vérifiez votre adresse e-mail.');
  if(!to)throw Error('Lien de retour invalide.');
  const {error}=await db.auth.signInWithOtp({email:address,options:{shouldCreateUser:true,emailRedirectTo:to}});
  if(error){if(HORS_LIGNE.test(String(error.message||'')))throw Error(MESSAGE_HORS_LIGNE);
   if(error.status===429||/rate_limit/.test(error.code||''))throw Error('Trop de demandes. Patientez une minute avant de demander un nouveau lien.');
   throw Error('Impossible d’envoyer le lien de connexion. Vérifiez votre adresse ou réessayez plus tard.');}
 },
 async setProfessionalPassword(password){requireReady();await identity();if(password.length<12)throw Error('Choisissez au moins 12 caractères.');const {error}=await db.auth.updateUser({password,data:{professional_password_set:true}});if(error)throw Error('Mot de passe non enregistré. Réessayez.');return identity();},
 async login(email,password){requireReady();const {error}=await db.auth.signInWithPassword({email:email.trim(),password});if(error)throw Error('Connexion refusée. Vérifiez vos identifiants.');return identity();},
 async sendCode(phone){requireReady();const number=normalizePhone(phone);const {error}=await db.auth.signInWithOtp({phone:number,options:{shouldCreateUser:true,channel:'sms'}});if(error)throw Error(error.status===429||/rate|second/i.test(error.message||'')?'Trop de demandes. Patientez avant de redemander un code.':'Envoi du code impossible. Vérifiez le numéro et réessayez.');return number;},
 async verifyCode(phone,code){requireReady();const number=normalizePhone(phone);const token=String(code??'').replace(/\s/g,'');if(!/^\d{6}$/.test(token))throw Error('Saisissez le code à 6 chiffres reçu par SMS.');const {error}=await db.auth.verifyOtp({phone:number,token,type:'sms'});if(error)throw Error('Code invalide ou expiré. Redemandez un code.');return identity();},
 // Lien de confirmation : retour sur la page publique (si elle figure dans les « Redirect URLs » de Supabase ; sinon l'URL du site est utilisée).
 // retour : lien de confirmation (même site, https ou poste local), par exemple avec le type d'activité choisi.
 async signup(email,password,{retour,professional=false}={}){requireReady();if(professional&&password.length<12)throw Error('Choisissez au moins 12 caractères.');const options=professional?{data:{professional_password_set:true}}:{};const to=lienRetour(retour);if(to)options.emailRedirectTo=to;const {error}=await db.auth.signUp({email:email.trim(),password,options});if(error)throw Error(messageInscription(error));},
 // Nouvel e-mail de confirmation (lien expiré ou perdu). Réponse identique que le compte existe ou non.
 async resendConfirmation(email,{retour}={}){requireReady();const options={};const to=lienRetour(retour);if(to)options.emailRedirectTo=to;const {error}=await db.auth.resend({type:'signup',email:String(email||'').trim(),options});if(error)throw Error(messageInscription(error));},
 async logout(){requireReady();if(pending.size)throw Error('Une demande attend confirmation. Reprenez-la avant de vous déconnecter.');voulue=true;let error;try{({error}=await db.auth.signOut({scope:'local'}));}finally{voulue=false;}if(error)throw Error('Déconnexion impossible.');try{secours.effacer();}catch{}try{storage?.removeItem(scope());}catch{}purgerDonneesCompte();user=null;pending.clear();},
 pending(){return [...pending.entries()].map(([operation,v])=>({operation,...structuredClone(v)}));},
 retry(operation){const v=pending.get(operation);if(!v)throw Error('Aucune demande à reprendre.');return run(v.command,v.input,operation);},
 catalog:()=>run('catalog'),
 // Avis, suivi et statistiques : fonctions serveur facultatives. Tant qu'elles ne sont pas installées (PGRST202), l'application les ignore.
 async avis(id){if(!enabled||!db||!UUID.test(String(id)))return null;try{const {data,error}=await db.rpc('koki_reviews_list',{p_target:id});if(error)return null;return data&&Number.isFinite(data.total)?data:null;}catch{return null;}},
 async ajouterAvis(id,note,commentaire=''){requireReady();await identity();if(!UUID.test(String(id))||!Number.isInteger(note)||note<1||note>5)throw Error('Choisissez une note de 1 à 5.');
  const {error}=await db.rpc('koki_review_save',{p_target:id,p_rating:note,p_comment:String(commentaire).slice(0,500)});
  if(error)throw Error(transitoire(error)?MESSAGE_HORS_LIGNE:error.code==='PGRST202'?'Les avis ne sont pas encore ouverts.':error.code==='42501'?'Connectez-vous avec un compte client pour donner un avis.':error.code==='P0001'?error.message:'Avis refusé. Réessayez plus tard.');},
 suivre(id,evenement){
  if(!enabled||!db||suiviIndisponible||!UUID.test(String(id))||!EVENEMENTS.includes(evenement))return;
  const cle=id+':'+evenement;if(['vue','partage'].includes(evenement)){if(deja.has(cle))return;deja.add(cle);}
  try{Promise.resolve(db.rpc('koki_track',{p_target:id,p_kind:evenement})).then(r=>{if(r?.error?.code==='PGRST202')suiviIndisponible=true;},()=>{});}catch{/* facultatif */}},
 async statistiques(jours=30){requireReady();await identity();const {data,error}=await db.rpc('koki_stats_mine',{p_days:Math.max(1,Math.min(Number(jours)||30,365))});
  if(error){if(error.code==='PGRST202')return null;throw Error(transitoire(error)?MESSAGE_HORS_LIGNE:'Statistiques indisponibles.');}return data;},history:kind=>run('history',{kind}),get:id=>run('get',{id}),
 estimate:(category,start,end)=>run('quote',{category,start:{latitude:start.latitude,longitude:start.longitude},end:{latitude:end.latitude,longitude:end.longitude}}),
 nearby:(category,start)=>run('nearby_drivers',{category,start:{latitude:start.latitude,longitude:start.longitude}}),
 reserve:(quote,vehicle)=>run('reserve_ride',{quote_id:quote.quote_id,vehicle_id:vehicle},'reserve'),
 order:(shop,items,mode,address)=>run('create_order',{shop_id:shop,items:items.map(x=>({product_id:x.product_id,quantity:x.quantity})),mode,address},'order'),
 transition:(row,next)=>run('transition',{id:row.id,revision:row.revision,next},'transition:'+row.id),
 async mine(kind){requireReady();await identity();const {data,error}=await db.from('koki_records').select('*').eq('kind',kind).eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(100);if(error)throw Error('Chargement de votre espace impossible.');return data||[];},
 async rates(){requireReady();const {data,error}=await db.from('koki_transport_rates').select('*').order('category');if(error)throw Error('Tarifs indisponibles.');return data||[];},
 async image(path){requireReady();const {data,error}=await db.storage.from('koki-media').createSignedUrl(path,120);if(error)throw Error('Image inaccessible.');const url=new URL(data.signedUrl),base=new URL(db.supabaseUrl);const local=base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname);if(url.origin!==base.origin||!(url.protocol==='https:'||(local&&url.protocol==='http:'))||!url.pathname.startsWith('/storage/v1/object/'))throw Error('Image invalide.');return url.href;},
 // Espace professionnel (Commerces & Services) : identifiants techniques jamais saisis, fournis par l'état chargé.
 async localites(){try{const rows=await run('localites');if(Array.isArray(rows)&&rows.length)return rows.map(x=>x.nom);}catch{}return [...C.localitesParDefaut];},
 async mediaFolder(){if(!mediaFolder){const {folder}=await run('media_folder');if(!/^[0-9a-f-]{36}$/.test(folder||''))throw Error('Dossier photo indisponible.');mediaFolder=folder;}return mediaFolder;},
 saveProfile:(values,row)=>run('save_profile',{...values,...(row?{id:row.id,revision:row.revision}:{})},'pro:profile'),
 saveShop:(values,row)=>run('save_shop',{...values,...(row?{id:row.id,revision:row.revision,parent_id:row.parent_id}:{})},'pro:boutiques:'+(row?.id||'nouvelle')),
 saveProduct:(values,row)=>run('save_product',{...values,...(row?{id:row.id,revision:row.revision,parent_id:row.parent_id}:{})},'pro:produits:'+(row?.id||'nouveau')),
 saveService:(values,row)=>run('save_service',{...values,...(row?{id:row.id,revision:row.revision,parent_id:row.parent_id}:{})},'pro:services:'+(row?.id||'nouveau')),
 setAvailability:(row,statut)=>run('set_availability',{id:row.id,revision:row.revision,status:statut},'pro:dispo:'+row.id),
 archive:row=>run('archive',{id:row.id,revision:row.revision},'pro:archive:'+row.id)
 };
}
