(function(root){'use strict';
let config;
async function request(url,options={}){const response=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Contenus momentanément indisponibles');return response.json();}
// Supabase en ligne (https://<réf>.supabase.co) ; Supabase LOCAL accepté seulement si la page elle-même
// est servie depuis cet ordinateur (127.0.0.1/localhost) ET si la configuration est marquée « local ».
function cibleAutorisee(c){if(!c||typeof c.publishableKey!=='string'||!c.publishableKey.startsWith('sb_publishable_'))return false;if(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(c.url))return c.local!==true;const h=root.location&&root.location.hostname;return c.local===true&&(h==='127.0.0.1'||h==='localhost')&&/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(c.url);}
async function settings(){if(!config){const c=await request('assets/portail/backend.json');if(!cibleAutorisee(c))throw Error('Configuration publique invalide');config=c;}return config;}
function imagePermise(value){try{const u=new URL(value);return config&&u.origin===config.url&&u.pathname.startsWith('/storage/v1/object/sign/koki-media/');}catch(_){return false;}}
async function charger(){const c=await settings();const headers={apikey:c.publishableKey,'Content-Type':'application/json'};const data=await request(c.url+'/rest/v1/rpc/koki_public_feed',{method:'POST',headers,body:'{}'});if(data.version!==1||!Array.isArray(data.contenus))throw Error('Flux public invalide');const rows=data.contenus.filter(x=>x&&typeof x.id==='string'&&typeof x.titre==='string'&&typeof x.resume==='string'&&x.statut==='publié');
// Les images ont une URL temporaire ; chaque actualisation renouvelle leur accès.
const queue=rows.filter(x=>x.image_path&&/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(x.image_path));let i=0;
await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(i<queue.length){const row=queue[i++];try{const signed=await request(c.url+'/storage/v1/object/sign/koki-media/'+row.image_path,{method:'POST',headers,body:JSON.stringify({expiresIn:120})});const url=c.url+'/storage/v1'+signed.signedURL;if(imagePermise(url))row.image=url;}catch(_){row.image=null;}}}));return {version:1,contenus:rows};}
root.KokiPublicFeed={charger,imagePermise,cibleAutorisee};
})(globalThis);
