// Corrections du 14/10/2026 : messages hors connexion, demandes en attente conservées, message Transport à jour.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const client=fs.readFileSync('assets/business/client.mjs','utf8'),rt=fs.readFileSync('assets/business/runtime.mjs','utf8'),tr=fs.readFileSync('assets/transport/app.js','utf8'),html=fs.readFileSync('index.html','utf8');
test('hors connexion : jamais « TypeError: Failed to fetch » à l’écran',()=>{
 const re=/Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|AuthRetryableFetchError/i;
 for(const m of ['TypeError: Failed to fetch','NetworkError when attempting to fetch resource.','Load failed','AuthRetryableFetchError'])assert.ok(re.test(m),m);
 assert.match(client,/const e=Error\(HORS_LIGNE\.test\(String\(error\.message\|\|''\)\)\?MESSAGE_HORS_LIGNE:/);
 assert.doesNotMatch(rt,/node\('p',e\.message\)/);assert.match(rt,/catalog\.replaceChildren\(node\('p',lisible\(e\)\)\)/);
});
test('coupure pendant la vérification du compte : la demande en attente n’est pas effacée',()=>{
 assert.match(client,/if\(error&&HORS_LIGNE\.test\(String\(error\.message\|\|error\.name\|\|''\)\)\)\{const e=Error\(MESSAGE_HORS_LIGNE\);e\.horsLigne=true;throw e;\}if\(error\|\|!data\?\.user/);
});
test('Transport : changer de lieu efface l’ancien message ; plus d’alerte de test « Autour de moi »',()=>{
 assert.match(tr,/etat\.choisi=null; message\(''\); actualiser\(\);/);
 assert.doesNotMatch(html,/La fonction Autour de moi fonctionne/);
});
