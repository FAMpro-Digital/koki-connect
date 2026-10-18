const test=require('node:test'),assert=require('node:assert/strict');
test('visiteur, session expirée et compte anonyme : aucun service autorisé',async()=>{
 const {requireClientAccount}=await import('../assets/business/client-access.mjs');
 for(const api of [{},{identity:async()=>null},{identity:async()=>({id:'guest',is_anonymous:true})},{identity:async()=>{throw Error('expired');}}]){
  let asked=0,executed=0;await assert.rejects(async()=>{await requireClientAccount(api,()=>asked++);executed++;},/compte client est obligatoire/);
  assert.equal(asked,1);assert.equal(executed,0);
 }
});
test('compte permanent autorisé, vérification renouvelée après déconnexion',async()=>{
 const {requireClientAccount}=await import('../assets/business/client-access.mjs');let user={id:'client'},calls=0;
 const api={identity:async()=>{calls++;return user;}};
 assert.equal((await requireClientAccount(api)).id,'client');user=null;
 await assert.rejects(requireClientAccount(api),/compte client/);assert.equal(calls,2);
});
test('coupure réseau : ne pas présenter une fausse déconnexion',async()=>{
 const {requireClientAccount}=await import('../assets/business/client-access.mjs');const e=Object.assign(Error('Hors ligne'),{horsLigne:true});
 await assert.rejects(requireClientAccount({identity:async()=>{throw e;}},()=>assert.fail('pas de redirection')),/Hors ligne/);
});
