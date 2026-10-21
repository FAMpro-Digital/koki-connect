(function(root){'use strict';
let config;
async function request(url,options={}){const response=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Contenus momentanément indisponibles');return response.json();}
// Supabase en ligne (https://<réf>.supabase.co) ; Supabase LOCAL accepté seulement si la page elle-même
// est servie depuis cet ordinateur (127.0.0.1/localhost) ET si la configuration est marquée « local ».
function cibleAutorisee(c){if(!c||typeof c.publishableKey!=='string'||!c.publishableKey.startsWith('sb_publishable_'))return false;if(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(c.url))return c.local!==true;const h=root.location&&root.location.hostname;return c.local===true&&(h==='127.0.0.1'||h==='localhost')&&/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(c.url);}
async function settings(){if(!config){const c=await request('assets/portail/backend.json');if(!cibleAutorisee(c))throw Error('Configuration publique invalide');config=c;}return config;}
function imagePermise(value){try{const u=new URL(value);return config&&u.origin===config.url&&u.pathname.startsWith('/storage/v1/object/sign/koki-media/');}catch(_){return false;}}
async function signerUne(c,headers,row){try{const signed=await request(c.url+'/storage/v1/object/sign/koki-media/'+row.image_path,{method:'POST',headers,body:JSON.stringify({expiresIn:120})});const url=c.url+'/storage/v1'+signed.signedURL;row.image=imagePermise(url)?url:null;}catch(_){row.image=null;}}
async function signerImages(c,headers,queue){if(!queue.length)return;
try{const lot=await request(c.url+'/storage/v1/object/sign/koki-media',{method:'POST',headers,body:JSON.stringify({expiresIn:120,paths:queue.map(x=>x.image_path)})});if(!Array.isArray(lot))throw Error('lot invalide');const parChemin=new Map(lot.map(x=>[x&&x.path,x]));let echec=[];for(const row of queue){const r=parChemin.get(row.image_path);const url=r&&!r.error&&typeof r.signedURL==='string'?c.url+'/storage/v1'+r.signedURL:null;if(url&&imagePermise(url))row.image=url;else echec.push(row);}for(const row of echec)row.image=null;return;}catch(_){}
let i=0;await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(i<queue.length)await signerUne(c,headers,queue[i++]);}));}
async function charger(){const c=await settings();const headers={apikey:c.publishableKey,'Content-Type':'application/json'};const data=await request(c.url+'/rest/v1/rpc/koki_public_feed',{method:'POST',headers,body:'{}'});if(data.version!==1||!Array.isArray(data.contenus))throw Error('Flux public invalide');const rows=data.contenus.filter(x=>x&&typeof x.id==='string'&&typeof x.titre==='string'&&typeof x.resume==='string'&&x.statut==='publié');
// Les images ont une URL temporaire ; chaque actualisation renouvelle leur accès.
const queue=rows.filter(x=>x.image_path&&/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(x.image_path));let i=0;
// Signature par lot : une seule requête pour toutes les images ; repli image par image si le lot échoue.
await signerImages(c,headers,queue);return {version:1,contenus:rows};}
// Livres gratuits : lien temporaire (5 min) vers un fichier du bucket privé koki-livres ; jamais d'autre origine ni d'autre bucket.
// Le serveur ne signe que les fichiers de livres gratuits publiés (politique livres_public_read).
function fichierPermis(value){try{const u=new URL(value);return !!config&&u.origin===config.url&&/^\/storage\/v1\/object\/sign\/koki-livres\/[a-f0-9-]+\/[a-f0-9-]+\.(pdf|epub|mp3|m4a)$/.test(u.pathname);}catch(_){return false;}}
async function signerFichier(path){if(!/^[a-f0-9-]+\/[a-f0-9-]+\.(pdf|epub|mp3|m4a)$/.test(String(path)))throw Error('Fichier non disponible');const c=await settings();const headers={apikey:c.publishableKey,'Content-Type':'application/json'};const signed=await request(c.url+'/storage/v1/object/sign/koki-livres/'+path,{method:'POST',headers,body:JSON.stringify({expiresIn:300})});const url=c.url+'/storage/v1'+signed.signedURL;if(!fichierPermis(url))throw Error('Lien de téléchargement refusé');return url;}
root.KokiPublicFeed={charger,imagePermise,cibleAutorisee,signerFichier,fichierPermis};
})(globalThis);
