// Parcours d'inscription professionnelle : type choisi conservé (appareil + lien de confirmation), retour du lien,
// lien expiré, brouillons, statut « En attente de validation ».
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const I=()=>import('../assets/business/intention.mjs');
const memoire=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
test('type d’activité : trois catégories, conservé 30 jours, effacé après usage',async()=>{
 const P=await I(),s=memoire();assert.deepEqual(Object.keys(P.TYPES),['commercant','prestataire','chauffeur']);
 assert.equal(P.TYPES.chauffeur.module,'transport');assert.equal(P.TYPES.prestataire.profil,'Prestataire de services');
 assert.equal(P.lire(s),null);P.enregistrer(s,'chauffeur',1000);assert.equal(P.lire(s,1000+29*86400000),'chauffeur');assert.equal(P.lire(s,1000+31*86400000),null,'expiré');
 assert.throws(()=>P.enregistrer(s,'pirate'));s.setItem('koki.intention.pro.v1','{mal formé');assert.equal(P.lire(s),null);P.effacer(s);assert.equal(s.m.size,0);
});
test('lien de confirmation : type porté par l’adresse, fragments et autres paramètres retirés',async()=>{
 const P=await I();
 assert.equal(P.urlRetour('https://koki-connect.vercel.app/?koki-recovery=1#x','commercant'),'https://koki-connect.vercel.app/?koki-pro=commercant');
 assert.equal(P.urlRetour('https://koki-connect.vercel.app/',null),'https://koki-connect.vercel.app/');
 assert.equal(P.depuisURL('https://koki-connect.vercel.app/?koki-pro=prestataire#access_token=a'),'prestataire');assert.equal(P.depuisURL('https://x/?koki-pro=admin'),null);
 assert.equal(P.sansParametre('https://koki-connect.vercel.app/?koki-pro=chauffeur&a=1#access_token=t'),'/?a=1#access_token=t','jetons laissés à Supabase');
});
test('retour du lien : session, lien expiré ou déjà utilisé, message en français',async()=>{
 const P=await I();
 assert.deepEqual(P.retourAuth('https://k/?koki-pro=commercant#access_token=t&type=signup'),{session:true,type:'signup',erreur:null});
 const r=P.retourAuth('https://k/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
 assert.equal(r.session,false);assert.equal(r.erreur.code,'otp_expired');assert.match(P.messageLien(r.erreur),/expiré ou a déjà été utilisé/);
 assert.match(P.messageLien({code:'access_denied'}),/nouvel e-mail de confirmation/);assert.equal(P.messageLien(null),'');
 assert.deepEqual(P.retourAuth('pas une adresse'),{session:false,type:null,erreur:null});
});
test('brouillons : un par compte et par formulaire, sur l’appareil, effaçables',async()=>{
 const P=await I(),s=memoire();
 assert.equal(P.ecrireBrouillon(s,null,'fiche',{name:'x'}),false,'jamais sans compte');
 P.ecrireBrouillon(s,'u1','fiche',{name:'Épicerie Awa',category:'Alimentation'},2,1000);
 assert.deepEqual(P.lireBrouillon(s,'u1','fiche',2000).valeurs,{name:'Épicerie Awa',category:'Alimentation'});assert.equal(P.lireBrouillon(s,'u1','fiche',2000).etape,2);
 assert.equal(P.lireBrouillon(s,'u2','fiche',2000),null,'autre compte : rien');assert.equal(P.lireBrouillon(s,'u1','chauffeur',2000),null);
 P.effacerBrouillon(s,'u1','fiche');assert.equal(P.lireBrouillon(s,'u1','fiche'),null);
});
test('câblage : profil, inscription, retour du lien, renvoi, brouillons, statut',()=>{
 const rt=fs.readFileSync('assets/business/runtime.mjs','utf8'),ui=fs.readFileSync('assets/business/ui.mjs','utf8'),pro=fs.readFileSync('assets/business/pro-space.mjs','utf8'),portail=fs.readFileSync('assets/portail/app.js','utf8'),cl=fs.readFileSync('assets/business/client.mjs','utf8');
 assert.match(rt,/pro-choix-carte/);assert.match(rt,/window\.KokiPro\.choisir\(type\)/);assert.match(portail,/await P\.monter\(zone\)/);
 assert.match(rt,/window\.history\.replaceState/,'« history » est aussi le nom d’une fonction importée : toujours window.history');assert.doesNotMatch(rt,/[^.]history\.replaceState/);
 assert.match(rt,/function retourDeLien/);assert.match(rt,/window\.KokiPortail\.profil\(\)/,'sans type : les trois catégories');
 assert.match(ui,/vue==='renvoi'/);assert.match(cl,/db\.auth\.resend\(\{type:'signup'/);assert.match(cl,/emailRedirectTo=to/);
 assert.match(pro,/'En attente de validation'/);assert.match(pro,/Enregistrer le brouillon/);assert.match(pro,/Reprendre ma fiche \(brouillon\)/);
 assert.match(pro,/\}\);nav\.append\(send\);\}\n {3}if\(!edit&&brouillon\)/,'le brouillon ne remplace jamais le bouton d’envoi');
});
test('chauffeur refusé : statut « Inscription refusée » et motif de l’administration affichés',()=>{
 const ui=fs.readFileSync('assets/business/ui.mjs','utf8');
 assert.match(ui,/profile\.payload\.moderation\?\.decision==='reject'/);assert.match(ui,/'Inscription refusée'/);
 assert.match(ui,/' Motif indiqué : '\+profile\.payload\.moderation\.note/);
});
test('Profil : compte et fiches professionnelles regroupés ; rubriques réservées aux clients',()=>{
 const rt=fs.readFileSync('assets/business/runtime.mjs','utf8'),portail=fs.readFileSync('assets/portail/app.js','utf8'),app=fs.readFileSync('assets/commerce/app.js','utf8');
 const corps=nom=>{const i=rt.indexOf('async function '+nom+'(');assert.ok(i>=0,nom);const fins=['\nasync function','\nwindow.','\n//'].map(x=>rt.indexOf(x,i+1)).filter(x=>x>0);return rt.slice(i,Math.min(...fins));};
 // Rubriques : plus aucun formulaire professionnel, seulement un lien vers Profil ; le suivi reste sur place.
 for(const nom of ['commerce','transport']){const c=corps(nom);assert.doesNotMatch(c,/proSpace\(|professional\(/,nom+' : pas de fiche professionnelle dans la rubrique');assert.match(c,/lienProfil\(/,nom+' : lien vers Profil');assert.match(c,/history\(/,nom+' : suivi conservé dans la rubrique');}
 // Connexion sur place dans les rubriques (panneau repliable), ouverte avant une commande ou une demande.
 assert.match(rt,/const status=connexionSurPlace\(account,module,/);assert.match(rt,/d\.id='connexion-'\+module/);
 assert.match(rt,/async function requestService\(p,area\)\{try\{await api\.identity\(\);\}catch\{ouvrirConnexion\('commerce'\)/);
 // Profil : « Mon compte » puis « Mon espace professionnel » (fiche commerce/services et inscription chauffeur).
 const ep=rt.slice(rt.indexOf('async function espacePro('),rt.indexOf('async function espaceProfil('));
 assert.match(ep,/proSpace\(s,api,status,\{upload,imageSelection,\.\.\.parcoursPro\('commerce'\)\}\)/);
 assert.match(ep,/professional\(s,api,'transport',status,\{upload,\.\.\.parcoursPro\('transport'\)\}\)/);
 assert.match(rt,/compte\.id='profil-compte'/);assert.match(rt,/pro\.id='profil-pro'/);assert.match(rt,/monter:espaceProfil/);
 // Choix d'activité et retour du lien de confirmation : toujours vers Profil.
 assert.match(rt,/async function ouvrirEspace\(\)\{\n await versProfil\(\);/);
 assert.match(app,/valeur==='pro'&&defiler\)\{window\.KokiPortail\?\.profil\(\);return;\}/);
 assert.doesNotMatch(portail,/pro-choix-grille/,'le choix d’activité vient de l’espace connecté');
});
