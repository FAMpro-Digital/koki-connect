// Photos : jusqu'à 10 Mo à l'import partout dans l'application publique, réduites automatiquement avant envoi.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),commerce=fs.readFileSync('assets/commerce/app.js','utf8'),portail=fs.readFileSync('assets/portail/app.js','utf8'),traitement=fs.readFileSync('assets/business/image-processing.mjs','utf8');
test('aucune limite de 1 Mo à l’import dans l’interface',()=>{
 for(const [nom,src] of [['index.html',html],['commerce',commerce],['portail',portail]])assert.doesNotMatch(src,/1 Mo maximum|size>1024\*1024/,nom);
 assert.match(traitement,/MAX_INPUT=10\*1024\*1024/);
});
test('anciens formulaires : compression automatique et formats de téléphone acceptés',()=>{
 for(const src of [commerce,portail])assert.match(src,/import\(new URL\('assets\/business\/image-processing\.mjs',document\.baseURI\)\.href\)/);
 for(const id of ['market-besoin-photo','market-pro-logo','market-offre-photo']){const m=new RegExp('<label for="'+id+'">([^<]+)</label><input id="'+id+'" type="file" accept="([^"]+)"').exec(html);assert.ok(m,id);assert.match(m[1],/10 Mo maximum/);assert.match(m[2],/image\/heic/);}
});
