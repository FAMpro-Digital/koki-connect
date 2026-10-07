const assert=require('node:assert/strict'),C=require('../assets/portail/core.js');
const now=Date.parse('2026-10-07T12:00:00Z');const x={id:'1',type:'Actualités',titre:'Koki',resume:'Résumé',statut:'publié',publication:'2026-10-07T11:00:00Z',lieu:''};
assert.equal(C.visible(x,now),true);assert.equal(C.visible({...x,statut:'brouillon'},now),false);assert.equal(C.visible({...x,publication:'2026-10-08T00:00:00Z'},now),false);
assert.equal(C.visible({...x,type:'Publicités',actif:false},now),false);assert.equal(C.visible({...x,type:'Publicités',fin:'2026-10-07T12:00:00Z'},now),false);assert.equal(C.visible({...x,type:'Publicités',fin:'2026-10-08T12:00:00Z'},now),true);
assert.throws(()=>C.valider({...x,titre:'  '}));assert.throws(()=>C.valider({...x,publication:'invalid'}));assert.throws(()=>C.valider({...x,type:'Événements',evenement:'2026-10-08T00:00:00Z'}));assert.throws(()=>C.valider({...x,fin:x.publication}));
assert.equal(C.valider(x),x);assert.equal(C.normaliser('ÉCOLE'),'ecole');assert.equal(C.trier([x,{...x,id:'2',publication:'2026-10-07T11:30:00Z'}])[0].id,'2');
console.log('Portail : brouillons, programmation, expiration, campagnes, validation et tri vérifiés.');
