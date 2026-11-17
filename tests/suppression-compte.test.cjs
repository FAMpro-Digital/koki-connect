'use strict';
// Suppression du compte par son titulaire (Apple, règle 5.1.1(v)) : fonction serveur, client et bouton du Profil.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
class El{constructor(t){this.tagName=t;this.children=[];this.attrs={};this.textContent='';this.value='';this.classList={add:(...c)=>{this.classes=(this.classes||[]).concat(c);}};}
 append(...c){this.children.push(...c);}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
 find(f){if(f(this))return this;for(const c of this.children){const r=c.find&&c.find(f);if(r)return r;}return null;}}
test('bouton du Profil : rien sans SUPPRIMER ; sinon suppression puis retour à l’accueil du compte',async()=>{
 globalThis.document={createElement:t=>new El(t)};globalThis.confirm=()=>true;
 const {suppressionCompte}=await import('../assets/business/ui.mjs');
 const appels=[];const api={supprimerCompte:async c=>{appels.push(c);}};const status={textContent:''};const hote=new El('div');let fini=0;
 const zone=suppressionCompte(hote,api,status,async()=>{fini++;});
 assert.equal(zone.tagName,'details');assert.equal(zone.find(e=>e.tagName==='summary').textContent,'Supprimer mon compte');
 const champ=zone.find(e=>e.tagName==='input'),bouton=zone.find(e=>e.tagName==='button');
 assert.equal(bouton.textContent,'Supprimer définitivement mon compte');
 champ.value='supprimer';await bouton.onclick();assert.equal(appels.length,0);assert.equal(status.textContent,'Saisissez SUPPRIMER pour confirmer.');
 globalThis.confirm=()=>false;champ.value='SUPPRIMER';await bouton.onclick();assert.equal(appels.length,0,'annulé à la confirmation');
 globalThis.confirm=()=>true;await bouton.onclick();assert.deepEqual(appels,['SUPPRIMER']);assert.equal(fini,1);
 assert.equal(suppressionCompte(hote,{},status),null,'sans service : rien n’est affiché');
 delete globalThis.document;delete globalThis.confirm;
});
test('client : contenus, puis photos libérées, puis compte ; message clair si la fonction n’est pas encore ouverte',()=>{
 const s=fs.readFileSync('assets/business/client.mjs','utf8');const i=s.indexOf('async supprimerCompte(');assert.ok(i>0);const f=s.slice(i,s.indexOf('\n async recover(',i));
 const ordre=["etape('contenus')","storage.from('koki-media').list(dossier","storage.from('koki-media').remove(","etape('compte')","db.auth.signOut({scope:'local'})"].map(x=>f.indexOf(x));
 assert.ok(ordre.every(x=>x>0),ordre.join());assert.deepEqual([...ordre].sort((a,b)=>a-b),ordre,'ordre des étapes');
 assert.ok(f.includes("db.rpc('koki_account_delete',{p_etape:e,p_confirmation:'SUPPRIMER'})"));assert.ok(f.includes("error.code==='PGRST202'"));
 assert.ok(fs.readFileSync('assets/business/ui.mjs','utf8').includes("sortie.classList?.add('pf-deconnexion');suppressionCompte(deconnexion||box,api,status,"));
});
test('fonction serveur : propriétaire seulement, administrateurs refusés, confirmation exigée, aucun accès visiteur',()=>{
 const sql=fs.readFileSync('database/account-deletion.sql','utf8');
 for(const x of ["security definer","set search_path to ''","actor uuid := auth.uid();","p_confirmation is distinct from 'SUPPRIMER'","from public.koki_admin_members m where m.user_id = actor","delete from auth.users where id = actor;","revoke all on function public.koki_account_delete(text, text) from public, anon;","grant execute on function public.koki_account_delete(text, text) to authenticated;"])assert.ok(sql.includes(x),x);
 assert.ok(sql.indexOf("if p_etape = 'contenus'")<sql.indexOf('delete from auth.users'));
 assert.ok(!/delete from public\.koki_records where owner_id/.test(sql),'jamais de suppression large : seulement les identifiants du compte');
 assert.ok(fs.readFileSync('suppression-compte.html','utf8').includes('<strong>Profil</strong>, puis <strong>Supprimer mon compte</strong>'));
});
