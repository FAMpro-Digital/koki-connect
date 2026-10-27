const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const app=fs.readFileSync('assets/portail/app.js','utf8');
test('fermer une publication ne réutilise plus la position de la liste sur l’accueil',()=>{
  assert.match(app,/KokiNavigation\?\.profondeur\?\.\(\)===1/);
  assert.doesNotMatch(app,/window\.scrollTo\(0,scroll\)/);
});
