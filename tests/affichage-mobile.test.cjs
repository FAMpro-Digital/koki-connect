'use strict';
// Affichage mobile du site (et de l'application Android, qui l'affiche) : barre du haut vert foncé,
// barre du bas au-dessus de la barre d'accueil iPhone / de gestes, rien sous l'encoche.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('site : plein écran, couleurs Koki Connect, marges des zones sûres',()=>{
 const h=fs.readFileSync('index.html','utf8')+fs.readFileSync('assets/portail/accueil-base.css','utf8');
 assert.ok(h.includes('content="width=device-width, initial-scale=1.0, viewport-fit=cover"'));
 assert.ok(h.includes('<meta name="theme-color" content="#0b5a3c">'));
 assert.ok(h.includes('padding-bottom: calc(85px + env(safe-area-inset-bottom, 0px));'));
 assert.ok(h.includes('calc(18px + env(safe-area-inset-bottom, 0px))'));
 assert.equal(JSON.parse(fs.readFileSync('manifest.webmanifest','utf8')).theme_color,'#0b5a3c');
});
