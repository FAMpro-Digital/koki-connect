// Barre du bas : Accueil, Transport, Boutique, Activité, Profil ; page Activité.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),nav=fs.readFileSync('assets/portail/navigation.js','utf8'),act=fs.readFileSync('assets/portail/activite.js','utf8'),rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
test('barre du bas : 5 onglets utiles, plus de Carte / Publier / Favoris',()=>{
 const barre=html.slice(html.indexOf('<nav aria-label="Navigation principale">'),html.indexOf('</nav>',html.indexOf('<nav aria-label="Navigation principale">')));
 assert.deepEqual([...barre.matchAll(/data-nav="([a-z]+)"/g)].map(m=>m[1]),['accueil','transport','boutique','activite','profil']);
 assert.match(barre,/onclick="afficherTransport\(\)"/);assert.match(barre,/onclick="afficherCommerce\(\)"/);assert.match(barre,/onclick="KokiActivite\.ouvrir\(\)"/);
 assert.doesNotMatch(barre,/Publier|Favoris|afficherCarte/);
 assert.match(html,/onclick="afficherCarte\(\)"/,'la carte reste accessible depuis l’accueil');
 assert.match(html,/KokiPortail\.admin\(\)/,'publier reste accessible depuis le menu');
});
test('onglet actif : Activité couvre favoris, livres et notifications',()=>{
 assert.match(nav,/courante === 'vue-notifications' \|\| \(courante === 'vue-portail' && \/\^\(Activité\|Favoris\|📥 Mes livres\)\/\.test\(t\)\) \? 'activite'/);
 assert.match(nav,/const actif = b\.dataset\.nav === onglet;/);
});
test('Activité : course en cours, commandes, demandes du compte connecté ; raccourcis hors connexion',()=>{
 assert.match(rt,/const uid=api\.user\?\.id,lire=async k=>\{try\{return \(await api\.history\(k\)\)\.filter\(r=>r\.client_id===uid\);\}catch\{return \[\];\}\};/);
 assert.match(rt,/window\.KokiBusiness=\{show,catalogueRecherche,ouvrirFiche,activite,/);
 assert.match(act,/if\(!a\.connecte\)/);assert.match(act,/KokiBibliotheque\.mesLivres\(\)/);assert.match(act,/KokiPortail\.favoris\(\)/);assert.match(act,/afficherNotifications\(\)/);
 assert.doesNotMatch(act,/innerHTML/);
 assert.ok(html.indexOf('assets/portail/activite.js')>html.indexOf('assets/portail/app.js"'));
});
