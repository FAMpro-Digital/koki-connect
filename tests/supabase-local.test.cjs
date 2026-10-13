const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const LOCAL={url:'http://127.0.0.1:54321',publishableKey:'sb_publishable_LOCAL',local:true};
function feedFor(backend,hostname){const calls=[];const ctx={URL,AbortSignal,fetch:async url=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('backend.json')?backend:{version:1,contenus:[]}};}};if(hostname)ctx.location={hostname};vm.runInNewContext(fs.readFileSync('assets/portail/feed.js','utf8'),ctx);return {feed:ctx.KokiPublicFeed,calls};}
test('version publiée : configuration de production intacte, mode métier désactivé',()=>{
 const backend=JSON.parse(fs.readFileSync('assets/portail/backend.json','utf8'));
 assert.match(backend.url,/^https:\/\/[a-z0-9]+\.supabase\.co$/);assert.ok(backend.publishableKey.startsWith('sb_publishable_'));assert.equal(backend.local,undefined);
 assert.equal(JSON.parse(fs.readFileSync('assets/business/config.json','utf8')).modules.transport,false,'Transport reste fermé en production');
 assert.equal(JSON.parse(fs.readFileSync('assets/portail/environment.json','utf8')).local,undefined);
});
test('flux public : Supabase local accepté uniquement sur une page servie en local',async()=>{
 const ok=feedFor(LOCAL,'127.0.0.1');await ok.feed.charger();assert.ok(ok.calls.includes('http://127.0.0.1:54321/rest/v1/rpc/koki_public_feed'));
 assert.equal(ok.feed.imagePermise('http://127.0.0.1:54321/storage/v1/object/sign/koki-media/a/b.jpg'),true);
 for(const host of ['koki-connect.vercel.app','192.168.1.10',undefined])await assert.rejects(feedFor(LOCAL,host).feed.charger(),/invalide/,String(host));
 await assert.rejects(feedFor({...LOCAL,local:undefined},'127.0.0.1').feed.charger(),/invalide/);
 for(const url of ['http://evil.test:54321','http://127.0.0.1:5432','https://127.0.0.1:54321'])await assert.rejects(feedFor({...LOCAL,url},'127.0.0.1').feed.charger(),/invalide/,url);
 await assert.rejects(feedFor({...LOCAL,publishableKey:'sb_secret_x'},'127.0.0.1').feed.charger(),/invalide/);
 // Une configuration de production marquée « local » est aussi refusée (aucun mélange).
 await assert.rejects(feedFor({url:'https://qsbmzzbiztfqysstepxm.supabase.co',publishableKey:'sb_publishable_x',local:true},'127.0.0.1').feed.charger(),/invalide/);
 const prod=feedFor({url:'https://qsbmzzbiztfqysstepxm.supabase.co',publishableKey:'sb_publishable_x'},'koki-connect.vercel.app');await prod.feed.charger();
});
test('commandes métier : même règle locale dans runtime.mjs',async()=>{
 const g=globalThis;g.window=g.window||{};g.location=g.location||{search:'',hostname:'127.0.0.1'};
 const {backendAutorise}=await import('../assets/business/runtime.mjs');
 assert.equal(backendAutorise(LOCAL,'127.0.0.1'),true);assert.equal(backendAutorise(LOCAL,'localhost'),true);
 assert.equal(backendAutorise(LOCAL,'koki-connect.vercel.app'),false);assert.equal(backendAutorise({...LOCAL,local:false},'127.0.0.1'),false);
 assert.equal(backendAutorise({...LOCAL,url:'http://10.0.0.2:54321'},'127.0.0.1'),false);
 assert.equal(backendAutorise({url:'https://abc.supabase.co',publishableKey:'sb_publishable_x'},'koki-connect.vercel.app'),true);
 assert.equal(backendAutorise({url:'https://abc.supabase.co',publishableKey:'sb_secret_x'},'koki-connect.vercel.app'),false);
});
test('serveur local : refuse toute base distante, sert la configuration locale sans toucher aux fichiers',async()=>{
 const {localSettings,createLocalServer,parseEnv}=await import('../scripts/serve-local.mjs');
 for(const url of ['https://qsbmzzbiztfqysstepxm.supabase.co','https://euvxtwmyoihnutifshay.supabase.co','http://192.168.0.2:54321'])assert.throws(()=>localSettings({KOKI_LOCAL_SUPABASE_URL:url}),/Refus/);
 assert.throws(()=>localSettings({KOKI_LOCAL_PUBLISHABLE_KEY:'sb_secret_x'}),/publishable/);
 assert.deepEqual(parseEnv('# c\nKOKI_LOCAL_PORT=9090\nX="y"'),{KOKI_LOCAL_PORT:'9090',X:'y'});
 const before=fs.readFileSync('assets/portail/backend.json','utf8');
 const settings=localSettings({KOKI_LOCAL_PORT:'8099'});const server=createLocalServer(settings);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port;
  const backend=await (await fetch(base+'/assets/portail/backend.json')).json();assert.deepEqual(backend,{url:'http://127.0.0.1:54321',publishableKey:'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',local:true});
  assert.equal((await (await fetch(base+'/assets/business/config.json')).json()).enabled,true);
  assert.match(await (await fetch(base+'/')).text(),/<html/i);
  for(const p of ['/.env.supabase-local','/scripts/serve-local.mjs','/tests/feed.test.cjs','/%2e%2e/etc/passwd','/.git/config'])assert.equal((await fetch(base+p)).status,404,p);
 }finally{server.close();}
 assert.equal(fs.readFileSync('assets/portail/backend.json','utf8'),before);
});
test('préparation de la version publiable : refuse une configuration locale',()=>{
 const s=fs.readFileSync('scripts/prepare-preview.mjs','utf8');assert.match(s,/backend\.local===true/);assert.match(s,/jamais le Supabase local/);
 assert.match(fs.readFileSync('.gitignore','utf8'),/^!\.env\.supabase-local\.example$/m);
 assert.doesNotMatch(fs.readFileSync('.env.supabase-local.example','utf8'),/sb_secret_|service_role|supabase\.co/);
});
