// Profil simplifié : en-tête de compte, raccourcis, espace professionnel replié, déconnexion en bas.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Profil : en-tête, raccourcis, espace pro replié, déconnexion en bas',()=>{
 const rt=fs.readFileSync('assets/business/runtime.mjs','utf8'),app=fs.readFileSync('assets/portail/app.js','utf8'),css=fs.readFileSync('assets/portail/fluidite.css','utf8');
 assert.match(rt,/host\.append\(tete,compte,liens,pro,fin\)/);
 for(const x of ['Mes commandes et courses','Mes favoris','Notifications','Aide et informations'])assert.match(rt,new RegExp(x));
 assert.match(rt,/connecte:\(box,u,qui\)=>entete\(tete,u,qui\),deconnexion:fin/);
 assert.match(rt,/const d=node\('details'\);d\.className='pro-replie';d\.open=!!t;/,'replié pour les clients, ouvert dès qu’une activité est choisie');
 assert.doesNotMatch(rt,/node\('nav'\);nav\.className='pf-raccourcis'/,'pas de <nav> : réservé à la barre du bas');
 assert.doesNotMatch(app,/Je suis client : voir les commerces/);assert.match(app,/await P\.monter\(zone\)/);
 assert.match(css,/\.pro-replie > summary/);assert.match(css,/\.pf-raccourci \{/);
});
