// Le compte client ne se déconnecte jamais tout seul : seule la déconnexion demandée ferme la session.
const test=require('node:test'),assert=require('node:assert/strict');
const client=()=>import('../assets/business/client.mjs');
function banc(extra={}){let cb;const sets=[];const mem={v:null};
 const db={supabaseUrl:'https://t.supabase.co',auth:{onAuthStateChange:f=>{cb=f;},getUser:async()=>({data:{user:{id:'U'}}}),signOut:async()=>{cb('SIGNED_OUT',null);return {};},setSession:async s=>{sets.push(s);return extra.setSession?extra.setSession():{data:{session:{}},error:null};}}};
 const secours={lire:()=>mem.v,ecrire:v=>{mem.v=v;},effacer:()=>{mem.v=null;}};
 return {db,secours,mem,sets,emit:(e,s)=>cb(e,s)};}
const attendre=()=>new Promise(r=>setTimeout(r,20));
test('session perdue sans demande du client : elle est rétablie',async()=>{
 const {createBusinessClient}=await client(),b=banc();createBusinessClient(b.db,{enabled:true,secours:b.secours});
 b.emit('SIGNED_IN',{access_token:'a',refresh_token:'r'});assert.equal(b.mem.v.refresh_token,'r');
 b.emit('SIGNED_OUT',null);await attendre();assert.equal(b.sets.length,1);assert.equal(b.sets[0].refresh_token,'r');
});
test('déconnexion demandée par le client : aucune restauration, copie effacée',async()=>{
 const {createBusinessClient}=await client(),b=banc();const api=createBusinessClient(b.db,{enabled:true,secours:b.secours,storage:null});
 b.emit('SIGNED_IN',{access_token:'a',refresh_token:'r'});await api.logout();await attendre();
 assert.equal(b.sets.length,0);assert.equal(b.mem.v,null);
});
test('restauration refusée définitivement : pas de boucle, copie effacée ; panne passagère : copie gardée',async()=>{
 const {createBusinessClient}=await client();
 let b=banc({setSession:async()=>({error:{status:400,message:'Invalid Refresh Token'}})});createBusinessClient(b.db,{enabled:true,secours:b.secours});
 b.emit('SIGNED_IN',{access_token:'a',refresh_token:'r'});b.emit('SIGNED_OUT',null);await attendre();assert.equal(b.sets.length,1);assert.equal(b.mem.v,null);
 b=banc({setSession:async()=>({error:{name:'AuthRetryableFetchError',message:'Failed to fetch'}})});createBusinessClient(b.db,{enabled:true,secours:b.secours});
 b.emit('SIGNED_IN',{access_token:'a',refresh_token:'r'});b.emit('SIGNED_OUT',null);await attendre();assert.ok(b.mem.v);
});
test('serveur occupé ou en panne (429, 5xx) : le compte enregistré est gardé',async()=>{
 const {createBusinessClient,transitoire}=await client();
 assert.ok(transitoire({status:503,message:'x'})&&transitoire({status:429,message:'x'})&&transitoire({name:'AuthUnknownError',message:'x'}));
 assert.ok(!transitoire({status:400,message:'Invalid Refresh Token'})&&!transitoire({message:'Auth session missing!'}));
 const db={auth:{getUser:async()=>({data:{user:null},error:{status:503,message:'Service Unavailable'}})}};
 const api=createBusinessClient(db,{enabled:true,sessionLocale:()=>({id:'U',email:'a@b.invalid'})});
 assert.equal((await api.identity()).id,'U');
});
