const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const c=fs.readFileSync('assets/business/client.mjs','utf8');
test('le retour de la galerie ou de l’appareil photo ne recharge pas l’espace professionnel',()=>{
  assert.match(c,/let dernierCompte=null/);
  assert.match(c,/if\(id&&id===dernierCompte\)return;dernierCompte=id;/);
  assert.match(c,/if\(event==='SIGNED_OUT'\)\{dernierCompte=null;/);
});
