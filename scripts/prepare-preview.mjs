import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=root+'dist/';await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});for(const name of ['index.html','conditions.html','confidentialite.html','suppression-compte.html','tests-application.html','assets','favicon.ico','manifest.webmanifest','sw.js'])await cp(root+name,dist+name,{recursive:true});await writeFile(dist+'.vercelignore','tests\nwork\n');const backend=JSON.parse(await readFile(dist+'assets/portail/backend.json','utf8'));
// Environnement de test (préproduction) : KOKI_ENV=test, KOKI_TEST_URL, KOKI_TEST_PUBLISHABLE_KEY.
// La copie publiable vise alors la base de test ; les bases protégées (production) sont refusées.
const PROTEGEES=['qsbmzzbiztfqysstepxm','paegdthtusbwxuarhacb'];
const KOKI_ENV=process.env.KOKI_ENV||'';
if(KOKI_ENV&&!['test','production'].includes(KOKI_ENV))throw Error('KOKI_ENV doit valoir test ou production.');
if(KOKI_ENV==='test'){
 const url=process.env.KOKI_TEST_URL||'',key=process.env.KOKI_TEST_PUBLISHABLE_KEY||'';
 const ref=(/^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(url)||[])[1];
 if(!ref)throw Error('Test : KOKI_TEST_URL doit être une adresse https://<référence>.supabase.co.');
 if(PROTEGEES.includes(ref))throw Error('Test : la base de production est interdite.');
 if(!key.startsWith('sb_publishable_'))throw Error('Test : seule une clé publishable est acceptée.');
 backend.url=url;backend.publishableKey=key;
 await writeFile(dist+'assets/portail/backend.json',JSON.stringify(backend));
 const vercel=(await readFile(root+'vercel.json','utf8')).replaceAll(PROTEGEES[0],ref);
 if(PROTEGEES.some(r=>vercel.includes(r)))throw Error('Test : une référence de production subsiste dans la configuration.');
 await writeFile(dist+'vercel.json',vercel);
 console.log('Environnement de test : base '+ref+' (production exclue).');
}else if(KOKI_ENV==='production'&&!String(backend.url).includes(PROTEGEES[0]))throw Error('Production : seule la base de production est acceptée.');
if(backend.local===true||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(backend.url))throw Error('La version publiable doit viser un Supabase en ligne (https://<référence>.supabase.co), jamais le Supabase local.');const flag=JSON.parse(await readFile(dist+'assets/business/config.json','utf8'));// Activations autorisées : Commerces & Services (13/10/2026), Transport (14/10/2026). Chaque rubrique doit être déclarée explicitement.
if(flag.enabled&&!(typeof flag.modules?.commerce==='boolean'&&typeof flag.modules?.transport==='boolean'))throw Error('Mode métier actif : déclarez explicitement chaque rubrique (modules.commerce et modules.transport).');console.log('Préproduction statique préparée, '+(flag.enabled?'Commerces & Services '+(flag.modules.commerce?'activé':'fermé')+', Transport '+(flag.modules.transport?'activé':'fermé')+'.':'commandes métier désactivées.'));
