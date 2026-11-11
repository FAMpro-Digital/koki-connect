const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const app=fs.readFileSync('assets/portail/app.js','utf8');
test('« Commenter » attend la fin du réaffichage puis va sur les commentaires',()=>{
  assert.match(app,/function apresAffichage\(fn\)\{requestAnimationFrame\(\(\)=>requestAnimationFrame/);
  assert.match(app,/if\(focusComments\)apresAffichage\(/);
  assert.doesNotMatch(app,/if\(focusComments\)\{section\.scrollIntoView/);
});
