// Animation au toucher des boutons : script chargé, aucune règle qui modifie les boutons eux-mêmes, respect de « moins d'animations ».
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),js=fs.readFileSync(__dirname+'/../assets/portail/touches.js','utf8'),css=fs.readFileSync(__dirname+'/../assets/portail/fluidite.css','utf8');
test('le script est chargé après la navigation et se compile',()=>{
 assert.ok(html.indexOf('assets/portail/touches.js')>html.indexOf('assets/portail/navigation.js'));
 new (require('node:vm').Script)(js);
});
test('l\'onde ne modifie pas les boutons et ignore les éléments désactivés',()=>{
 assert.ok(!/el\.style\./.test(js),'le bouton ne doit pas être modifié');
 assert.ok(/disabled/.test(js)&&/aria-disabled/.test(js));
 assert.ok(/pointerdown/.test(js)&&/pointercancel/.test(js));
});
test('« moins d\'animations » désactive l\'effet',()=>{
 assert.ok(/prefers-reduced-motion:\s*reduce/.test(js));
 assert.ok(/@media \(prefers-reduced-motion: reduce\)[^}]*koki-touche/.test(css));
});
