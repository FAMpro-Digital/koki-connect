'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const BASE='https://qsbmzzbiztfqysstepxm.supabase.co',ID='08c89d66-6fe5-488f-b22c-d1032db15a17';
function creer(rows,signOk=true){const calls=[];const ctx={URL,AbortSignal,fetch:async(url,o={})=>{calls.push(url);const json=v=>({ok:true,json:async()=>v});
 if(url.endsWith('backend.json'))return json({url:BASE,publishableKey:'sb_publishable_test'});
 if(url.includes('/rest/v1/koki_content_media'))return json(rows);
 if(url.includes('/object/sign/koki-videos/'))return signOk?json({signedURL:'/object/sign/koki-videos/'+url.split('koki-videos/')[1]+'?token=t'}):{ok:false};
 return {ok:false};}};vm.runInNewContext(fs.readFileSync('assets/portail/feed.js','utf8'),ctx);return {F:ctx.KokiPublicFeed,calls};}
const up=(n,d)=>({source:'upload',storage_path:'4605cc15-a0bb-4925-a1a3-02fd0c7905e1/'+n+'.mp4',youtube_video_id:null,created_at:d});
test('vidéo envoyée : la plus récente seulement, lien signé du bucket koki-videos',async()=>{
 const {F,calls}=creer([up('aaaa-2','2026-11-11T22:29'),up('aaaa-1','2026-11-11T22:27')]);const v=await F.videos(ID);
 assert.equal(v.length,1);assert.equal(v[0].video_source,'upload');assert.ok(v[0].video_url.startsWith(BASE+'/storage/v1/object/sign/koki-videos/4605cc15-a0bb-4925-a1a3-02fd0c7905e1/aaaa-2.mp4?token='));
 assert.ok(calls.some(u=>u.includes('content_id=eq.'+ID)));
});
test('YouTube : identifiant contrôlé ; chemins et identifiants douteux ignorés',async()=>{
 let {F}=creer([{source:'youtube',youtube_video_id:'dQw4w9WgXcQ',storage_path:null}]);assert.deepEqual(JSON.parse(JSON.stringify(await F.videos(ID))),[{video_source:'youtube',youtube_video_id:'dQw4w9WgXcQ'}]);
 ({F}=creer([{source:'youtube',youtube_video_id:'x"><script>',storage_path:null},{source:'upload',storage_path:'../secret.mp4'}]));assert.equal((await F.videos(ID)).length,0);
 ({F}=creer([up('aaaa-1','d')],false));assert.equal((await F.videos(ID)).length,0);
 assert.equal((await F.videos('pas-un-id')).length,0);assert.equal(F.videoPermise('https://evil.example/storage/v1/object/sign/koki-videos/a/b.mp4'),false);
});
test('page publique : lecteur chargé, zone vidéo dans la fiche, YouTube autorisé par la CSP',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.indexOf('assets/portail/video.js')>html.indexOf('assets/portail/feed.js'));
 const app=fs.readFileSync('assets/portail/app.js','utf8');assert.ok(app.includes("ajouterVideo(x,generation,zoneVideo)"));
 const csp=JSON.parse(fs.readFileSync('vercel.json','utf8')).headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
 assert.match(csp,/frame-src https:\/\/www\.youtube-nocookie\.com;/);assert.match(csp,/media-src 'self' blob: https:\/\/qsbmzzbiztfqysstepxm\.supabase\.co/);
});
test('accueil : chaque publication reçoit sa vidéo la plus récente, signée par lot ; le flux survit à une panne des médias',async()=>{
 const contenus=[{id:ID,titre:'A',resume:'R',statut:'publié'},{id:'11111111-1111-1111-1111-111111111111',titre:'B',resume:'R',statut:'publié'},{id:'22222222-2222-2222-2222-222222222222',titre:'C',resume:'R',statut:'publié'}];
 const medias=[{content_id:ID,...up('aaaa-2','2')},{content_id:ID,...up('aaaa-1','1')},{content_id:'11111111-1111-1111-1111-111111111111',source:'youtube',youtube_video_id:'dQw4w9WgXcQ'},{content_id:'inconnu',...up('aaaa-9','0')}];
 function creerFlux(mediaOk){const calls=[];const ctx={URL,AbortSignal,localStorage:{setItem(){},getItem(){return null;}},fetch:async(url,o={})=>{calls.push({url,body:o.body});const json=v=>({ok:true,json:async()=>v});
  if(url.endsWith('backend.json'))return json({url:BASE,publishableKey:'sb_publishable_test'});
  if(url.endsWith('koki_public_feed'))return json({version:1,contenus:contenus.map(x=>({...x}))});
  if(url.includes('/rest/v1/koki_content_media'))return mediaOk?json(medias):{ok:false};
  if(url.endsWith('/object/sign/koki-videos'))return json(JSON.parse(o.body).paths.map(p=>({path:p,signedURL:'/object/sign/koki-videos/'+p+'?token=t'})));
  return {ok:false};}};vm.runInNewContext(fs.readFileSync('assets/portail/feed.js','utf8'),ctx);return {F:ctx.KokiPublicFeed,calls};}
 let {F,calls}=creerFlux(true);let flux=await F.charger();
 assert.equal(flux.contenus[0].video.video_source,'upload');assert.ok(flux.contenus[0].video.video_url.includes('/koki-videos/4605cc15-a0bb-4925-a1a3-02fd0c7905e1/aaaa-2.mp4?token='));
 assert.equal(flux.contenus[1].video.youtube_video_id,'dQw4w9WgXcQ');assert.equal(flux.contenus[2].video,null);
 const sign=calls.filter(c=>c.url.endsWith('/object/sign/koki-videos'));assert.equal(sign.length,1);assert.deepEqual(JSON.parse(sign[0].body).paths,['4605cc15-a0bb-4925-a1a3-02fd0c7905e1/aaaa-2.mp4']);
 assert.equal(F.empreinte(flux.contenus),F.empreinte(flux.contenus.map(x=>x.video&&x.video.video_url?{...x,video:{...x.video,video_url:x.video.video_url+'&autre'}}:x)),'un nouveau lien signé ne redessine pas la page');
 ({F}=creerFlux(false));flux=await F.charger();assert.equal(flux.contenus.length,3);assert.ok(flux.contenus.every(x=>x.video===null));
});
test('carte : la vidéo est placée avant le titre et la description, comme la photo',()=>{
 const app=fs.readFileSync('assets/portail/app.js','utf8');
 assert.ok(app.indexOf("if(x.video&&window.KokiVideo)")>app.indexOf("link.className='publication-photo-link'"));
 assert.ok(app.indexOf("if(x.video&&window.KokiVideo)")<app.indexOf("const heading=n('h3')"));
 assert.ok(app.includes("label,video,iframe,[role=\"button\"]"));assert.ok(app.includes("if(!x.video)ajouterVideo("));
});
