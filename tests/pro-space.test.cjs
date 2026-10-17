const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function fixture({url='https://test.supabase.co',folder='0f0e0d0c-0b0a-4908-8706-050403020100'}={}){
 const calls=[];const db={supabaseUrl:url,auth:{getUser:async()=>({data:{user:{id:'TEST-owner',phone:'221770000000'}}})},
  rpc:async(name,{command,input})=>{calls.push({command,input:structuredClone(input)});if(command==='media_folder')return {data:{folder}};if(command==='localites')return {data:[{nom:'Coki'},{nom:'Ouarak'}]};return {data:{id:'TEST-id',statut:'En attente',payload:{}}};},
  storage:{from:()=>({createSignedUrl:async path=>({data:{signedUrl:url+'/storage/v1/object/sign/koki-media/'+path+'?token=t'}})})}};
 return {db,calls};
}
async function client(options){const {createBusinessClient}=await import('../assets/business/client.mjs');const f=fixture(options);return {...f,api:createBusinessClient(f.db,{enabled:true,uuid:()=>'TEST-request'})};}

test('espace professionnel : commandes sécurisées, identifiants fournis par l’état, jamais saisis',async()=>{
 const {api,calls}=await client();
 await api.saveProfile({name:'TEST',profile:'Commerçant',category:'Alimentation',phone:'+221771234567',village:'Coki',photos:[]});
 assert.deepEqual(calls.at(-1),{command:'save_profile',input:{name:'TEST',profile:'Commerçant',category:'Alimentation',phone:'+221771234567',village:'Coki',photos:[],request_id:'TEST-request'}});
 const row={id:'TEST-row',revision:3,parent_id:'TEST-parent',payload:{}};
 await api.saveProduct({name:'Riz',price:500,stock:2,parent_id:'IGNORÉ'},row);
 assert.equal(calls.at(-1).input.parent_id,'TEST-parent','un produit existant reste dans sa boutique');assert.equal(calls.at(-1).input.revision,3);
 await api.saveShop({name:'Boutique',village:'Coki'});assert.equal(calls.at(-1).input.parent_id,undefined,'la boutique est rattachée par le serveur au compte');
 await api.setAvailability(row,'Épuisé');assert.deepEqual(calls.at(-1).input,{id:'TEST-row',revision:3,status:'Épuisé',request_id:'TEST-request'});
 await api.archive(row);assert.equal(calls.at(-1).command,'archive');
 assert.deepEqual(await api.localites(),['Coki','Ouarak']);assert.equal(calls.at(-1).input.request_id,undefined,'lecture sans clé de requête');
});
test('photos : dossier anonyme fourni par le serveur et mis en cache, réponse invalide refusée',async()=>{
 const {api,calls}=await client();assert.equal(await api.mediaFolder(),'0f0e0d0c-0b0a-4908-8706-050403020100');await api.mediaFolder();
 assert.equal(calls.filter(c=>c.command==='media_folder').length,1);
 const bad=await client({folder:'../TEST-owner'});await assert.rejects(bad.api.mediaFolder(),/Dossier photo/);
 const runtime=fs.readFileSync('assets/business/runtime.mjs','utf8');assert.match(runtime,/const folder=await api\.mediaFolder\(\);/);assert.doesNotMatch(runtime,/const path=user\.id\+'\//,'le chemin des photos ne contient plus l’identifiant du compte');
});
test('images : http accepté seulement pour le Supabase local, https sinon',async()=>{
 const local=await client({url:'http://127.0.0.1:54321'});assert.match(await local.api.image('a/b.jpg'),/^http:\/\/127\.0\.0\.1:54321\/storage\/v1\/object\//);
 const online=await client();assert.match(await online.api.image('a/b.jpg'),/^https:/);
 const mixed=await client({url:'http://exemple.test'});await assert.rejects(mixed.api.image('a/b.jpg'),/Image invalide/);
});
test('numéros : règle sénégalaise du contrat partagé pour la connexion SMS',async()=>{
 const {normalizePhone}=await import('../assets/business/client.mjs');
 assert.equal(normalizePhone('77 123 45 67'),'+221771234567');assert.equal(normalizePhone('33 961 23 45'),'+221339612345');assert.equal(normalizePhone('+999000000001'),'+999000000001');
 assert.throws(()=>normalizePhone('12 34'),/Numéro invalide/);assert.throws(()=>normalizePhone('+221 12 345 67 89'),/Numéro invalide/);
});
test('interface : aucun identifiant technique demandé, statuts expliqués, retour et navigation téléphone',()=>{
 const ui=fs.readFileSync('assets/business/pro-space.mjs','utf8');
 const labels=[...ui.matchAll(/label:'([^']+)'/g)].map(m=>m[1]);assert.ok(labels.length>20);
 for(const l of labels)assert.doesNotMatch(l,/identifiant|\bid\b|uuid|référence technique/i,l);
 assert.match(ui,/history\.pushState/);assert.match(ui,/addEventListener\('popstate'/);assert.match(ui,/'← Retour'/);assert.match(ui,/Retour à ma boutique/);
 assert.match(ui,/C\.explicationStatut/);assert.match(ui,/Étape '\+\(step\+1\)\+' sur '\+total/);
 const C=require('../assets/business/commerce-contract.js');
 for(const kind of Object.keys(C.statuts))for(const s of C.statuts[kind])assert.ok(C.explicationStatut(kind,s).length>10,kind+' '+s);
 const css=fs.readFileSync('assets/business/style.css','utf8');assert.match(css,/pro-field input[^{]*\{font-size:16px;min-height:48px\}/,'champs à 16 px : pas de zoom automatique sur iPhone');
});
test('production : Commerces (13/10/2026) et Transport (14/10/2026) activés sur autorisation',()=>{const c=JSON.parse(fs.readFileSync('assets/business/config.json','utf8'));assert.equal(c.enabled,true);assert.deepEqual(c.modules,{commerce:true,transport:true});});
