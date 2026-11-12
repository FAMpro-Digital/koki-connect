'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const handler=require('../api/partage.js');
const ID='08c89d66-6fe5-488f-b22c-d1032db15a17',BASE='https://qsbmzzbiztfqysstepxm.supabase.co';
const res=()=>({statusCode:0,headers:{},body:'',setHeader(k,v){this.headers[k]=v;},end(b){this.body=b||'';}});
const serveur=(row,signOk=true)=>async(url,o={})=>{
 if(url.includes('/rest/v1/koki_contents'))return {ok:true,json:async()=>row?[row]:[]};
 if(url.includes('/object/sign/koki-media/'))return signOk?{ok:true,json:async()=>({signedURL:'/object/sign/koki-media/'+url.split('koki-media/')[1]+'?token=t'})}:{ok:false};
 return {ok:false};};
test('aperçu : titre, résumé et photo de la publication, puis renvoi vers l’application',async()=>{
 const r=res();await handler({query:{id:ID}},r,serveur({id:ID,titre:'Ziarra "2027" <b>',resume:'Résumé & détails',type:'Actualités',image_path:'4605cc15/95efe191.jpg'}));
 assert.equal(r.statusCode,200);assert.match(r.headers['Content-Type'],/text\/html/);
 assert.ok(r.body.includes('<meta property="og:title" content="Ziarra &quot;2027&quot; &lt;b&gt;">'));
 assert.ok(r.body.includes('<meta property="og:description" content="Résumé &amp; détails">'));
 assert.ok(r.body.includes('<meta property="og:image" content="'+BASE+'/storage/v1/object/sign/koki-media/4605cc15/95efe191.jpg?token=t">'));
 assert.ok(r.body.includes('<meta http-equiv="refresh" content="0;url=/?publication='+ID+'">'));assert.ok(!/<script/i.test(r.body));
});
test('sans photo ou signature impossible : image générale de Koki Connect',async()=>{
 const r=res();await handler({query:{id:ID}},r,serveur({id:ID,titre:'T',resume:'',type:'Annonces',image_path:'a/b.jpg'},false));
 assert.ok(r.body.includes('og:image" content="https://www.kokiconnect.com/assets/entete-horizontal.webp"'));assert.ok(r.body.includes('og:description" content="Annonces"'));
});
test('identifiant invalide, publication absente ou serveur en panne : simple renvoi, jamais d’erreur',async()=>{
 let r=res();await handler({query:{id:'../etc'}},r,serveur(null));assert.equal(r.statusCode,302);assert.equal(r.headers.Location,'/');
 r=res();await handler({query:{id:ID}},r,serveur(null));assert.equal(r.statusCode,302);assert.equal(r.headers.Location,'/?publication='+ID);
 r=res();await handler({query:{id:ID}},r,async()=>{throw Error('réseau');});assert.equal(r.statusCode,302);
});
test('site : /p/<id> réécrit vers la fonction, image d’aperçu présente',()=>{
 const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.deepEqual(v.rewrites,[{source:'/p/:id',destination:'/api/partage?id=:id'}]);
 assert.ok(fs.existsSync('assets/entete-horizontal.webp'));
});
test('vidéos : page dédiée et bouton d’accueil seulement s’il y a des vidéos ; lien partagé repris hors connexion',()=>{
 const a=fs.readFileSync('assets/portail/app.js','utf8');
 assert.ok(a.includes("function avecVideo(){return actifs().filter(x=>x.video&&x.type!=='Publicités');}"));assert.ok(a.includes('z.hidden=!nb;'));assert.ok(a.includes('window.KokiPortail={ouvrir,detail,videos,'));
 assert.ok(fs.readFileSync('index.html','utf8').includes('id="accueil-videos"'));
 assert.ok(fs.readFileSync('sw.js','utf8').includes("Response.redirect('/?publication='+m[1],302)"));
});
