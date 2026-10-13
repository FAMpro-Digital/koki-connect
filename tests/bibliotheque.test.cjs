const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const L=require('../assets/portail/livre-contract.js'),H=require('../assets/portail/livres-hors-ligne.js');

const base={categorie:'Scolaire',niveau:'3e',format:'PDF',acces:'Gratuit',prix:0,auteur:'Collectif',fournisseur:'Bibliothèque',whatsapp:'',description:'Annales',fichier:'1111-aaaa/2222-bbbb.pdf',taille_mo:12,archive:false};
const row=texte=>({id:'1111',type:'Informations utiles',categorie:'Éducation',titre:'Annales BFEM',resume:'Sujets corrigés',statut:'publié',publication:'2026-10-01T00:00:00Z',texte});

test('Contrat livre : gratuit, payant et refus',()=>{
  const ok=L.decode(row(L.encode(base)));assert.equal(ok.acces,'Gratuit');assert.equal(L.telechargeable(ok),true);
  const paye=L.decode(row(L.encode({...base,acces:'Payant',prix:2000,whatsapp:'77 000 00 00'})));
  assert.equal(paye.prix,2000);assert.equal(paye.fichier,'','un livre payant ne publie jamais son fichier');assert.equal(L.telechargeable(paye),false);
  assert.throws(()=>L.encode({...base,acces:'Payant',prix:0}),/prix/);
  assert.throws(()=>L.encode({...base,fichier:'../secret.pdf'}),/Fichier invalide/);
  assert.throws(()=>L.encode({...base,taille_mo:60}),/50 Mo/);
  // Un JSON modifié à la main pour exposer le fichier d'un livre payant est ignoré.
  assert.equal(L.decode(row(JSON.stringify({schema:L.marker,version:1,...base,acces:'Payant',prix:1500}))),null);
  assert.equal(L.decode({...row(L.encode(base)),categorie:'Sport'}),null);
  assert.equal(L.decode(row('{"schema":"koki.education.school","version":1}')),null);
  assert.equal(L.prix(12500),'12 500 FCFA');
});

test('Filtre Bibliothèque : accès, catégorie et recherche',()=>{
  const items=[{row:{titre:'Annales BFEM',resume:''},livre:{...base}},{row:{titre:'Philosophie BAC',resume:''},livre:{...base,acces:'Payant',prix:3500,fichier:'',niveau:'Terminale'}},{row:{titre:'Couture',resume:''},livre:{...base,categorie:'Formation pro'}}];
  assert.equal(L.filtrer(items,{acces:'Gratuit'}).length,2);assert.equal(L.filtrer(items,{acces:'Payant'}).length,1);
  assert.equal(L.filtrer(items,{categorie:'Formation pro'}).length,1);assert.equal(L.filtrer(items,{q:'terminale'}).length,1);
});

function fakeEnv(){const store=new Map(),ls=new Map();const cache={put:async(k,r)=>{store.set(k,await r.blob());},match:async k=>store.has(k)?new Response(store.get(k)):undefined,delete:async k=>store.delete(k)};
  return {store,env:{caches:{open:async()=>cache},storage:{getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>ls.set(k,v)},navigator:{storage:{persist:async()=>true,estimate:async()=>({quota:1e9})}}}};}

test('Hors ligne : téléchargement avec progression, lecture, suppression',async()=>{
  const {store,env}=fakeEnv();const data=new Uint8Array(3000).fill(7);
  H._env({...env,fetch:async()=>new Response(data,{headers:{'content-type':'application/pdf','content-length':'3000'}})});
  const vus=[];const meta=await H.telecharger('1111',{titre:'Annales',format:'PDF'},'https://x.supabase.co/f',{onProgress:(r,t)=>vus.push([r,t])});
  assert.equal(meta.octets,3000);assert.ok(vus.length>0);assert.deepEqual(vus.at(-1),[3000,3000]);
  assert.equal(H.present('1111'),true);assert.equal(H.liste()[0].titre,'Annales');
  const f=await H.ouvrir('1111');assert.equal(f.blob.size,3000);
  assert.equal((await H.espace()).octets,3000);
  await H.supprimer('1111');assert.equal(H.present('1111'),false);assert.equal(store.size,0);
});

test('Hors ligne : refus du type, de la taille et des identifiants',async()=>{
  const {env}=fakeEnv();
  H._env({...env,fetch:async()=>new Response('<html>',{headers:{'content-type':'text/html'}})});
  await assert.rejects(H.telecharger('2222',{},'u'),/Type de fichier/);
  H._env({...env,fetch:async()=>new Response(new Uint8Array(10),{headers:{'content-type':'application/pdf','content-length':String(100*1024*1024)}})});
  await assert.rejects(H.telecharger('2222',{},'u'),/trop lourd/);
  H._env({...env,fetch:async()=>new Response(new Uint8Array(2*1024*1024),{headers:{'content-type':'audio/mpeg'}})});
  await assert.rejects(H.telecharger('2222',{},'u',{limiteMo:1}),/trop lourd/);
  await assert.rejects(H.telecharger('../x',{},'u'),/invalide/);
  assert.equal(H.present('2222'),false);
});

test('Flux : lien de livre signé seulement pour koki-livres et les formats autorisés',async()=>{
  const calls=[];const ctx={URL,AbortSignal,fetch:async(url,o)=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('backend.json')?{url:'https://qsbmzzbiztfqysstepxm.supabase.co',publishableKey:'sb_publishable_test'}:{signedURL:'/object/sign/koki-livres/1111/2222.pdf?token=t'}};}};
  vm.runInNewContext(fs.readFileSync('assets/portail/feed.js','utf8'),ctx);
  assert.equal(await ctx.KokiPublicFeed.signerFichier('1111/2222.pdf'),'https://qsbmzzbiztfqysstepxm.supabase.co/storage/v1/object/sign/koki-livres/1111/2222.pdf?token=t');
  assert.match(calls.at(-1),/\/storage\/v1\/object\/sign\/koki-livres\/1111\/2222\.pdf$/);
  await assert.rejects(ctx.KokiPublicFeed.signerFichier('../autre/x.pdf'),/non disponible/);
  await assert.rejects(ctx.KokiPublicFeed.signerFichier('1111/2222.exe'),/non disponible/);
});

test('Application : Bibliothèque reliée, service worker publié',()=>{
  const html=fs.readFileSync('index.html','utf8');
  for(const f of ['livre-contract.js','livres-hors-ligne.js','bibliotheque.js'])assert.ok(html.includes('assets/portail/'+f));
  assert.ok(html.includes("register('sw.js')"));
  assert.ok(fs.readFileSync('scripts/prepare-preview.mjs','utf8').includes("'sw.js'"));
  const sw=fs.readFileSync('sw.js','utf8');assert.ok(!sw.includes('supabase.co'));assert.ok(sw.includes('url.origin!==self.location.origin'));
  for(const f of ['assets/portail/bibliotheque.js','assets/portail/app.js','sw.js'])new vm.Script(fs.readFileSync(f,'utf8'));
});
