'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('configuration : une seule adresse Supabase, identique dans le fichier de configuration et la politique de sécurité',()=>{
 const cfg=JSON.parse(fs.readFileSync('assets/portail/backend.json','utf8'));assert.equal(cfg.url,'https://qsbmzzbiztfqysstepxm.supabase.co');assert.match(cfg.publishableKey,/^sb_publishable_/);
 const csp=JSON.parse(fs.readFileSync('vercel.json','utf8')).headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
 assert.ok(csp.includes("connect-src 'self' "+cfg.url+' wss://qsbmzzbiztfqysstepxm.supabase.co'));
});
test('connexion coupée pendant /auth/v1/user : reconnue comme passagère, jamais comme une déconnexion',async()=>{
 const {transitoire}=await import('../assets/business/client.mjs');
 for(const e of [{name:'AuthRetryableFetchError',message:'Failed to fetch',status:0},new TypeError('Failed to fetch'),new TypeError('Load failed'),{status:503},{status:429}])assert.equal(transitoire(e),true);
 for(const e of [{name:'AuthApiError',status:401,message:'invalid JWT'},{name:'AuthSessionMissingError',status:400,message:'Auth session missing!'},null])assert.equal(transitoire(e),false);
});
test('j’aime, commentaires et notifications : message réseau au lieu de « Connectez-vous »',()=>{
 const rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
 assert.ok(rt.indexOf("if(error&&transitoire(error)){const e=Error(MESSAGE_HORS_LIGNE);e.code='RESEAU';throw e;}")<rt.indexOf("Connectez-vous pour aimer ou commenter."));
 assert.ok(rt.includes("if(error&&transitoire(error)){const e=Error(MESSAGE_HORS_LIGNE);e.code='RESEAU';throw e;}"));
 const nt=fs.readFileSync('assets/business/notifications.mjs','utf8');
 assert.ok(nt.indexOf('Connexion internet indisponible. Vérifiez votre connexion puis réessayez.')<nt.indexOf('Connectez-vous dans Profil pour consulter'));
});
