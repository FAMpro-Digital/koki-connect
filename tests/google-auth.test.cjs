const test=require('node:test'),assert=require('node:assert/strict');
async function setup(error=null){
 globalThis.location={origin:'https://www.kokiconnect.com',pathname:'/',href:'https://www.kokiconnect.com/'};
 const calls=[];
 const {createBusinessClient}=await import('../assets/business/client.mjs');
 const api=createBusinessClient({auth:{signInWithOAuth:async args=>{calls.push(args);return {error};}}},{enabled:true});
 return {api,calls};
}
test('Google requests only identity scopes and returns to the same site without recovery mode',async()=>{
 const {api,calls}=await setup();
 await api.signInGoogle({retour:'https://www.kokiconnect.com/?koki-recovery=1#old'});
 assert.deepEqual(calls,[{provider:'google',options:{redirectTo:'https://www.kokiconnect.com/?koki-google=1',scopes:'openid email profile',queryParams:{prompt:'select_account'}}}]);
 assert.equal(api.user,null);
});
test('Google rejects external redirect before contacting auth',async()=>{
 const {api,calls}=await setup();
 await assert.rejects(api.signInGoogle({retour:'https://other.example/'}),/retour invalide/);
 assert.equal(calls.length,0);
});
test('Google reports network and provider errors without leaking server details',async()=>{
 for(const [error,expected] of [[{message:'Failed to fetch'},/internet indisponible/],[{message:'secret'},/Google indisponible/]]){
  const {api}=await setup(error);await assert.rejects(api.signInGoogle(),expected);
 }
});
