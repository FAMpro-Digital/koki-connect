'use strict';
// Signaler une fiche (Apple, règle 1.2) : fonctions serveur, client et bouton de la fiche.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const MOTIFS=['Arnaque ou fraude','Contenu choquant','Produit interdit','Fausses informations','Autre'];
test('client : motifs identiques au serveur, compte exigé, message clair si la fonction n’est pas ouverte',async()=>{
 const {MOTIFS_SIGNALEMENT}=await import('../assets/business/client.mjs');
 assert.deepEqual([...MOTIFS_SIGNALEMENT],MOTIFS);
 const sql=fs.readFileSync('database/signalements-fiches.sql','utf8');
 for(const m of MOTIFS)assert.ok(sql.split("'"+m+"'").length>=3,m+' présent dans la table et la fonction');
 const s=fs.readFileSync('assets/business/client.mjs','utf8');const i=s.indexOf('async signalerFiche(');assert.ok(i>0);const f=s.slice(i,s.indexOf('\n suivre(',i));
 assert.ok(f.includes('await identity();'));assert.ok(f.includes("db.rpc('koki_record_report',{p_target:id,p_motif:motif,p_details:texte||null})"));
 assert.ok(f.includes("error.code==='PGRST202'"));assert.ok(f.includes("motif==='Autre'&&texte.length<3"));
});
test('fiche : bouton « Signaler » à côté de Partager, formulaire replié, compte demandé à l’envoi',()=>{
 const s=fs.readFileSync('assets/business/catalogue.mjs','utf8');
 assert.ok(s.includes("button('Partager',()=>partager(x),'secondary'));const [sig,zoneSig]=api.signalerFiche?signalement(x):[];"));
 const i=s.indexOf('function signalement(x){');const f=s.slice(i,s.indexOf('\n }\n',i));
 assert.ok(f.includes("zoneS.hidden=true"));assert.ok(f.includes("aria-expanded"));
 assert.ok(f.indexOf('await requireAccount();')<f.indexOf('await api.signalerFiche(x.id,motif.value,detail.value.trim());'));
});
test('serveur : comptes connectés seulement, pas sa propre fiche, limite par jour, traitement réservé et journalisé',()=>{
 const sql=fs.readFileSync('database/signalements-fiches.sql','utf8');
 for(const x of ["alter table koki_private.record_reports enable row level security;","revoke all on koki_private.record_reports from public, anon, authenticated;",
  "koki_private.is_public_listing(p_target)","if proprio = actor then","interval '1 day') >= 20","(auth.jwt()->>'is_anonymous')::boolean",
  "revoke all on function public.koki_record_report(uuid, text, text) from public, anon;","grant execute on function public.koki_record_report(uuid, text, text) to authenticated;",
  "not koki_private.allowed('commerce')","insert into public.koki_audit(","revoke all on function public.koki_record_reports_admin(text, uuid, text, text) from public, anon;",
  "on delete cascade","set search_path to ''"])assert.ok(sql.includes(x),x);
 assert.equal((sql.match(/security definer/g)||[]).length,2);
 assert.ok(!/alter table public\.|create or replace function public\.koki_business/.test(sql),'aucune table ni fonction existante modifiée');
});
