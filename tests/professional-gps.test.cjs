const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/commerce/app.js'),'utf8');
const position=source.slice(source.indexOf('  async function position('),source.indexOf('  function commander('));
const restore=source.slice(source.indexOf('  function profilRemplir('),source.indexOf('  async function sauverProfil('));
function setup(fail=false){
 const fields={};
 const $=id=>fields[id]??=( {value:'',children:[],append(o){this.children.push(o);},querySelector(){return this.children.find(o=>o.value==='gps');}} );
 const context={$,node:(tag,text)=>({tag,text}),msg(){},etat:{profil:{localisation:{id:'gps',latitude:15.56,longitude:-16.21}}},obtenirPositionActuelle:async()=>{if(fail)throw Error('Localisation refusée');return {coords:{latitude:15.56,longitude:-16.21}};}};
 vm.createContext(context);vm.runInContext(position+restore,context);
 return {context,$};
}
test('GPS professionnel : coordonnées sélectionnées et option sans doublon',async()=>{
 const {context,$}=setup();
 await context.position('professionnel');await context.position('professionnel');
 assert.equal($('pro-lieu').value,'gps');
 assert.equal($('pro-lieu')._gps.latitude,15.56);
 assert.equal($('pro-lieu').children.length,1);
});
test('GPS professionnel : restauration après rechargement et refus sans écrasement',async()=>{
 const {context,$}=setup(true);
 context.profilRemplir();context.profilRemplir();
 await context.position('professionnel');
 assert.equal($('pro-lieu').value,'gps');
 assert.equal($('pro-lieu')._gps.longitude,-16.21);
 assert.equal($('pro-lieu').children.length,1);
});
