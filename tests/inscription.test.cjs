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
 sendEmailLink:async(e,o)=>{appels.push(['email',e,o]);},signup:async(e,p)=>{appels.push(['signup',e,p]);},recover:async(e,u)=>{appels.push(['recover',e,u]);},sendCode:async()=>'+221770000000'};}
async function monter(){const api=fauxApi();const {host}=setup(api);const {accountPanel}=await import('../assets/business/ui.mjs');const status=accountPanel(host,api,async()=>{});await tick();return {api,host,status};}


test('email seul : inscription et reconnexion attendent la confirmation',async()=>{
 const {api,host,status}=await monter();const f=formulaire(host,'connexion');
 assert.equal(all(host).filter(e=>e.tagName==='INPUT').length,1);
 assert.equal(champ(f,'Adresse e-mail').type,'email');
 await envoyer(f);assert.deepEqual(api.appels,[]);
 champ(f,'Adresse e-mail').value='awa@exemple.sn';await envoyer(f);
 assert.deepEqual(api.appels,[['email','awa@exemple.sn',{retour:undefined}]]);
 assert.match(status.textContent,/dernier lien reçu/);assert.ok(formulaire(host,'connexion'));
 assert.ok(bouton(host,'Recevoir un nouveau lien'));
 await envoyer(f);assert.equal(api.appels.length,2);
});
test('erreur du serveur : message affiché et nouvel essai possible',async()=>{
 const {api,host,status}=await monter();api.sendEmailLink=async()=>{throw Error('Envoi indisponible');};
 const f=formulaire(host,'connexion');champ(f,'Adresse e-mail').value='awa@exemple.sn';await envoyer(f);
 assert.equal(status.textContent,'Envoi indisponible');assert.equal(bouton(host,'Recevoir mon lien de connexion').disabled,false);
});
test('lien expiré, destination conservée et session confirmée',async()=>{
 const api=fauxApi(),{host}=setup(api);let listener,user=null;const connected=[];
 api.subscribe=fn=>{listener=fn;return ()=>{};};api.identity=async()=>user;
 api.logout=async()=>{user=null;};
 const {accountPanel}=await import('../assets/business/ui.mjs');
 const status=accountPanel(host,api,async value=>connected.push(value),{retour:()=> 'https://koki-connect.vercel.app/?koki-pro=commercant',erreurLien:'Lien expiré'});
 await tick();assert.match(status.textContent,/expiré/);
 const f=formulaire(host,'connexion');champ(f,'Adresse e-mail').value='awa@exemple.sn';await envoyer(f);
 assert.equal(api.appels[0][2].retour,'https://koki-connect.vercel.app/?koki-pro=commercant');assert.deepEqual(connected,[]);
 user={id:'u1',email:'awa@exemple.sn'};listener({state:'signed-in'});await tick();
 assert.deepEqual(connected,[true]);assert.equal(formulaire(host,'connexion'),undefined);
 await bouton(host,'Déconnexion de cet appareil').onclick();await tick();assert.ok(formulaire(host,'connexion'));assert.deepEqual(connected,[true,false]);
});

for(const type of ['Commerçant','Prestataire','Chauffeur'])test(type+' : inscription avec mot de passe obligatoire',async()=>{
 const api=fauxApi(),{host}=setup(api);const {accountPanel}=await import('../assets/business/ui.mjs');
 accountPanel(host,api,async()=>{},{intention:()=>type,retour:()=>location.href,prepareRegistrationPhoto:async()=> '11111111-1111-4111-8111-111111111111'});await tick();
 assert.ok(formulaire(host,'connexion-pro'));assert.equal(bouton(host,'Recevoir mon lien de connexion'),undefined);
 await bouton(host,'Créer mon compte professionnel').onclick();await tick();
 const f=formulaire(host,'inscription');champ(f,'Adresse e-mail').value='pro@exemple.sn';
 await envoyer(f);assert.equal(api.appels.length,0);
 champ(f,'Mot de passe (8 caractères minimum)').value='Mot-de-passe-solide';champ(f,'Confirmer le mot de passe').value='autre-mot-de-passe';
 await envoyer(f);assert.equal(api.appels.length,0);
 champ(f,'Confirmer le mot de passe').value='Mot-de-passe-solide';assert.equal(f.elements?.name,undefined);await envoyer(f);
 assert.deepEqual(api.appels,[['signup','pro@exemple.sn','Mot-de-passe-solide']]);assert.ok(formulaire(host,'connexion-pro'));
});
test('professionnel : connexion par mot de passe et récupération',async()=>{
 const api=fauxApi(),{host}=setup(api);const {accountPanel}=await import('../assets/business/ui.mjs');accountPanel(host,api,async()=>{},{intention:()=> 'Chauffeur'});await tick();
 const f=formulaire(host,'connexion-pro');champ(f,'Adresse e-mail').value='pro@exemple.sn';champ(f,'Mot de passe').value='motdepasse-solide';await envoyer(f);
 assert.equal(api.appels[0][0],'login');
 await bouton(host,'Mot de passe oublié').onclick();await tick();const reset=formulaire(host,'oubli');champ(reset,'Adresse e-mail').value='pro@exemple.sn';await envoyer(reset);assert.equal(api.appels[1][0],'recover');
});

test('Google : bouton sans formulaire, erreur récupérable et session confirmée',async()=>{
 const {api,host,status}=await monter();let calls=0;
 api.signInGoogle=async()=>{calls++;throw Error('Connexion Google indisponible.');};
 const button=bouton(host,'Continuer avec Google');assert.ok(button);
 await button.onclick();assert.equal(calls,1);assert.equal(button.disabled,false);assert.match(status.textContent,/Google indisponible/);
 api.signInGoogle=async options=>{assert.deepEqual(options,{retour:undefined});calls++;};
 await button.onclick();assert.equal(calls,2);assert.match(status.textContent,/Redirection vers Google/);
});
