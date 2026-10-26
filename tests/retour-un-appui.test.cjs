// Retour du téléphone : un appui par écran. Régression : l'espace professionnel était monté deux fois (fiche en double, 3 appuis).
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const lire=f=>fs.readFileSync(__dirname+'/../assets/business/'+f,'utf8');
test('un seul rendu de compte et un seul montage de l’espace pro à la fois',()=>{
 assert.match(lire('ui.mjs'),/const my=\+\+gen;/);assert.match(lire('ui.mjs'),/if\(my!==gen\)return;/);
 assert.match(lire('runtime.mjs'),/host\.kokiMontage=\(host\.kokiMontage\|\|0\)\+1/);assert.match(lire('runtime.mjs'),/if\(host\.kokiMontage!==mon\)return;/);
});
test('ouverture automatique de la fiche : racine, sans entrée d’historique ni bouton retour mort',()=>{
 const s=lire('pro-space.mjs');
 assert.match(s,/go\('fiche',\{profil:intention\},\{racine:true\}\)/);
 assert.match(s,/if\(racine\)stack\.splice\(0,stack\.length,\{view,params\}\)/);
 assert.match(s,/else if\(stack\[0\]\.view==='accueil'\)bar\.append\(button\('← Retour à ma boutique'/);
 assert.match(s,/stack\[0\]\.view!=='accueil'\)\{stack\[0\]=\{view:'accueil'/);
 assert.match(s,/if\(!host\.isConnected\)return;local\.textContent=''/);
});
