// Invitation facultative. Le navigateur n'est sollicité qu'après un clic explicite.
export const SNOOZE_KEY='koki.notifications.remind-after';
export function promptMode({enabled,permission,subscribed,remindAfter=0,now=Date.now(),ios=false,standalone=false,supported=false,signedIn=false}){
 if(!enabled||permission==='denied'||subscribed||remindAfter>now)return 'hidden';
 if(ios&&!standalone)return 'install';
 if(!supported)return 'hidden';
 return signedIn?'activate':'login';
}
export async function mountNotificationPrompt({signedIn,activate,openAccount,storage,configURL='assets/business/notifications.json'}={}){
 if(document.getElementById('koki-notification-prompt'))return;
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 let config;try{const r=await fetch(configURL,{cache:'no-store'});if(!r.ok)return;config=await r.json();}catch{return;}
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let subscription=null;try{subscription=await (await navigator.serviceWorker?.getRegistration())?.pushManager?.getSubscription();}catch{}
 let remindAfter=0;try{remindAfter=Number(storage?.getItem(SNOOZE_KEY))||0;}catch{}
 const mode=promptMode({enabled:!!config.vapidPublicKey,permission:globalThis.Notification?.permission,subscribed:!!subscription,remindAfter,ios,standalone,supported:'Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator,signedIn:signedIn()});
 if(mode==='hidden'||document.getElementById('koki-notification-prompt'))return;
 const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
 const box=make('aside','');box.id='koki-notification-prompt';box.className='notification-invitation';box.setAttribute('aria-labelledby','notification-invitation-title');
 const title=make('h2','🔔 Restez informé avec Koki Connect');title.id='notification-invitation-title';
 const text=make('p',mode==='install'?'Sur iPhone, utilisez Partager → Sur l’écran d’accueil, puis ouvrez l’icône Koki Connect pour activer vos notifications.':mode==='login'?'Connectez-vous pour recevoir les alertes de vos commandes, courses et demandes.':'Recevez les nouvelles de vos commandes, courses et demandes, même lorsque l’application est fermée.');
 const status=make('p','');status.setAttribute('role','status');
 const actions=make('div','');actions.className='notification-invitation-actions';
 const later=make('button',mode==='install'?'Compris':'Plus tard');later.type='button';later.className='notification-invitation-later';
 const snooze=()=>{try{storage?.setItem(SNOOZE_KEY,String(Date.now()+7*86400000));}catch{}box.remove();};later.onclick=snooze;
 if(mode!=='install'){
  const yes=make('button',mode==='login'?'Me connecter':'Activer les notifications');yes.type='button';yes.className='notification-invitation-activate';
  yes.onclick=()=>{
   if(mode==='login'){box.remove();openAccount();return;}
   yes.disabled=true;later.disabled=true;
   // La permission doit être demandée pendant le clic, avant tout await réseau (Safari).
   const permission=Notification.requestPermission();
   Promise.resolve(activate(config.vapidPublicKey,permission)).then(ok=>{if(ok){box.replaceChildren(make('p','✓ Notifications activées sur cet appareil.'));setTimeout(()=>box.remove(),3000);}else snooze();}).catch(()=>{status.textContent='Activation impossible. Réessayez ou passez par la cloche Notifications.';}).finally(()=>{yes.disabled=false;later.disabled=false;});
  };actions.append(yes);
 }
 actions.append(later);box.append(title,text,actions,status);document.body.append(box);
}
