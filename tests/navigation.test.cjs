// Navigation façon application : étapes d'historique par page, retour du téléphone, Accueil, animations, toucher.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('module de navigation chargé après les pages, avec sa feuille de style',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(html.indexOf('assets/portail/navigation.js')>html.indexOf('assets/portail/app.js'),'après les pages du portail');
 assert.match(html,/<link rel="stylesheet" href="assets\/portail\/fluidite\.css">/);
 new (require('node:vm').Script)(fs.readFileSync('assets/portail/navigation.js','utf8'));
});
test('retour du téléphone : page précédente restaurée ; Accueil : toutes les étapes remontées',()=>{
 const js=fs.readFileSync('assets/portail/navigation.js','utf8');
 assert.match(js,/history\.pushState = function \(etat, t, u\) \{ pas\+\+; return pousser\(\{ \.\.\.\(etat \|\| \{\}\), kokiPas: pas \}, t, u\); \}/,'chaque étape numérotée, y compris boutique et espace pro');
 assert.match(js,/window\.addEventListener\('popstate'/);assert.match(js,/vue\.replaceChildren\(\.\.\.etape\.noeuds\)/,'contenu de la page précédente réaffiché');
 assert.match(js,/history\.go\(-n\)/,'Accueil remonte toutes les étapes');assert.match(js,/window\.scrollTo\(0, etape\.scroll \|\| 0\)/,'position retrouvée');
 assert.match(js,/if \(cible >= pile\.length\) return;/,'retours internes laissés aux pages');
 for(const id of ['vue-transport','vue-commerce','vue-portail','vue-carte','vue-menu'])assert.ok(js.includes("'"+id+"'"),id);
});
test('fluidité : toucher immédiat, retour visuel, animations désactivables',()=>{
 const css=fs.readFileSync('assets/portail/fluidite.css','utf8');
 assert.match(css,/touch-action: manipulation/);assert.match(css,/-webkit-tap-highlight-color: transparent/);
 assert.match(css,/@keyframes koki-page-entree/);assert.match(css,/@keyframes koki-page-retour/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);assert.match(css,/aria-current="page"/);
});
