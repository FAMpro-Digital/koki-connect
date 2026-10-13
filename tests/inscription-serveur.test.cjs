// Non-régression : échec d'inscription expliqué selon le code Supabase Auth (cause constatée en production :
// 422 signup_disabled « Signups not allowed for this instance »), lien de confirmation vers la page publique.
const test=require('node:test'),assert=require('node:assert/strict');
const charger=()=>import('../assets/business/client.mjs');
function db(reponse){const appels=[];return {appels,supabaseUrl:'https://test.supabase.co',auth:{signUp:async x=>{appels.push(x);return reponse;}}};}
test('inscription refusée par le serveur (signup_disabled) : message clair, plus de message générique',async()=>{
 globalThis.location={origin:'https://koki-connect.vercel.app',pathname:'/'};
 const {createBusinessClient}=await charger();const d=db({error:{status:422,code:'signup_disabled',message:'Signups not allowed for this instance'}});
 await assert.rejects(createBusinessClient(d,{enabled:true}).signup('awa@exemple.sn','motdepasse-solide'),/inscriptions ne sont pas encore ouvertes/);
});
test('codes Supabase Auth traduits sans détail technique',async()=>{
 const {messageInscription}=await charger();
 for(const [e,attendu] of [[{code:'over_email_send_rate_limit',status:429},/Patientez/],[{status:429},/Patientez/],[{code:'weak_password'},/trop faible/],[{code:'user_already_exists'},/existe déjà/],[{code:'email_address_invalid'},/vérifiez-la/],[{code:'email_address_not_authorized'},/ne peut pas être envoyé/],[{code:'inconnu'},/Inscription impossible/],[null,/Inscription impossible/]]){const m=messageInscription(e);assert.match(m,attendu);assert.doesNotMatch(m,/instance|Signups|422|supabase/i);}
});
test('inscription réussie : e-mail nettoyé et lien de confirmation vers la page publique',async()=>{
 globalThis.location={origin:'https://koki-connect.vercel.app',pathname:'/'};
 const {createBusinessClient}=await charger();const d=db({data:{user:{id:'u'}},error:null});
 await createBusinessClient(d,{enabled:true}).signup('  awa@exemple.sn ','motdepasse-solide');
 assert.deepEqual(d.appels,[{email:'awa@exemple.sn',password:'motdepasse-solide',options:{emailRedirectTo:'https://koki-connect.vercel.app/'}}]);
 globalThis.location={origin:'http://exemple.test',pathname:'/'};const d2=db({error:null});await createBusinessClient(d2,{enabled:true}).signup('a@b.sn','motdepasse-solide');
 assert.deepEqual(d2.appels[0].options,{},'aucune redirection non chiffrée hors poste local');
});
