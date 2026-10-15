// Corrections de l'audit : en-têtes de sécurité, démonstration cachée, menu aligné sur les rubriques, ancien tableau local retiré.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('en-têtes de sécurité de l’application publique',()=>{
 const v=JSON.parse(fs.readFileSync('vercel.json','utf8')),h=Object.fromEntries(v.headers[0].headers.map(x=>[x.key,x.value]));
 assert.equal(v.headers[0].source,'/(.*)');assert.match(h['Content-Security-Policy'],/frame-ancestors 'none'/);assert.match(h['Content-Security-Policy'],/object-src 'none'/);
 assert.match(h['Content-Security-Policy'],/connect-src 'self' https:\/\/qsbmzzbiztfqysstepxm\.supabase\.co wss:\/\/qsbmzzbiztfqysstepxm\.supabase\.co https:\/\/api\.open-meteo\.com/);
 assert.equal(h['X-Frame-Options'],'DENY');assert.equal(h['X-Content-Type-Options'],'nosniff');assert.match(h['Permissions-Policy'],/geolocation=\(self\)/);
});
test('menu = rubriques de l’accueil, démonstration cachée, ancien tableau local retiré',()=>{
 const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('assets/portail/app.js','utf8'),com=fs.readFileSync('assets/commerce/app.js','utf8');
 require('../assets/portail/rubriques-contract.js');const R=globalThis.KokiRubriquesContract;
 const bloc=html.slice(html.indexOf('id="vue-menu"'),html.indexOf('id="titre-a-propos"'));const menu=[...bloc.matchAll(/data-rubrique="([^"]+)"/g)].map(m=>m[1].replace('&amp;','&'));assert.deepEqual(menu,R.rubriques.map(r=>r.nom),'même ordre que l’accueil');
 assert.match(html,/<div class="market-demo" hidden>/);assert.match(com,/get\('demo'\)==='1'/);
 assert.doesNotMatch(app,/Mes anciens brouillons sur cet appareil/);assert.doesNotMatch(html,/Tableau de bord des contenus/);
 assert.match(app,/\.menu-liens \[data-rubrique\]/,'rubrique masquée : aussi retirée du menu');
});
