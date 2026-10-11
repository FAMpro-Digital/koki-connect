// Serveur de développement du site public relié au Supabase LOCAL (Docker sur cet ordinateur).
//   node scripts/serve-local.mjs        → http://127.0.0.1:8080
// Les fichiers du dépôt ne sont jamais modifiés : la configuration locale est servie à la volée
// (backend.json, config.json, environment.json). La version publiée garde la configuration de production.
// Garde-fous : écoute sur 127.0.0.1 seulement, cible Supabase 127.0.0.1:54321 seulement, clé publishable seulement.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export const LOCAL_SUPABASE=/^http:\/\/(127\.0\.0\.1|localhost):54321$/;
// Clé publishable par défaut de la CLI Supabase locale (identique sur toutes les machines, sans valeur secrète).
const DEFAULT_LOCAL_KEY='sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
export function parseEnv(text){const out={};for(const line of String(text).split(/\r?\n/)){const m=/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);if(m&&!line.trim().startsWith('#'))out[m[1]]=m[2].replace(/^["']|["']$/g,'');}return out;}
export function localSettings(env={}){
 const url=env.KOKI_LOCAL_SUPABASE_URL||'http://127.0.0.1:54321',key=env.KOKI_LOCAL_PUBLISHABLE_KEY||DEFAULT_LOCAL_KEY;
 if(!LOCAL_SUPABASE.test(url))throw Error('Refus : le site local ne peut viser que le Supabase local http://127.0.0.1:54321 (reçu : '+url+').');
 if(!key.startsWith('sb_publishable_'))throw Error('Refus : seule une clé « sb_publishable_ » est acceptée.');
 const port=Number(env.KOKI_LOCAL_PORT||8080);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port local invalide.');
 return {
  port,
  overrides:{
   '/assets/portail/backend.json':{url,publishableKey:key,local:true},
   '/assets/business/config.json':{enabled:env.KOKI_LOCAL_BUSINESS!=='false',schemaVersion:2},
   '/assets/portail/environment.json':{adminURL:env.KOKI_LOCAL_ADMIN_URL||'http://127.0.0.1:5173/',preproduction:true,local:true}
  }
 };
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.jpg':'image/jpeg','.woff2':'font/woff2'};
const served=['/index.html','/favicon.ico','/manifest.webmanifest','/assets/'];
export function createLocalServer(settings){
 return createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   const wanted=pathname==='/'?'/index.html':pathname;
   const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
   if(settings.overrides[wanted]){res.writeHead(200,{...headers,'Content-Type':types['.json']});res.end(JSON.stringify(settings.overrides[wanted]));return;}
   const file=path.normalize(path.join(root,wanted));
   if(!file.startsWith(root)||!served.some(p=>wanted===p||(p.endsWith('/')&&wanted.startsWith(p)))||!(await stat(file)).isFile())throw Error('absent');
   res.writeHead(200,{...headers,'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Introuvable');}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 let fileEnv={};try{fileEnv=parseEnv(await readFile(root+'.env.supabase-local','utf8'));}catch{}
 const settings=localSettings({...fileEnv,...process.env});
 createLocalServer(settings).listen(settings.port,'127.0.0.1',()=>{
  console.log('Site public LOCAL : http://127.0.0.1:'+settings.port+'/');
  console.log('Supabase local   : '+settings.overrides['/assets/portail/backend.json'].url+' (données fictives, aucune base en ligne)');
  console.log('Commandes métier : '+(settings.overrides['/assets/business/config.json'].enabled?'activées en local':'désactivées'));
 });
}
