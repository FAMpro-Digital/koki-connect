// Accueil : tuiles lisibles, « Voir plus » uniformes, Urgences, « Reprendre », « À la une », météo gardée, en-tête.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const lire=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
const html=lire('index.html'),css=lire('assets/portail/accueil-plus.css'),js=lire('assets/portail/accueil-plus.js'),accueil=lire('assets/portail/accueil.js'),app=lire('assets/portail/app.js'),act=lire('assets/portail/activite.js');
test('les fichiers sont chargés et compilés',()=>{
 assert.ok(html.includes('assets/portail/accueil-plus.css')&&html.includes('assets/portail/accueil-plus.js'));
 for(const f of ['accueil-plus.js','accueil.js','app.js','activite.js'])new (require('node:vm').Script)(lire('assets/portail/'+f));
});
test('tuiles : plus de coupure au milieu des mots',()=>{
 assert.match(css,/\.raccourci strong\s*\{[^}]*overflow-wrap:\s*normal\s*!important/);
 assert.doesNotMatch(css,/\.raccourci strong\s*\{[^}]*overflow-wrap:\s*anywhere/);
});
test('« Voir plus » : même libellé partout, à droite du titre',()=>{
 assert.doesNotMatch(html,/Voir toutes les (actualités|annonces)/);
 assert.match(css,/\.portail-title\s*\{[^}]*justify-content:\s*space-between/);
});
test('Urgences : bouton rouge sous la recherche, action déjà enregistrée',()=>{
 assert.match(html,/class="urgences-bouton"[^>]*data-clic="afficherRubrique\(Numéros utiles\)"/);
 assert.ok(html.indexOf('urgences-bouton')>html.indexOf('class="search"')&&html.indexOf('urgences-bouton')<html.indexOf('id="portail-recherche"'));
});
test('Reprendre : seulement avec une session présente, sans nouvelle donnée envoyée',()=>{
 assert.match(js,/koki-public-auth/);assert.match(js,/KokiBusiness\.activite\(\)/);assert.match(act,/enCours/);
 assert.match(act,/Object\.freeze\(\{ouvrir,enCours\}\)/);
});
test('À la une : masquée sans contenu (classe, pas l\'attribut hidden que la navigation réinitialise), 5 éléments au plus, défilement coupé si « moins d\'animations »',()=>{
 assert.match(html,/id="accueil-une"/);assert.match(html,/class="section une-vide" id="accueil-une"/);
 assert.match(app,/slice\(0,5\)[\s\S]{0,120}une-vide/);assert.match(css,/#accueil-une\.une-vide\s*\{[^}]*display:\s*none\s*!important/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.ok(html.indexOf('id="accueil-une"')<html.indexOf('id="tableau-de-bord"'),'sous la recherche, avant les tuiles');
});
test('météo : dernière valeur gardée 12 h avec son heure',()=>{
 assert.match(accueil,/localStorage\.setItem\('koki\.meteo'/);assert.match(accueil,/12 \* 3600 \* 1000/);assert.match(accueil,/'Dernière météo connue/);
});
test('en-tête : profil en icône, pastille de notifications remise à zéro à l\'ouverture',()=>{
 assert.doesNotMatch(html,/aria-label="Profil utilisateur"[^>]*>👤</);
 assert.match(html,/id="pastille-notifs"/);assert.match(app,/koki\.notifs\.vu/);assert.match(accueil,/koki\.notifs\.vu/);
});
