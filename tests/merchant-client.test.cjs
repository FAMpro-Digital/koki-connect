const test=require('node:test'),assert=require('node:assert/strict');
test('fiche commerçant : RPC sécurisée, reprise avec la même clé et refus sans activation',async()=>{
 const {createBusinessClient}=await import('../assets/business/client.mjs');const calls=[],cache=new Map();let interrupted=true;
 const db={auth:{getUser:async()=>({data:{user:{id:'TEST-merchant'}}})},rpc:async(name,args)=>{calls.push({name,...structuredClone(args)});if(interrupted){interrupted=false;throw Error('TEST réseau interrompu');}return {data:{id:'TEST-profile',statut:'En attente',payload:{nom:args.input.name}}};}};
 const options={enabled:true,storage:{getItem:key=>cache.get(key),setItem:(key,value)=>cache.set(key,value)},uuid:()=> 'TEST-same-request'};
 const api=createBusinessClient(db,options),input={name:'TEST Commerce',profile:'Commerçant',category:'Couture',phone:'+221770000000',address:'TEST Koki',location:{latitude:15.5,longitude:-16},hours:'Lundi 8h–18h',description:'TEST description du commerce',photos:[]};
 await assert.rejects(api.run('submit_merchant',input,'merchant:new'),/réseau/);assert.equal(api.pending().length,1);
 const reopened=createBusinessClient(db,options);await reopened.identity();const saved=await reopened.retry('merchant:new');assert.equal(saved.statut,'En attente');assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].name,'koki_business');assert.equal(calls[0].input.statut,undefined);assert.equal(calls[0].input.owner_id,undefined);assert.equal(reopened.pending().length,0);
 await assert.rejects(createBusinessClient(db).run('submit_merchant',input),/préparation/);assert.equal(calls.length,2);
});
