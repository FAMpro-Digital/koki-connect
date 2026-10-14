// Non-régression : « Créer mon compte » et « Mot de passe oublié » ouvrent leur propre formulaire
// et ne valident jamais les champs de connexion (bug « Veuillez renseigner ce champ »).
const test=require('node:test'),assert=require('node:assert/strict');
class El{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.value='';this.required=false;this.minLength=-1;this.type='';this.validations=0;}
 get isConnected(){return true;}
 set textContent(t){this.children=[String(t)];}
 get textContent(){return this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
 append(...xs){for(const x of xs){if(x&&typeof x==='object'){x.parent?.children&&x.parent!==this&&(x.parent.children=x.parent.children.filter(c=>c!==x));x.parent=this;}this.children.push(typeof x==='object'?x:String(x));}}
 replaceChildren(...xs){this.children=[];this.append(...xs);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}
 *descendants(){for(const c of this.children)if(typeof c==='object'){yield c;yield* c.descendants();}}
 valid(){if(!['INPUT','TEXTAREA','SELECT'].includes(this.tagName))return true;if(this.required&&this.value==='')return false;if(this.type==='email'&&this.value&&!/^[^@\s]+@[^@\s]+$/.test(this.value))return false;if(this.minLength>0&&this.value&&this.value.length<this.minLength)return false;return true;}
 reportValidity(){this.validations++;return this.tagName==='FORM'?[...this.descendants()].every(e=>e.valid()):this.valid();}
}
function setup(api){
 globalThis.document={createElement:t=>new El(t)};globalThis.location={search:'',origin:'https://koki-connect.vercel.app',pathname:'/',href:'https://koki-connect.vercel.app/'};globalThis.window=globalThis.window||{};
 const host=new El('section');return {host};
}
const tick=()=>new Promise(r=>setTimeout(r,0));
const all=host=>[...host.descendants()];
const bouton=(host,label)=>all(host).find(e=>e.tagName==='BUTTON'&&e.textContent===label);
const formulaire=(host,vue)=>all(host).find(e=>e.tagName==='FORM'&&e.dataset.vue===vue);
const champ=(f,label)=>[...f.descendants()].find(e=>e.attributes['aria-label']===label);
const envoyer=async f=>{await f.onsubmit({preventDefault(){}});await tick();};
function fauxApi(){const appels=[];return {appels,enabled:true,pending:()=>[],subscribe:()=>()=>{},
 identity:async()=>{throw Error('Connectez-vous');},login:async(e,p)=>{appels.push(['login',e,p]);throw Error('Connexion refusée. Vérifiez vos identifiants.');},
 signup:async(e,p)=>{appels.push(['signup',e,p]);},recover:async(e,u)=>{appels.push(['recover',e,u]);},sendCode:async()=>'+221770000000'};}
async function monter(){const api=fauxApi();const {host}=setup(api);const {accountPanel}=await import('../assets/business/ui.mjs');const status=accountPanel(host,api,async()=>{});await tick();return {api,host,status};}

test('« Créer mon compte » ouvre le formulaire d’inscription sans valider la connexion',async()=>{
 const {api,host}=await monter();const connexion=formulaire(host,'connexion');assert.ok(connexion,'formulaire de connexion affiché');
 const b=bouton(host,'Créer mon compte');assert.equal(b.type,'button','pas un bouton d’envoi');assert.ok(![...connexion.descendants()].includes(b),'hors du formulaire de connexion');
 b.onclick();await tick();
 assert.equal(connexion.validations,0,'aucun « Veuillez renseigner ce champ » sur la connexion');
 assert.ok(formulaire(host,'inscription'),'formulaire d’inscription ouvert');assert.equal(formulaire(host,'connexion'),undefined);assert.deepEqual(api.appels,[]);
});
test('inscription : contrôles propres (12 caractères, confirmation) puis création du compte',async()=>{
 const {api,host,status}=await monter();bouton(host,'Créer mon compte').onclick();await tick();
 let f=formulaire(host,'inscription');
 await envoyer(f);assert.deepEqual(api.appels,[],'champs vides : rien envoyé');
 champ(f,'Adresse e-mail').value='awa@exemple.sn';champ(f,'Mot de passe (12 caractères minimum)').value='court';champ(f,'Confirmer le mot de passe').value='court';
 await envoyer(f);assert.deepEqual(api.appels,[]);
 champ(f,'Mot de passe (12 caractères minimum)').value='motdepasse-solide';champ(f,'Confirmer le mot de passe').value='autre-motdepasse';
 await envoyer(f);assert.deepEqual(api.appels,[]);assert.match(status.textContent,/ne correspondent pas/);
 champ(f,'Confirmer le mot de passe').value='motdepasse-solide';await envoyer(f);
 assert.deepEqual(api.appels,[['signup','awa@exemple.sn','motdepasse-solide']]);assert.match(status.textContent,/consultez votre e-mail/);
 assert.ok(formulaire(host,'connexion'),'retour à la connexion après inscription');assert.equal(champ(formulaire(host,'connexion'),'Adresse e-mail').value,'awa@exemple.sn','adresse reprise');
});
test('« Se connecter » valide et envoie seulement le formulaire de connexion',async()=>{
 const {api,host,status}=await monter();const f=formulaire(host,'connexion');
 await envoyer(f);assert.deepEqual(api.appels,[],'champs vides : connexion bloquée par le navigateur');
 champ(f,'Adresse e-mail').value='awa@exemple.sn';champ(f,'Mot de passe').value='motdepasse-solide';await envoyer(f);
 assert.deepEqual(api.appels,[['login','awa@exemple.sn','motdepasse-solide']]);assert.match(status.textContent,/Connexion refusée/);assert.equal(champ(f,'Mot de passe').value,'','mot de passe effacé');
});
test('« Mot de passe oublié » ouvre son formulaire, envoie le lien de récupération, retour possible',async()=>{
 const {api,host,status}=await monter();const connexion=formulaire(host,'connexion');champ(connexion,'Adresse e-mail').value='awa@exemple.sn';
 bouton(host,'Mot de passe oublié').onclick();await tick();assert.equal(connexion.validations,0);
 const f=formulaire(host,'oubli');assert.equal(champ(f,'Adresse e-mail du compte').value,'awa@exemple.sn','adresse reprise');
 await envoyer(f);assert.equal(api.appels[0][0],'recover');assert.equal(api.appels[0][1],'awa@exemple.sn');assert.match(api.appels[0][2],/^https:\/\/koki-connect\.vercel\.app\/\?koki-recovery=1$/);
 assert.match(status.textContent,/lien de récupération/);
 bouton(host,'Retour à la connexion').onclick();await tick();assert.ok(formulaire(host,'connexion'));
});
test('espace chauffeur : libellés en français (« Ajouter un véhicule »)',()=>{
 const ui=require('node:fs').readFileSync('assets/business/ui.mjs','utf8');
 assert.doesNotMatch(ui,/'Ajouter '\+kind|'Gérer '\+kind/,'plus de « Ajouter vehicules »');assert.match(ui,/vehicules:'un véhicule'/);
});
