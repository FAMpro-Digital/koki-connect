// Livres téléchargés sur le téléphone : fichiers dans le cache « koki-livres-v1 », liste dans localStorage.
// Aucun envoi vers un serveur : tout reste sur l'appareil. Supprimer libère l'espace immédiatement.
(function(root){'use strict';
const CACHE='koki-livres-v1',INDEX='koki.livres.v1',MO=1024*1024;
const types=['application/pdf','application/epub+zip','audio/mpeg','audio/mp4','audio/x-m4a','application/octet-stream'];
const idRe=/^[A-Za-z0-9-]{1,64}$/;
function env(){return {caches:root.caches,storage:root.localStorage,fetch:root.fetch&&root.fetch.bind(root),navigator:root.navigator};}
let E=env();
function cle(id){if(!idRe.test(String(id)))throw Error('Livre invalide');return 'hors-ligne/livres/'+id;}
function lireIndex(){try{const v=JSON.parse(E.storage.getItem(INDEX));return v&&typeof v==='object'?v:{};}catch(_){return {};}}
function ecrireIndex(v){try{E.storage.setItem(INDEX,JSON.stringify(v));}catch(_){throw Error('Mémoire du téléphone pleine : supprimez un livre puis réessayez.');}}
function liste(){return Object.entries(lireIndex()).map(([id,m])=>({id,...m})).sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
function present(id){return Object.prototype.hasOwnProperty.call(lireIndex(),id);}
function disponible(){return !!(E.caches&&E.storage&&E.fetch);}
async function telecharger(id,meta,url,{onProgress,signal,limiteMo=60}={}){
 if(!disponible())throw Error('Le téléchargement n’est pas pris en charge par ce navigateur.');
 const key=cle(id);
 try{await E.navigator?.storage?.persist?.();}catch(_){}
 const r=await E.fetch(url,{signal,cache:'no-store'});
 if(!r.ok)throw Error('Téléchargement refusé par le serveur.');
 const type=String(r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 if(!types.includes(type))throw Error('Type de fichier non autorisé.');
 const total=Number(r.headers.get('content-length'))||0,max=limiteMo*MO;
 if(total>max)throw Error('Fichier trop lourd pour le téléphone.');
 const parts=[];let recu=0;
 if(r.body&&r.body.getReader){const reader=r.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;recu+=value.byteLength;if(recu>max){try{reader.cancel();}catch(_){}throw Error('Fichier trop lourd pour le téléphone.');}parts.push(value);if(onProgress)onProgress(recu,total);}}
 else{const buf=await r.arrayBuffer();recu=buf.byteLength;if(recu>max)throw Error('Fichier trop lourd pour le téléphone.');parts.push(buf);if(onProgress)onProgress(recu,total||recu);}
 const blob=new Blob(parts,{type});
 const cache=await E.caches.open(CACHE);
 try{await cache.put(key,new Response(blob,{headers:{'Content-Type':type,'Content-Length':String(blob.size)}}));}
 catch(_){throw Error('Mémoire du téléphone pleine : supprimez un livre puis réessayez.');}
 const index=lireIndex();index[id]={titre:String(meta.titre||'Livre').slice(0,200),format:String(meta.format||''),acces:meta.acces==='Payant'?'Payant':'Gratuit',octets:blob.size,type,date:new Date().toISOString()};
 try{ecrireIndex(index);}catch(e){await cache.delete(key);throw e;}
 return index[id];
}
async function ouvrir(id){if(!disponible())return null;const cache=await E.caches.open(CACHE);const r=await cache.match(cle(id));if(!r){const index=lireIndex();if(index[id]){delete index[id];ecrireIndex(index);}return null;}const blob=await r.blob();return {blob,type:blob.type||r.headers.get('content-type')||'application/octet-stream'};}
async function supprimer(id){const index=lireIndex();delete index[id];ecrireIndex(index);if(disponible()){const cache=await E.caches.open(CACHE);await cache.delete(cle(id));}}
async function espace(){const octets=liste().reduce((a,x)=>a+(Number(x.octets)||0),0);let quota=0;try{const est=await E.navigator?.storage?.estimate?.();quota=est&&est.quota||0;}catch(_){}return {octets,quota};}
function mo(octets){const v=octets/MO;return (v<10?v.toFixed(1):Math.round(v)).toString().replace('.',',')+' Mo';}
const api={CACHE,INDEX,liste,present,disponible,telecharger,ouvrir,supprimer,espace,mo,_env(e){E={...env(),...e};}};
root.KokiLivresHorsLigne=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
