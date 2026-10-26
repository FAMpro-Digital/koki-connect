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
 for(const [e,attendu] of [[{code:'over_email_send_rate_limit',status:429},/Patientez/],[{status:429},/Patientez/],[{code:'weak_password'},/Mot de passe refusé/],[{code:'user_already_exists'},/existe déjà/],[{code:'email_address_invalid'},/vérifiez-la/],[{code:'email_address_not_authorized'},/ne peut pas être envoyé/],[{code:'inconnu'},/Inscription impossible/],[null,/Inscription impossible/]]){const m=messageInscription(e);assert.match(m,attendu);assert.doesNotMatch(m,/instance|Signups|422|supabase/i);}
});
test('inscription réussie : e-mail nettoyé et lien de confirmation vers la page publique',async()=>{
 globalThis.location={origin:'https://koki-connect.vercel.app',pathname:'/'};
 const {createBusinessClient}=await charger();const d=db({data:{user:{id:'u'}},error:null});
 await createBusinessClient(d,{enabled:true}).signup('  awa@exemple.sn ','motdepasse-solide');
 assert.deepEqual(d.appels,[{email:'awa@exemple.sn',password:'motdepasse-solide',options:{emailRedirectTo:'https://koki-connect.vercel.app/'}}]);
 globalThis.location={origin:'http://exemple.test',pathname:'/'};const d2=db({error:null});await createBusinessClient(d2,{enabled:true}).signup('a@b.sn','motdepasse-solide');
 assert.deepEqual(d2.appels[0].options,{},'aucune redirection non chiffrée hors poste local');
});

test('professionnel : mot de passe minimum et marqueur de parcours sans rôle',async()=>{
 globalThis.location={origin:'https://koki-connect.vercel.app',pathname:'/'};
 const {createBusinessClient}=await charger();const d=db({error:null});const api=createBusinessClient(d,{enabled:true});
 await assert.rejects(api.signup('pro@exemple.sn','1234567',{professional:true}),/8 caractères/);assert.equal(d.appels.length,0);
 await api.signup('pro@exemple.sn','Abcd1234',{professional:true});
 assert.equal(d.appels[0].password,'Abcd1234');
 await api.signup('pro@exemple.sn','motdepasse-solide',{professional:true});
 assert.equal(d.appels[1].password,'motdepasse-solide');
 assert.deepEqual(d.appels[0].options.data,{professional_password_set:true});
});
test('client devenant professionnel : mot de passe enregistré et identité actualisée',async()=>{
 const {createBusinessClient}=await charger();let user={id:'u',user_metadata:{}},saved;
 const api=createBusinessClient({auth:{getUser:async()=>({data:{user}}),updateUser:async x=>{saved=x;user={...user,user_metadata:x.data};return {error:null};}}},{enabled:true});
 await assert.rejects(api.setProfessionalPassword('court'),/8 caractères/);
 await api.setProfessionalPassword('Abcd1234');
 assert.equal(saved.password,'Abcd1234');assert.equal(api.user.user_metadata.professional_password_set,true);
});
test('fiche initiale : coordonnées conservées, aucun droit ni mot de passe dans les métadonnées',async()=>{const {createBusinessClient}=await charger();const d=db({error:null});const api=createBusinessClient(d,{enabled:true});await api.signup('pro@exemple.sn','Abcd1234',{professional:true,registration:{type:'Chauffeur',name:'TEST Chauffeur',phone:'771234567',category:'Taxi',address:'Koki centre',description:'Transport local',role:'superadmin',password:'NE_PAS_COPIER'}});const draft=d.appels[0].options.data.professional_registration;assert.equal(draft.phone,'+221771234567');assert.equal(draft.name,'TEST Chauffeur');assert.equal(draft.role,undefined);assert.equal(draft.password,undefined);});

test('8 caractères libres : lettres seules, chiffres seuls et symboles seuls acceptés',async()=>{const {createBusinessClient}=await charger();for(const password of ['abcdefgh','12345678','!!!!!!!!']){const d=db({error:null});await createBusinessClient(d,{enabled:true}).signup('pro@exemple.sn',password,{professional:true});assert.equal(d.appels[0].password,password);}});
