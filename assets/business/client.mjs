// Coupure de réseau : message compréhensible, et la demande en attente est conservée pour être reprise.
export const HORS_LIGNE=/Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|AuthRetryableFetchError/i;
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
export function createBusinessClient(db,{enabled=false,storage=null,uuid=()=>crypto.randomUUID(),notify=()=>{}}={}){
 let recovering=false;db?.auth.onAuthStateChange?.(event=>{if(event==='PASSWORD_RECOVERY'){recovering=true;queueMicrotask(()=>emit({state:'recovery'}));}else if(event==='SIGNED_IN'){setTimeout(()=>emit({state:'signed-in'}),0);}});
 let user=null,mediaFolder=null;const pending=new Map(),listeners=new Set(),waiters=[];let busy=false;const emit=value=>{notify(value);for(const listener of listeners)listener(value);};
 const requireReady=()=>{if(!enabled||!db)throw Error('Service connecté en préparation : activation après validation des migrations.');};
 const scope=()=>`koki.business.pending.${user?.id}`;
 function restore(){pending.clear();try{for(const [k,v] of JSON.parse(storage?.getItem(scope())||'[]'))pending.set(k,v);}catch{}}
 function persist(){try{storage?.setItem(scope(),JSON.stringify([...pending]));}catch{/* Retry remains available in memory. */}}
 async function identity(){requireReady();const {data,error}=await db.auth.getUser();if(error&&HORS_LIGNE.test(String(error.message||error.name||''))){const e=Error(MESSAGE_HORS_LIGNE);e.horsLigne=true;throw e;}if(error||!data?.user||data.user.is_anonymous){user=null;pending.clear();throw Error('Connectez-vous avec un compte client permanent.');}if(user?.id!==data.user.id){user=data.user;mediaFolder=null;restore();}return user;}
 async function run(command,input={},operation=command){requireReady();const mutation=!reads.has(command);if(command!=='catalog')await identity();while(busy){if(mutation)throw Error('Une opération est déjà en cours.');await new Promise(resolve=>waiters.push(resolve));}
 const body=structuredClone(input);let item;
 if(mutation){const fingerprint=JSON.stringify(body);item=pending.get(operation);if(item&&(item.command!==command||item.fingerprint!==fingerprint))throw Error('Une demande attend confirmation. Reprenez-la avec les mêmes informations avant de les modifier.');if(!item){item={command,fingerprint,input:structuredClone(body),request_id:uuid()};pending.set(operation,item);persist();}body.request_id=item.request_id;}
 busy=true;emit({state:'loading',command});try{const {data,error}=await db.rpc('koki_business',{command,input:body});if(error){const e=Error(HORS_LIGNE.test(String(error.message||''))?MESSAGE_HORS_LIGNE:error.code==='42501'?'Autorisation refusée. Vérifiez votre compte et vos droits.':error.code==='PGRST202'?'Fonctions serveur non activées sur cet environnement.':error.message||'Opération refusée.');e.definitive=!!error.code&&!['57014','08006','08000'].includes(error.code)&&!String(error.code).startsWith('5');throw e;}
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
 async login(email,password){requireReady();const {error}=await db.auth.signInWithPassword({email:email.trim(),password});if(error)throw Error('Connexion refusée. Vérifiez vos identifiants.');return identity();},
 async sendCode(phone){requireReady();const number=normalizePhone(phone);const {error}=await db.auth.signInWithOtp({phone:number,options:{shouldCreateUser:true,channel:'sms'}});if(error)throw Error(error.status===429||/rate|second/i.test(error.message||'')?'Trop de demandes. Patientez avant de redemander un code.':'Envoi du code impossible. Vérifiez le numéro et réessayez.');return number;},
 async verifyCode(phone,code){requireReady();const number=normalizePhone(phone);const token=String(code??'').replace(/\s/g,'');if(!/^\d{6}$/.test(token))throw Error('Saisissez le code à 6 chiffres reçu par SMS.');const {error}=await db.auth.verifyOtp({phone:number,token,type:'sms'});if(error)throw Error('Code invalide ou expiré. Redemandez un code.');return identity();},
 // Lien de confirmation : retour sur la page publique (si elle figure dans les « Redirect URLs » de Supabase ; sinon l'URL du site est utilisée).
 // retour : lien de confirmation (même site, https ou poste local), par exemple avec le type d'activité choisi.
 async signup(email,password,{retour}={}){requireReady();const options={};const to=lienRetour(retour);if(to)options.emailRedirectTo=to;const {error}=await db.auth.signUp({email:email.trim(),password,options});if(error)throw Error(messageInscription(error));},
 // Nouvel e-mail de confirmation (lien expiré ou perdu). Réponse identique que le compte existe ou non.
 async resendConfirmation(email,{retour}={}){requireReady();const options={};const to=lienRetour(retour);if(to)options.emailRedirectTo=to;const {error}=await db.auth.resend({type:'signup',email:String(email||'').trim(),options});if(error)throw Error(messageInscription(error));},
 async logout(){requireReady();if(pending.size)throw Error('Une demande attend confirmation. Reprenez-la avant de vous déconnecter.');const {error}=await db.auth.signOut({scope:'local'});if(error)throw Error('Déconnexion impossible.');try{storage?.removeItem(scope());}catch{}user=null;pending.clear();},
 pending(){return [...pending.entries()].map(([operation,v])=>({operation,...structuredClone(v)}));},
 retry(operation){const v=pending.get(operation);if(!v)throw Error('Aucune demande à reprendre.');return run(v.command,v.input,operation);},
 catalog:()=>run('catalog'),history:kind=>run('history',{kind}),get:id=>run('get',{id}),
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
