const test=require('node:test');const assert=require('node:assert/strict');const {readFileSync}=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('module GPS génère des IDs uniques pour chaque bloc',()=>{
 const source=readFileSync(path.join(root,'assets/business/position-gps.mjs'),'utf8');
 assert.match(source,/let instancePosition=0/);
 assert.match(source,/idPrefix='position-'/);
});
test('fiche commerçant : position par GPS uniquement, plus de saisie manuelle',()=>{
 const ui=readFileSync(path.join(root,'assets/business/ui.mjs'),'utf8');
 assert.doesNotMatch(ui,/\['latitude','Latitude'/);assert.doesNotMatch(ui,/x\.latitude\.value/);assert.doesNotMatch(ui,/Utiliser ma position pour ce commerce/);
 assert.match(ui,/import \{positionField,coordonneesValides\} from '\.\/position-gps\.mjs'/);assert.match(ui,/location:positionCommerce\(\)/);
});
test('aucune autre case Latitude / Longitude à remplir dans l’application publique',()=>{
 const html=readFileSync(path.join(root,'index.html'),'utf8');assert.doesNotMatch(html,/<input[^>]*(latitude|longitude)/i);
});
test('le GPS est lu en haute précision et les erreurs sont expliquées',async()=>{
 const {lirePosition}=await import(path.join(root,'assets/business/position-gps.mjs'));
 const p=await lirePosition({getCurrentPosition:(ok)=>ok({coords:{latitude:15.56,longitude:-16.21,accuracy:5}})});assert.deepEqual(p,{latitude:15.56,longitude:-16.21,precision:5});
 await assert.rejects(lirePosition({getCurrentPosition:(ok,ko)=>ko({code:1})}),/Localisation refusée/);
});
