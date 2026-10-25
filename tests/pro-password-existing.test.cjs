const {test}=require('node:test');
const assert=require('node:assert/strict');
test('professionnels existants sans marqueur : aucun nouveau mot de passe imposé',async()=>{
 const {premiereCreationSansMotDePasse:ask}=await import('../assets/business/intention.mjs');
 const legacy={id:'legacy',user_metadata:{}};
 for(const type of [null,'commercant','prestataire','chauffeur']){
  assert.equal(ask(type,legacy,[{id:'professionnel'}],[]),false);
  assert.equal(ask(type,legacy,[],[{id:'chauffeur'}]),false);
 }
 assert.equal(ask(null,legacy,[],[]),false);
});
test('première création professionnelle : mot de passe toujours requis',async()=>{
 const {premiereCreationSansMotDePasse:ask}=await import('../assets/business/intention.mjs');
 for(const type of ['commercant','prestataire','chauffeur']){
  assert.equal(ask(type,{user_metadata:{}},[],[]),true);
  assert.equal(ask(type,{user_metadata:{professional_password_set:true}},[],[]),false);
 }
});
