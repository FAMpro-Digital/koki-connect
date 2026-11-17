'use strict';
// Quota d'envoi Supabase : les vidéos ne se téléchargent qu'à la lecture, les liens d'images sont réutilisés.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('vidéo : rien n’est téléchargé avant Lecture, photo de la publication en aperçu',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('assets/portail/video.js','utf8'),ctx);
 const doc={createElement:t=>({tagName:t})};
 const v=ctx.window.KokiVideo.renderVideo({video_source:'upload',video_url:'https://x.supabase.co/storage/v1/object/sign/koki-videos/a/b.mp4?token=t',poster:'https://x/p.jpg'},doc);
 assert.equal(v.preload,'none');assert.equal(v.poster,'https://x/p.jpg');assert.ok(!v.src.includes('#t='));assert.equal(v.controls,true);
 assert.ok(fs.readFileSync('assets/portail/app.js','utf8').includes('poster:x.image||null'));
});
test('images : liens de 24 h (fil) et 6 h (fiches), gardés sur l’appareil, effacés à la déconnexion',()=>{
 const feed=fs.readFileSync('assets/portail/feed.js','utf8');assert.ok(!feed.includes('expiresIn:120'));assert.equal((feed.match(/expiresIn:DUREE_LIEN/g)||[]).length,2);assert.ok(feed.includes('DUREE_LIEN=86400'));
 const client=fs.readFileSync('assets/business/client.mjs','utf8');assert.ok(client.includes("createSignedUrl(path,DUREE_LIEN_IMAGE)"));assert.ok(client.includes('DUREE_LIEN_IMAGE=21600'));
 assert.ok(client.includes("function purgerDonneesCompte(){liensImages=null;try{globalThis.localStorage?.removeItem('koki.photos.signees.v1');}"));
});
test('fiches : une même photo n’est signée qu’une fois tant que le lien est valable',async()=>{
 const {createBusinessClient}=await import('../assets/business/client.mjs');let signatures=0;
 const db={supabaseUrl:'https://abc.supabase.co',auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:null}})},
  storage:{from:()=>({createSignedUrl:async p=>{signatures++;return {data:{signedUrl:'https://abc.supabase.co/storage/v1/object/sign/koki-media/'+p+'?token=t'+signatures}};}})}};
 const api=createBusinessClient(db,{enabled:true});
 const a=await api.image('u/1.jpg'),b=await api.image('u/1.jpg');assert.equal(a,b);assert.equal(signatures,1);
 await api.image('u/2.jpg');assert.equal(signatures,2);
});
