// Compte client : la session enregistrée sur le téléphone reste valable sans connexion (aucune déconnexion).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const client=()=>import('../assets/business/client.mjs');
const hors=async()=>({data:{user:null},error:{name:'AuthRetryableFetchError',message:'Failed to fetch'}});
const db=getUser=>({supabaseUrl:'https://test.supabase.co',auth:{getUser,signOut:async()=>({})},rpc:async()=>({data:{}})});
test('sans réseau : le client enregistré reste connecté',async()=>{
 const {createBusinessClient}=await client();
 const api=createBusinessClient(db(hors),{enabled:true,sessionLocale:()=>({id:'TEST-client',email:'test@example.invalid'})});
 const u=await api.identity();assert.equal(u.id,'TEST-client');assert.equal(api.user.id,'TEST-client');
});
test('sans réseau et sans session enregistrée : message hors connexion, pas de faux compte',async()=>{
 const {createBusinessClient}=await client();
 for(const l of [()=>null,()=>({id:'x',is_anonymous:true}),()=>{throw Error('x');}]){
  const api=createBusinessClient(db(hors),{enabled:true,sessionLocale:l});
  await assert.rejects(api.identity(),e=>e.horsLigne===true);
 }
});
test('en ligne : un compte refusé par le serveur reste déconnecté',async()=>{
 const {createBusinessClient}=await client();
 const api=createBusinessClient(db(async()=>({data:{user:null},error:{message:'Auth session missing!'}})),{enabled:true,sessionLocale:()=>({id:'TEST-client'})});
 await assert.rejects(api.identity(),/Connectez-vous/);
});
test('la configuration publique est gardée pour l\'ouverture hors connexion',()=>{
 const rt=fs.readFileSync(__dirname+'/../assets/business/runtime.mjs','utf8');
 assert.ok(/lireConfig\('assets\/portail\/backend\.json'/.test(rt)&&/sessionLocale:sessionEnregistree/.test(rt)&&/koki-public-auth/.test(rt));
 assert.ok(rt.indexOf('backendAutorise(c,')>rt.indexOf('lireConfig('),'la copie reste vérifiée par backendAutorise');
});
