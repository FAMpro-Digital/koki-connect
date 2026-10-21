// Événements : contrat commun, agenda (périodes, en cours, terminés retirés), fiche, ajout à l'agenda.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('../assets/portail/evenement-contract.js');const E=globalThis.KokiEvenementContract;
const EMPREINTE='542e25f1dcb67155c94d5935323cbe6d08f409654463fb8dcc8ba1345bcc0303';
const now=Date.parse('2026-10-15T10:00:00Z');
const row=(debut,v={})=>({id:'e1',type:'Événements',titre:'Magal',resume:'Cérémonie',lieu:'Grande mosquée',statut:'publié',evenement:debut,texte:v===null?'Texte libre':E.encode(v)});
test('contrat Événement : identique dans l’administration',()=>{assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/portail/evenement-contract.js')).digest('hex'),EMPREINTE);});
test('états et libellés : aujourd’hui, demain, en cours, terminé',()=>{
 const r=row('2026-10-15T08:00:00Z'),v=E.decode(r);
 assert.equal(E.etat(r,v,now),'En cours');assert.equal(E.quand(r,v,now),'En cours');assert.equal(E.termine(row('2026-10-15T05:00:00Z'),v,now),true);
 assert.equal(E.quand(row('2026-10-15T18:00:00Z'),v,now),'Aujourd’hui · 18:00');assert.equal(E.quand(row('2026-10-16T17:00:00Z'),v,now),'Demain · 17:00');
 assert.match(E.quand(row('2026-10-19T17:00:00Z'),v,now),/^Lundi · 17:00$/);
 assert.equal(E.etat(row('pas une date',null),null,now),'Sans date');
});
test('fichier agenda : début, fin, rappel 2 h avant, caractères échappés',()=>{
 const ics=E.ics({...row('2026-10-16T18:00:00Z'),titre:'Fête, danse; joie'},E.decode(row('2026-10-16T18:00:00Z',{fin:'2026-10-16T23:30:00Z'})));
 assert.match(ics,/^BEGIN:VCALENDAR\r\n/);assert.match(ics,/DTEND:20261016T233000Z/);assert.match(ics,/SUMMARY:Fête\\, danse\\\; joie/);assert.match(ics,/TRIGGER:-PT2H/);
});
test('application : agenda dédié, événements terminés ou archivés retirés partout',()=>{
 const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('assets/portail/app.js','utf8'),ev=fs.readFileSync('assets/portail/evenements.js','utf8');
 assert.match(html,/<script defer src="assets\/portail\/evenement-contract\.js"><\/script>\s*<script defer src="assets\/portail\/evenements\.js"><\/script>/);
 assert.match(app,/function evenementPasse\(x\)/);assert.match(app,/!offreFermee\(x\)&&!evenementPasse\(x\)/);
 assert.match(app,/if\(type==='Événements'&&window\.KokiEvenements\)\{KokiEvenements\.ouvrir\(\);return;\}/);
 assert.match(app,/if\(x\.type==='Événements'&&window\.KokiEvenements\)\{KokiEvenements\.detail\(x\);return;\}/);
 assert.doesNotMatch(ev,/innerHTML/);assert.match(ev,/Ajouter à mon agenda/);assert.match(ev,/wa\.me\/\?text=/);
 global.KokiPortailCore={visible:x=>x.statut==='publié'};const flux={contenus:[row('2026-10-15T08:00:00Z',{}),row('2026-10-20T08:00:00Z',{}),row('2026-10-14T08:00:00Z',{}),row('2026-10-21T08:00:00Z',{archive:true}),{...row('2026-10-22T08:00:00Z',{}),statut:'brouillon'},row('2026-10-25T08:00:00Z',null)]};
 global.window=global;global.document={};require('../assets/portail/evenements.js');
 assert.deepEqual(KokiEvenements.evenements(flux,now).map(x=>x.row.evenement),['2026-10-15T08:00:00Z','2026-10-20T08:00:00Z','2026-10-25T08:00:00Z']);
});
