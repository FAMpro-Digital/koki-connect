const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
test('un professionnel voit ses options avant les raccourcis clients',()=>{
  assert.match(rt,/aFichePro=fiches\.length>0\|\|chauffeurs\.length>0/);
  assert.match(rt,/if\(aFichePro\)pro\.after\(liens\);else compte\.after\(liens\)/);
});
