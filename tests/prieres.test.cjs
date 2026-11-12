'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../assets/portail/prieres.js');
const entre=(v,a,b,nom)=>assert.ok(v>=a&&v<=b,nom+' = '+P.texte(v)+' hors de '+P.texte(a)+'–'+P.texte(b));
test('Koki, 11 novembre : horaires plausibles et dans l’ordre',()=>{
 const h=P.calculer(new Date('2026-11-11T12:00:00Z'));
 entre(h.fajr,5*60+40,6*60+5,'Fajr');entre(h.lever,6*60+55,7*60+15,'Lever');entre(h.dhuhr,12*60+42,12*60+56,'Dhuhr');
 entre(h.asr,15*60+50,16*60+15,'Asr');entre(h.maghrib,18*60+20,18*60+40,'Maghrib');entre(h.isha,19*60+25,19*60+50,'Isha');
 assert.ok(h.fajr<h.lever&&h.lever<h.dhuhr&&h.dhuhr<h.asr&&h.asr<h.maghrib&&h.maghrib<h.isha);
});
test('Koki, 21 juin : journée plus longue',()=>{
 const h=P.calculer(new Date('2026-06-21T12:00:00Z')),n=P.calculer(new Date('2026-11-11T12:00:00Z'));
 entre(h.dhuhr,13*60,13*60+12,'Dhuhr');entre(h.maghrib,19*60+25,19*60+50,'Maghrib');entre(h.fajr,5*60,5*60+30,'Fajr');
 assert.ok(h.maghrib-h.lever>n.maghrib-n.lever+60);
});
test('prochaine prière et affichage',()=>{
 assert.equal(P.duJour(new Date('2026-11-11T03:00:00Z')).prochaine,'fajr');
 assert.equal(P.duJour(new Date('2026-11-11T14:00:00Z')).prochaine,'asr');
 assert.equal(P.duJour(new Date('2026-11-11T23:00:00Z')).prochaine,null);
 const j=P.duJour(new Date('2026-11-11T14:00:00Z'));assert.equal(j.liste.length,5);assert.match(j.liste[0].heure,/^\d\d:\d\d$/);assert.equal(P.texte(null),'—');
});
