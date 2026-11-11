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
