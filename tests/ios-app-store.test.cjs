'use strict';
// Application iOS (Capacitor) : détection de l'appli, préparation des fichiers embarqués, configuration Apple.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const SRC=fs.readFileSync('assets/portail/natif.js','utf8');
function natif(capacitor,location={protocol:'https:',host:'www.kokiconnect.com',origin:'https://www.kokiconnect.com'}){
 const classes=new Set();const ctx={location,document:{documentElement:{classList:{add:(...c)=>c.forEach(x=>classes.add(x))}}},FileReader:class{readAsDataURL(b){this.result='data:application/pdf;base64,QUJD';this.onload();}}};
 if(capacitor)ctx.Capacitor=capacitor;vm.runInNewContext(SRC,ctx);return {N:ctx.KokiNatif,classes};}
const ios=(plugins={})=>({isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:plugins});

test('site web : aucune différence (pas d’appli, adresse de la page conservée)',()=>{
 const {N,classes}=natif(null,{protocol:'https:',host:'koki-connect.vercel.app',origin:'https://koki-connect.vercel.app'});
 assert.equal(N.estApp(),false);assert.equal(N.estIOS(),false);assert.equal(N.plateforme(),'web');assert.equal(N.siteUrl(),'https://koki-connect.vercel.app');assert.equal(classes.size,0);
});
test('application iOS : détectée, liens partagés vers www.kokiconnect.com, classe CSS posée',()=>{
 const {N,classes}=natif(ios(),{protocol:'capacitor:',host:'localhost',origin:'capacitor://localhost'});
 assert.equal(N.estApp(),true);assert.equal(N.estIOS(),true);assert.equal(N.siteUrl(),'https://www.kokiconnect.com');assert.ok(classes.has('koki-app')&&classes.has('koki-app-ios'));
});
test('PDF dans l’appli : écrit dans le cache puis ouvert dans la visionneuse ; sinon lecteur web conservé',async()=>{
 const appels=[];const plugins={Filesystem:{writeFile:async o=>{appels.push(['write',o]);return {uri:'file:///cache/livres/'+o.path.split('/')[1]};}},FileOpener:{openFile:async o=>{appels.push(['open',o]);}}};
 const {N}=natif(ios(plugins));const blob={type:'application/pdf'};
 assert.equal(await N.ouvrirFichier(blob,'L’Autoroute du millionnaire.pdf'),true);
 assert.deepEqual(JSON.parse(JSON.stringify(appels)),[['write',{path:'livres/L-Autoroute-du-millionnaire.pdf',data:'QUJD',directory:'CACHE',recursive:true}],['open',{path:'file:///cache/livres/L-Autoroute-du-millionnaire.pdf',mimeType:'application/pdf'}]]);
 assert.equal(await natif(ios({})).N.ouvrirFichier(blob,'x.pdf'),false,'extensions absentes');
 assert.equal(await natif(null).N.ouvrirFichier(blob,'x.pdf'),false,'site web');
});
test('code du site : Google masqué sur iOS, partage, PDF et notifications adaptés à l’appli',async()=>{
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.indexOf('assets/portail/natif.js')>0&&html.indexOf('assets/portail/natif.js')<html.indexOf('assets/business/runtime.mjs'));
 const ui=fs.readFileSync('assets/business/ui.mjs','utf8');const i=ui.indexOf("if(globalThis.KokiNatif?.estIOS?.())box.append(");
 assert.ok(i>0);const branche=ui.slice(i,ui.indexOf('else{',i));assert.ok(!/Google/.test(branche),'aucune mention de Google sur iPhone');
 assert.ok(ui.indexOf("const google=action(box,'Continuer avec Google'")>ui.indexOf('else{',i),'bouton Google seulement hors iPhone');
 assert.ok(fs.readFileSync('assets/portail/bibliotheque.js','utf8').includes("KokiNatif.ouvrirFichier(f.blob,nomFichier)"));
 assert.ok(fs.readFileSync('assets/business/catalogue-extras.mjs','utf8').includes("globalThis.KokiNatif?.estApp?.()?globalThis.KokiNatif.SITE+'/'"));
 const {promptMode}=await import('../assets/business/notification-prompt.mjs');
 const pret={enabled:true,permission:'default',subscribed:false,supported:true,signedIn:true};
 assert.equal(promptMode(pret),'activate');assert.equal(promptMode({...pret,natif:true}),'hidden');assert.equal(promptMode({...pret,ios:true,natif:true}),'hidden','pas d’invitation « écran d’accueil » dans l’appli');
});
test('fichiers embarqués : seulement l’application, avec une CSP équivalente à celle du site',async()=>{
 const B=await import('../mobile/scripts/build-www.mjs');const sortie=fs.mkdtempSync(path.join(os.tmpdir(),'koki-www-'));
 try{
  B.construire(sortie);
  for(const f of ['index.html','assets/portail/natif.js','assets/business/vendor/supabase-2.117.3.js','confidentialite.html','suppression-compte.html'])assert.ok(fs.existsSync(path.join(sortie,f)),f);
  for(const f of ['tests','docs','api','collecte','database','scripts','mobile','vercel.json','package.json','.well-known'])assert.ok(!fs.existsSync(path.join(sortie,f)),f+' ne doit pas être embarqué');
  const index=fs.readFileSync(path.join(sortie,'index.html'),'utf8');const csp=index.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(csp,'CSP présente');assert.match(csp[1],/connect-src 'self' https:\/\/qsbmzzbiztfqysstepxm\.supabase\.co/);assert.doesNotMatch(csp[1],/frame-ancestors/);
  assert.equal(B.preparerIndex(index,'x'),index,'pas de doublon');
 }finally{fs.rmSync(sortie,{recursive:true,force:true});}
 assert.ok(!fs.readFileSync('index.html','utf8').includes('http-equiv="Content-Security-Policy"'),'le site garde ses en-têtes Vercel');
});
test('configuration Apple : identifiant, autorisations en français, confidentialité, jamais déployé sur Vercel',async()=>{
 const cfg=JSON.parse(fs.readFileSync('mobile/capacitor.config.json','utf8'));assert.equal(cfg.appId,'com.kokiconnect.app');assert.equal(cfg.webDir,'www');
 const {completerPlist,CLES}=await import('../mobile/scripts/configurer-ios.mjs');
 const plist='<?xml version="1.0"?>\n<plist version="1.0">\n<dict>\n\t<key>CFBundleDisplayName</key>\n\t<string>App</string>\n</dict>\n</plist>\n';
 const une=completerPlist(plist);assert.equal(completerPlist(une),une,'relançable sans doublon');
 assert.match(une,/<key>NSLocationWhenInUseUsageDescription<\/key>\n\t<string>Koki Connect utilise votre position/);assert.match(une,/<key>ITSAppUsesNonExemptEncryption<\/key>\n\t<false\/>/);
 assert.match(une,/<key>CFBundleDisplayName<\/key>\n\t<string>App<\/string>/,'clé existante conservée');assert.ok(!/NSLocationAlways/.test(une),'pas de position en arrière-plan');
 assert.ok(CLES.some(([k])=>k==='NSCameraUsageDescription')&&CLES.some(([k])=>k==='NSPhotoLibraryUsageDescription'));
 const privacy=fs.readFileSync('mobile/ios-modeles/PrivacyInfo.xcprivacy','utf8');assert.match(privacy,/<key>NSPrivacyTracking<\/key>\n\t<false\/>/);assert.ok(privacy.includes('NSPrivacyCollectedDataTypePreciseLocation'));
 assert.match(fs.readFileSync('.vercelignore','utf8'),/^mobile\/$/m);
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));assert.ok(!JSON.stringify(pkg).includes('@capacitor'),'le site garde ses dépendances');
 for(const f of ['mobile/resources/icon.png','mobile/resources/splash.png'])assert.ok(fs.statSync(f).size>10000,f);
});
test('liens kokiconnect:// : seules les rubriques connues sont ouvertes', () => {
 delete require.cache[require.resolve('../assets/portail/natif.js')];
 const N = require('../assets/portail/natif.js');
 assert.equal(N.ecranDuLien('kokiconnect://ecran/boutique'), 'boutique');
 assert.equal(N.ecranDuLien('kokiconnect://ecran/profil/'), 'profil');
 for (const x of ['kokiconnect://ecran/admin', 'https://ecran/boutique', 'kokiconnect://ecran/boutique?x=1', '', null]) assert.equal(N.ecranDuLien(x), null, String(x));
});
test('captures App Store : rubrique ouverte au lancement, simulateur seulement, ajout unique',async()=>{
 const {ajouterCaptures,completerAppDelegate}=await import('../mobile/scripts/configurer-ios.mjs');
 const t='import UIKit\nimport Capacitor\n@UIApplicationMain\nclass AppDelegate: UIResponder, UIApplicationDelegate {\n    var window: UIWindow?\n    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {\n        return true\n    }\n}\n';
 const r=ajouterCaptures(completerAppDelegate(t));
 assert.ok(r.includes('#if targetEnvironment(simulator)'));assert.ok(r.indexOf('kokiEcran')<r.indexOf('return true'));assert.equal(ajouterCaptures(r),r);
 const wf=fs.readFileSync('.github/workflows/ios.yml','utf8');assert.ok(wf.includes('-kokiEcran "$ECRAN"'));assert.ok(!wf.includes('simctl openurl'));
});
test('position iPhone : extension native (une seule demande), erreurs traduites, rien sur le site',async()=>{
 delete require.cache[require.resolve('../assets/portail/natif.js')];
 const geo={getCurrentPosition(){throw Error('WebKit ne doit pas être appelé');}};
 const nav=d=>Object.defineProperty(globalThis,'navigator',{value:d,configurable:true,writable:true});const avant=Object.getOwnPropertyDescriptor(globalThis,'navigator');nav({geolocation:geo});
 globalThis.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{Geolocation:{getCurrentPosition:async o=>{assert.equal(o.enableHighAccuracy,true);return {coords:{latitude:15.5,longitude:-15.99,accuracy:8},timestamp:1};}}}};
 const N=require('../assets/portail/natif.js');
 const p=await new Promise((ok,ko)=>geo.getCurrentPosition(ok,ko,{enableHighAccuracy:true}));
 assert.equal(p.coords.latitude,15.5);
 assert.equal(N.codeErreurPosition(Error('Location permission was denied')),1);assert.equal(N.codeErreurPosition(Error('Timeout expired')),3);
 globalThis.Capacitor={isNativePlatform:()=>false,getPlatform:()=>'web',Plugins:{}};nav({geolocation:{getCurrentPosition(){}}});
 assert.equal(N.positionNative(),false);
 delete globalThis.Capacitor;if(avant)Object.defineProperty(globalThis,'navigator',avant);else delete globalThis.navigator;
 assert.ok(JSON.parse(fs.readFileSync('mobile/package.json','utf8')).dependencies['@capacitor/geolocation']);
});
test('plein écran dans l’application seulement : barre du bas au-dessus de la barre d’accueil',async()=>{
 const {pleinEcran}=await import('../mobile/scripts/build-www.mjs');
 const h='<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>';
 const r=pleinEcran(h);assert.ok(r.includes('viewport-fit=cover'));assert.equal(pleinEcran(r),r);
 const site=fs.readFileSync('index.html','utf8');assert.ok(site.includes('calc(18px + env(safe-area-inset-bottom, 0px))'));
 assert.equal(JSON.parse(fs.readFileSync('mobile/capacitor.config.json','utf8')).ios.contentInset,'never');
});
