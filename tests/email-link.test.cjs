const test=require('node:test'),assert=require('node:assert/strict');
async function client(error=null){
 globalThis.location={origin:'https://koki-connect.vercel.app',pathname:'/',href:'https://koki-connect.vercel.app/'};
 const calls=[];let authCallback;
 const {createBusinessClient}=await import('../assets/business/client.mjs');
 const api=createBusinessClient({auth:{onAuthStateChange:cb=>{authCallback=cb;},signInWithOtp:async args=>{calls.push(args);return {error};}}},{enabled:true});
 return {api,calls,event:e=>authCallback(e)};
}
test('nouveau et ancien client : lien e-mail sans mot de passe, retour conservé, aucune session avant confirmation',async()=>{
 const {api,calls}=await client();
 await api.sendEmailLink('  awa@exemple.sn ',{retour:'https://koki-connect.vercel.app/?koki-pro=commercant#ancien'});
 assert.deepEqual(calls,[{email:'awa@exemple.sn',options:{shouldCreateUser:true,emailRedirectTo:'https://koki-connect.vercel.app/?koki-pro=commercant'}}]);
 assert.equal(api.user,null);
});
test('email invalide et redirection externe refusés avant tout envoi',async()=>{
 const {api,calls}=await client();
 await assert.rejects(api.sendEmailLink('invalide'),/adresse e-mail/);
 await assert.rejects(api.sendEmailLink('a@b.sn',{retour:'https://autre.example/'}),/retour invalide/);
 assert.equal(calls.length,0);
});
test('limitation, coupure réseau et refus serveur expliqués sans détails sensibles',async()=>{
 for(const [error,message] of [[{status:429},/Patientez/],[{message:'Failed to fetch'},/internet indisponible/],[{message:'internal secret'},/Impossible d’envoyer/]]){
  const {api}=await client(error);await assert.rejects(api.sendEmailLink('a@b.sn'),message);
 }
});
test('notification de connexion différée hors du callback Auth',async()=>{
 const {api,event}=await client();const events=[];api.subscribe(e=>events.push(e));
 event('SIGNED_IN');assert.deepEqual(events,[]);
 await new Promise(r=>setTimeout(r,10));assert.deepEqual(events,[{state:'signed-in'}]);
});
