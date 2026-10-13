// Koki Connect : ouverture de l'application sans internet.
// Stratégie « réseau d'abord » : en ligne, tout vient du serveur (pas de version figée) ;
// hors ligne, la dernière copie des fichiers du site est utilisée. Seuls les fichiers du site
// (même origine, GET) sont gardés : jamais Supabase, jamais les données ou les connexions.
// Les livres téléchargés vivent dans un cache séparé (koki-livres-v1) géré par la page.
'use strict';
const SHELL='koki-shell-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(['./','index.html','manifest.webmanifest'])).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('koki-shell-')&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
function gardable(req,url){
  if(req.method!=='GET'||url.origin!==self.location.origin)return false;
  if(url.pathname.endsWith('/backend.json')||url.pathname.endsWith('/config.json')||url.pathname.endsWith('/environment.json'))return false;
  return req.mode==='navigate'||/\.(html|js|mjs|css|json|webmanifest|png|webp|svg|ico|jpg|woff2)$/.test(url.pathname);
}
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(!gardable(req,url))return;
  e.respondWith(fetch(req).then(res=>{
    if(res.ok&&res.type==='basic'){const copy=res.clone();caches.open(SHELL).then(c=>c.put(req,copy)).catch(()=>{});}
    return res;
  }).catch(async()=>{
    const hit=await caches.match(req,{ignoreSearch:req.mode==='navigate'});
    if(hit)return hit;
    if(req.mode==='navigate')return (await caches.match('index.html'))||(await caches.match('./'))||Response.error();
    return Response.error();
  }));
});
