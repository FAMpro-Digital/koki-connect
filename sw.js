// Koki Connect : ouverture de l'application sans internet.
// Stratégie « réseau d'abord » : en ligne, tout vient du serveur (pas de version figée) ;
// hors ligne, la dernière copie des fichiers du site est utilisée. Seuls les fichiers du site
// (même origine, GET) sont gardés : jamais Supabase, jamais les données ou les connexions,
// jamais de réponse personnalisée (en-tête Set-Cookie ou Cache-Control: private/no-store ignorés).
// Deux caches : « shell » (fichiers de l'application, installés d'avance) et « runtime » (le reste, borné).
// Les livres téléchargés vivent dans un cache séparé (koki-livres-v1) géré par la page.
// Pour forcer le renouvellement de tous les fichiers gardés : incrémenter VERSION.
'use strict';
const VERSION='v2';
const SHELL='koki-shell-'+VERSION,RUNTIME='koki-runtime-'+VERSION,MAX_RUNTIME=120;
const EXTRAS=['assets/leaflet/leaflet.js','assets/leaflet/leaflet.css'];
// Fichiers de l'application : la liste est lue dans index.html (rien à maintenir à la main).
async function precharger(){
  const cache=await caches.open(SHELL);
  const page=await fetch('index.html',{cache:'reload'});
  if(!page.ok)throw Error('index.html indisponible');
  const html=await page.clone().text();
  await cache.put('index.html',page.clone());
  await cache.put('./',page);
  const urls=new Set(['manifest.webmanifest',...EXTRAS]);
  for(const m of html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g))urls.add(m[1]);
  // Un fichier manquant n'empêche pas l'installation des autres.
  await Promise.allSettled([...urls].map(u=>cache.add(new Request(u,{cache:'reload'}))));
}
self.addEventListener('install',e=>{e.waitUntil(precharger().catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>/^koki-(shell|runtime)-/.test(k)&&k!==SHELL&&k!==RUNTIME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
function gardable(req,url){
  if(req.method!=='GET'||url.origin!==self.location.origin)return false;
  if(url.pathname.endsWith('/backend.json')||url.pathname.endsWith('/config.json')||url.pathname.endsWith('/environment.json'))return false;
  return req.mode==='navigate'||/\.(html|js|mjs|css|json|webmanifest|png|webp|svg|ico|jpg|woff2)$/.test(url.pathname);
}
// Une réponse personnalisée ou explicitement privée n'est jamais gardée.
function copiable(res){
  if(!res.ok||res.type!=='basic'||res.headers.has('set-cookie'))return false;
  return !/\b(private|no-store)\b/i.test(res.headers.get('cache-control')||'');
}
async function garder(req,res){
  const shell=await caches.open(SHELL);
  if(await shell.match(req)){await shell.put(req,res);return;}
  const runtime=await caches.open(RUNTIME);
  await runtime.put(req,res);
  const cles=await runtime.keys();
  // Plus anciennes entrées retirées d'abord.
  for(const k of cles.slice(0,Math.max(0,cles.length-MAX_RUNTIME)))await runtime.delete(k);
}
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(!gardable(req,url))return;
  e.respondWith(fetch(req).then(res=>{
    if(copiable(res)){const copy=res.clone();e.waitUntil(garder(req,copy).catch(()=>{}));}
    return res;
  }).catch(async()=>{
    const hit=await caches.match(req,{ignoreSearch:req.mode==='navigate'});
    if(hit)return hit;
    if(req.mode==='navigate')return (await caches.match('index.html'))||(await caches.match('./'))||Response.error();
    return Response.error();
  }));
});

// Push volontaire : aucun contenu de commande sur l'écran verrouillé et aucune URL fournie par le message.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification('Koki Connect',{
  body:'Une nouvelle information vous attend. Ouvrez vos notifications.',
  tag:typeof data.tag==='string'?data.tag.slice(0,100):'koki-notification',
  data:{url:new URL('./?notifications=1',self.registration.scope).href}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL('./?notifications=1',self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  for(const client of clients){if(new URL(client.url).origin===self.location.origin){await client.focus();client.postMessage({type:'koki-notifications-open'});return;}}
  await self.clients.openWindow(url);
 }));
});
