(function(root){'use strict';
let config;
// Réutilisation en mémoire uniquement, sans prolonger les droits des liens signés.
const imagesSignees=new Map();
function memoriserImage(row){if(row.image)imagesSignees.set(row.image_path,{url:row.image,expire:Date.now()+110000});}
function empreinte(contenus){return JSON.stringify(contenus.map(({image,video,...contenu})=>({...contenu,video:video?video.video_source+':'+(video.youtube_video_id||video.chemin||''):null})));}

async function request(url,options={}){const response=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Contenus momentanément indisponibles');return response.json();}
// Supabase en ligne (https://<réf>.supabase.co) ; Supabase LOCAL accepté seulement si la page elle-même
// est servie depuis cet ordinateur (127.0.0.1/localhost) ET si la configuration est marquée « local ».
function cibleAutorisee(c){if(!c||typeof c.publishableKey!=='string'||!c.publishableKey.startsWith('sb_publishable_'))return false;if(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(c.url))return c.local!==true;const h=root.location&&root.location.hostname;return c.local===true&&(h==='127.0.0.1'||h==='localhost')&&/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(c.url);}
async function settings(){if(!config){const c=await request('assets/portail/backend.json');if(!cibleAutorisee(c))throw Error('Configuration publique invalide');config=c;}return config;}
function imagePermise(value){try{const u=new URL(value);return config&&u.origin===config.url&&u.pathname.startsWith('/storage/v1/object/sign/koki-media/');}catch(_){return false;}}
async function signerUne(c,headers,row){try{const signed=await request(c.url+'/storage/v1/object/sign/koki-media/'+row.image_path,{method:'POST',headers,body:JSON.stringify({expiresIn:120})});const url=c.url+'/storage/v1'+signed.signedURL;row.image=imagePermise(url)?url:null;memoriserImage(row);}catch(_){row.image=null;}}
async function signerImages(c,headers,queue){
const chemins=new Set(queue.map(x=>x.image_path));
for(const [path,entry] of imagesSignees)if(!chemins.has(path)||entry.expire<=Date.now())imagesSignees.delete(path);
queue=queue.filter(row=>{const entry=imagesSignees.get(row.image_path);if(!entry)return true;row.image=entry.url;return false;});
if(!queue.length)return;
try{const lot=await request(c.url+'/storage/v1/object/sign/koki-media',{method:'POST',headers,body:JSON.stringify({expiresIn:120,paths:queue.map(x=>x.image_path)})});if(!Array.isArray(lot))throw Error('lot invalide');const parChemin=new Map(lot.map(x=>[x&&x.path,x]));let echec=[];for(const row of queue){const r=parChemin.get(row.image_path);const url=r&&!r.error&&typeof r.signedURL==='string'?c.url+'/storage/v1'+r.signedURL:null;if(url&&imagePermise(url)){row.image=url;memoriserImage(row);}else echec.push(row);}for(const row of echec)row.image=null;return;}catch(_){}
let i=0;await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(i<queue.length)await signerUne(c,headers,queue[i++]);}));}
async function chargerReseau(){const c=await settings();const headers={apikey:c.publishableKey,'Content-Type':'application/json'};const all=[];let offset=0;for(;;){const data=await request(c.url+'/rest/v1/rpc/koki_public_feed',{method:'POST',headers,body:JSON.stringify({p_offset:offset})});if(data.version!==1||!Array.isArray(data.contenus))throw Error('Flux public invalide');all.push(...data.contenus);if(!data.more)break;if(!data.contenus.length||offset>=100000)throw Error('Flux trop volumineux');offset+=data.contenus.length;}const rows=[...new Map(all.map(x=>[x?.id,x])).values()].filter(x=>x&&typeof x.id==='string'&&typeof x.titre==='string'&&typeof x.resume==='string'&&x.statut==='publié');
// Les images ont une URL temporaire ; chaque actualisation renouvelle leur accès.
const queue=rows.filter(x=>x.image_path&&/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(x.image_path));
// Signature par lot : une seule requête pour toutes les images ; repli image par image si le lot échoue.
await signerImages(c,headers,queue);try{await attacherVideos(c,headers,rows);}catch(_){}return {version:1,contenus:rows};}
// Dernier flux public réussi, gardé sur l'appareil : affiché si le réseau ou le serveur est indisponible.
// Uniquement des contenus publiés (publics) ; les URL d'images temporaires ne sont pas conservées.
const CLE_COPIE='koki.flux.public.v1',COPIE_MAX=1500000;
function garderCopie(flux){try{const lot={version:1,date:Date.now(),contenus:flux.contenus.slice(0,60).map(x=>({...x,image:null,video:null}))};const texte=JSON.stringify(lot);if(texte.length<=COPIE_MAX)root.localStorage.setItem(CLE_COPIE,texte);}catch(_){}}
function lireCopie(){try{const lot=JSON.parse(root.localStorage.getItem(CLE_COPIE));if(lot&&lot.version===1&&Array.isArray(lot.contenus)&&lot.contenus.every(x=>x&&x.statut==='publié'&&typeof x.id==='string'))return {version:1,contenus:lot.contenus.map(x=>({...x,image:null,video:null})),horsLigne:true,date:lot.date};}catch(_){}return null;}
async function charger(){try{const flux=await chargerReseau();garderCopie(flux);return flux;}catch(e){const copie=lireCopie();if(copie)return copie;throw e;}}
// Livres gratuits : lien temporaire (5 min) vers un fichier du bucket privé koki-livres ; jamais d'autre origine ni d'autre bucket.
// Le serveur ne signe que les fichiers de livres gratuits publiés (politique livres_public_read).
function fichierPermis(value){try{const u=new URL(value);return !!config&&u.origin===config.url&&/^\/storage\/v1\/object\/sign\/koki-livres\/[a-f0-9-]+\/[a-f0-9-]+\.(pdf|epub|mp3|m4a)$/.test(u.pathname);}catch(_){return false;}}
async function signerFichier(path){if(!/^[a-f0-9-]+\/[a-f0-9-]+\.(pdf|epub|mp3|m4a)$/.test(String(path)))throw Error('Fichier non disponible');const c=await settings();const headers={apikey:c.publishableKey,'Content-Type':'application/json'};const signed=await request(c.url+'/storage/v1/object/sign/koki-livres/'+path,{method:'POST',headers,body:JSON.stringify({expiresIn:300})});const url=c.url+'/storage/v1'+signed.signedURL;if(!fichierPermis(url))throw Error('Lien de téléchargement refusé');return url;}
async function renouvelerImage(path){if(!/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(String(path)))return null;const c=await settings(),row={image_path:path};await signerUne(c,{apikey:c.publishableKey,'Content-Type':'application/json'},row);return row.image;}
async function detail(id){const c=await settings();const row=await request(c.url+'/rest/v1/rpc/koki_public_content',{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_id:id})});if(!row||row.id!==id)throw Error('Publication indisponible');if(row.image_path)row.image=await renouvelerImage(row.image_path);return row;}
// Vidéos d'une publication publiée : fichier du bucket privé koki-videos (lien temporaire d'une heure, signé seulement
// pour les publications publiées) ou identifiant YouTube. Une vidéo de chaque sorte au plus : la plus récente.
function videoPermise(value){try{const u=new URL(value);return !!config&&u.origin===config.url&&/^\/storage\/v1\/object\/sign\/koki-videos\/[a-f0-9-]+\/[a-f0-9-]+\.(mp4|webm)$/.test(u.pathname);}catch(_){return false;}}
// Accueil et listes : la vidéo la plus récente de chaque publication publiée (une requête pour les médias, une signature par lot).
// La sécurité reste côté serveur : seules les lignes et les fichiers de publications publiées sont lisibles.
async function attacherVideos(c,headers,rows){const parId=new Map(rows.map(x=>[x.id,x]));for(const x of rows)x.video=null;
const medias=await request(c.url+'/rest/v1/koki_content_media?select=content_id,source,storage_path,youtube_video_id,created_at&order=created_at.desc&limit=300',{headers});if(!Array.isArray(medias))return;
const aSigner=[];for(const m of medias){const x=m&&parId.get(m.content_id);if(!x||x.video)continue;
 if(m.source==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(m.youtube_video_id||''))x.video={video_source:'youtube',youtube_video_id:m.youtube_video_id};
 else if(m.source==='upload'&&/^[a-f0-9-]+\/[a-f0-9-]+\.(mp4|webm)$/.test(m.storage_path||'')){x.video={video_source:'upload',chemin:m.storage_path,video_url:null};aSigner.push(x);}}
if(!aSigner.length)return;
try{const lot=await request(c.url+'/storage/v1/object/sign/koki-videos',{method:'POST',headers,body:JSON.stringify({expiresIn:3600,paths:aSigner.map(x=>x.video.chemin)})});const parChemin=new Map((Array.isArray(lot)?lot:[]).map(r=>[r&&r.path,r]));
 for(const x of aSigner){const r=parChemin.get(x.video.chemin);const url=r&&!r.error&&typeof r.signedURL==='string'?c.url+'/storage/v1'+r.signedURL:null;if(url&&videoPermise(url))x.video.video_url=url;else x.video=null;}}
catch(_){for(const x of aSigner)x.video=null;}}
async function videos(id){if(!/^[a-f0-9-]{36}$/.test(String(id)))return [];const c=await settings();const headers={apikey:c.publishableKey,'Content-Type':'application/json'};
const rows=await request(c.url+'/rest/v1/koki_content_media?content_id=eq.'+id+'&select=source,storage_path,youtube_video_id,created_at&order=created_at.desc&limit=10',{headers});if(!Array.isArray(rows))return [];
const out=[];const yt=rows.find(r=>r&&r.source==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(r.youtube_video_id||''));if(yt)out.push({video_source:'youtube',youtube_video_id:yt.youtube_video_id});
const up=rows.find(r=>r&&r.source==='upload'&&/^[a-f0-9-]+\/[a-f0-9-]+\.(mp4|webm)$/.test(r.storage_path||''));
if(up){try{const signed=await request(c.url+'/storage/v1/object/sign/koki-videos/'+up.storage_path,{method:'POST',headers,body:JSON.stringify({expiresIn:3600})});const url=c.url+'/storage/v1'+signed.signedURL;if(videoPermise(url))out.push({video_source:'upload',video_url:url});}catch(_){}}
return out;}
root.KokiPublicFeed={empreinte,detail,videos,videoPermise,renouvelerImage,charger,imagePermise,cibleAutorisee,signerFichier,fichierPermis};
})(globalThis);
