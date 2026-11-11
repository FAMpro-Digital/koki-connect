const test=require('node:test'),assert=require('node:assert'),fs=require('fs');
test('le village se saisit librement',()=>{
 const s=fs.readFileSync('assets/business/pro-space.mjs','utf8');
 assert.ok(!s.includes('Choisissez une suggestion'));
 assert.equal((s.match(/ce n’est pas obligatoire/g)||[]).length,2);
});
test('le champ s’appelle Localité',()=>{
 for(const f of ['assets/business/pro-space.mjs','assets/business/catalogue.mjs'])assert.ok(!fs.readFileSync(f,'utf8').includes('Village ou quartier'),f);
});
