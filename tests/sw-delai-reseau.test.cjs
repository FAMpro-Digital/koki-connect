const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const sw=fs.readFileSync('sw.js','utf8');
test('le service worker ne bloque pas l’ouverture sur un réseau lent',()=>{
  assert.match(sw,/const DELAI_RESEAU=3000/);
  assert.match(sw,/Promise\.race\(\[reseau,patience\]\)/);
  assert.match(sw,/e\.respondWith\(repondre\(e\)\)/);
  assert.ok(!sw.includes('supabase.co'),'jamais de cache des données Supabase');
});
