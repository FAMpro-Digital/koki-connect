'use strict';
// Notifications de l'application iPhone (APNs) : extension Capacitor, enregistrement du jeton, retrait, script SQL.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function charger(plugin,plateforme='ios'){
 delete require.cache[require.resolve('../assets/portail/natif.js')];
 const stock=new Map();
 globalThis.localStorage={getItem:k=>stock.get(k)??null,setItem:(k,v)=>stock.set(k,String(v)),removeItem:k=>stock.delete(k)};
 globalThis.Capacitor={isNativePlatform:()=>plateforme!=='web',getPlatform:()=>plateforme,Plugins:plugin?{PushNotifications:plugin}:{}};
 return {N:require('../assets/portail/natif.js'),stock};
}
function fauxPlugin({permission='granted',jeton='AB'.repeat(32),echec=false}={}){
 const ecouteurs={},appels=[];
 return {appels,checkPermissions:async()=>({receive:permission==='granted'?'granted':'prompt'}),requestPermissions:async()=>{appels.push('demande');return {receive:permission};},
  addListener:(nom,f)=>{ecouteurs[nom]=f;return {remove:()=>{delete ecouteurs[nom];}};},
  register:async()=>{appels.push('register');setTimeout(()=>echec?ecouteurs.registrationError?.({error:'x'}):ecouteurs.registration?.({value:jeton}),0);},
  unregister:async()=>{appels.push('unregister');}};
}
test('activer : autorisation, jeton en minuscules enregistré sur le compte puis gardé sur le téléphone',async()=>{
 const P=fauxPlugin();const {N,stock}=charger(P);const envoyes=[];
 assert.equal(N.notificationsDisponibles(),true);assert.equal(N.notificationsActives(),false);
 assert.equal(await N.activerNotifications(async t=>{envoyes.push(t);}),true);
 assert.deepEqual(envoyes,['ab'.repeat(32)]);assert.equal(stock.get('koki.apns.jeton'),'ab'.repeat(32));assert.equal(N.notificationsActives(),true);
 const retires=[];await N.desactiverNotifications(async t=>{retires.push(t);});
 assert.deepEqual(retires,['ab'.repeat(32)]);assert.equal(N.notificationsActives(),false);assert.ok(P.appels.includes('unregister'));
});
test('refus, erreur d’inscription ou échec du serveur : rien n’est gardé sur le téléphone',async()=>{
 let {N,stock}=charger(fauxPlugin({permission:'denied'}));
 await assert.rejects(N.activerNotifications(async()=>{}),/Réglages › Koki Connect › Notifications/);assert.equal(stock.size,0);
 ({N,stock}=charger(fauxPlugin({echec:true})));await assert.rejects(N.activerNotifications(async()=>{}),/Inscription aux notifications impossible/);assert.equal(stock.size,0);
 ({N,stock}=charger(fauxPlugin()));await assert.rejects(N.activerNotifications(async()=>{throw Error('serveur');}),/serveur/);assert.equal(stock.size,0);
});
test('hors iPhone ou sans extension : aucune fonction de notification native',async()=>{
 let {N}=charger(fauxPlugin(),'web');assert.equal(N.notificationsDisponibles(),false);assert.equal(await N.activerNotifications(async()=>{}),false);
 ({N}=charger(null));assert.equal(N.notificationsDisponibles(),false);
 delete globalThis.Capacitor;delete globalThis.localStorage;
});
test('Profil et déconnexion : boutons iPhone, jeton retiré du compte à la désactivation',()=>{
 const s=fs.readFileSync('assets/business/notifications.mjs','utf8');
 assert.ok(s.includes("db.rpc('koki_apns_register',{p_token:t})"));assert.ok(s.includes("db.rpc('koki_apns_unregister',{p_token:t})"));
 assert.ok(s.indexOf("KokiNatif?.notificationsDisponibles?.()")<s.indexOf("Les notifications de l’application arrivent dans une prochaine version"));
 const i=s.indexOf('export async function disablePush(db){');assert.ok(s.slice(i,i+300).includes('KokiNatif?.estApp?.()'),'la déconnexion retire aussi le jeton iPhone');
});
test('iOS : extension déclarée, AppDelegate complété une seule fois, script SQL gardé et sans accès direct',async()=>{
 const pkg=JSON.parse(fs.readFileSync('mobile/package.json','utf8'));assert.ok(pkg.dependencies['@capacitor/push-notifications']);
 assert.deepEqual(JSON.parse(fs.readFileSync('mobile/capacitor.config.json','utf8')).plugins.PushNotifications.presentationOptions,['badge','sound','alert']);
 const {completerAppDelegate}=await import('../mobile/scripts/configurer-ios.mjs');
 const t='import UIKit\n@UIApplicationMain\nclass AppDelegate: UIResponder, UIApplicationDelegate {\n    var window: UIWindow?\n}\n';const r=completerAppDelegate(t);
 assert.ok(r.includes('.capacitorDidRegisterForRemoteNotifications'));assert.equal(completerAppDelegate(r),r);
 const sql=fs.readFileSync('database/notifications-iphone.sql','utf8');
 for(const x of ["'4fdd5d443a35e18ce5e9f6a436697be7'","revoke all on public.koki_apns_devices from public, anon, authenticated;","on delete cascade",
  "revoke all on function public.koki_apns_register(text) from public, anon;","'apns:'||d.id::text","check (token ~ '^[0-9a-f]{64,200}$')"])assert.ok(sql.includes(x),x);
 const plist=fs.readFileSync('mobile/ios-modeles/PrivacyInfo.xcprivacy','utf8');assert.ok(plist.includes('NSPrivacyCollectedDataTypePurchaseHistory'));assert.ok(plist.includes('NSPrivacyCollectedDataTypePurposeAnalytics'));
});
