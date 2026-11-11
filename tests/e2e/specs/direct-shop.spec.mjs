import {test,expect} from '../helpers/isolation.mjs';
for(const statut of ['Actif','En attente'])test('gestion immédiate de la boutique — '+statut,async({page})=>{
 await page.goto('/index.html');await page.evaluate(async statut=>{
 const {proSpace}=await import('/assets/business/pro-space.mjs');const {imageSelection}=await import('/assets/business/ui.mjs');
 document.body.replaceChildren();const host=document.createElement('section');host.id='profil-pro';document.body.append(host);
 const data={professionnels:[{id:'p',statut,payload:{nom:'MD TEST',type:'Commerçant',village:'Keur Ngoura'}}],boutiques:[{id:'b',statut:'Actif',parent_id:'p',payload:{nom:'MD TEST'}}],produits:[{id:'x',revision:1,parent_id:'b',statut:'Disponible',payload:{nom:'Assiette TEST',prix:1500,stock:8}}],services:[]};
 const api={mine:async k=>data[k],localites:async()=>['Keur Ngoura'],archive:async row=>{row.statut='Archivé';window.removed=row.id;},user:{},pending:()=>[]};
 await proSpace(host,api,document.createElement('p'),{imageSelection,upload:async()=>''});
 },statut);
 const host=page.locator('#profil-pro');await expect(host.getByRole('button',{name:/Ajouter et gérer mes produits/})).toBeEnabled();
 if(statut==='En attente')await expect(host.getByText(/Ils seront visibles au public après validation/)).toBeVisible();
 await host.getByRole('button',{name:/Ajouter et gérer mes produits/}).click();await expect(host.getByRole('button',{name:'Ajouter un produit',exact:true})).toBeEnabled();await expect(host.getByRole('button',{name:'Modifier le prix ou le stock'})).toBeEnabled();
 page.once('dialog',d=>d.accept());await host.getByRole('button',{name:'Retirer le produit'}).click();await expect.poll(()=>page.evaluate(()=>window.removed)).toBe('x');
});

test('les modifications de boutique restent visibles dans le compte professionnel après enregistrement',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(async()=>{
  const {proSpace}=await import('/assets/business/pro-space.mjs');const {imageSelection}=await import('/assets/business/ui.mjs');
  document.body.replaceChildren();const host=document.createElement('section');host.id='profil-pro';document.body.append(host);
  const data={professionnels:[{id:'p',statut:'Actif',payload:{nom:'Ancien nom professionnel',type:'Commerçant',village:'Keur Ngoura'}}],boutiques:[{id:'b',revision:1,statut:'Actif',parent_id:'p',payload:{nom:'Ma boutique',village:'Coki',description:'Ancienne description',photos:['photo-test']}}],produits:[],services:[]};
  const api={mine:async k=>structuredClone(data[k]),localites:async()=>['Coki'],image:async()=>'/favicon.ico',user:{},pending:()=>[],saveShop:async(values,row)=>{
   const saved={...row,revision:row.revision+1,payload:{...row.payload,nom:values.name,village:values.village,description:values.description,photos:values.photos}};data.boutiques=[saved];return structuredClone(saved);
  }};
  await proSpace(host,api,document.createElement('p'),{imageSelection,upload:async()=>''});
 });
 const host=page.locator('#profil-pro');
 await host.getByRole('button',{name:'Modifier la boutique',exact:true}).click();
 await host.getByLabel('Nom de la boutique',{exact:true}).fill('Boutique mise à jour');
 await host.getByLabel('Localité',{exact:true}).fill('Diourbel');
 await host.getByLabel('Description (facultatif)',{exact:true}).fill('Nouvelle description enregistrée');
 await host.getByRole('button',{name:'Enregistrer la boutique',exact:true}).click();
 await expect(host.getByRole('heading',{name:'Boutique mise à jour',exact:true})).toBeVisible();
 await expect(host.getByText('Localité : Diourbel',{exact:true})).toBeVisible();
 await expect(host.getByText('Nouvelle description enregistrée',{exact:true})).toBeVisible();
 await expect(host.getByRole('img',{name:'Photo de Boutique mise à jour',exact:true})).toBeVisible();
 await expect(host.getByRole('status')).toContainText('sans nouvelle validation');
 await host.getByRole('button',{name:'Modifier la boutique',exact:true}).click();
 await expect(host.getByLabel('Localité',{exact:true})).toHaveValue('Diourbel');
});

test('partage de la boutique active et copie du lien avec repli manuel',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(async()=>{
  const {proSpace}=await import('/assets/business/pro-space.mjs');
  const host=document.createElement('section');host.id='profil-pro';document.body.append(host);
  const data={professionnels:[{id:'p',statut:'Actif',payload:{nom:'Pro',type:'Commerçant'}}],boutiques:[{id:'eb88d23c-270d-495b-ac11-ff29a232133a',parent_id:'p',statut:'Actif',payload:{nom:'Boutique test'}}],produits:[],services:[]};
  Object.defineProperty(navigator,'share',{configurable:true,value:async x=>{window.shared=x;}});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async x=>{window.copied=x;}}});
  await proSpace(host,{mine:async k=>data[k],localites:async()=>[],user:{},pending:()=>[]},document.createElement('p'),{});
 });
 const host=page.locator('#profil-pro'),url='https://www.kokiconnect.com/?fiche=eb88d23c-270d-495b-ac11-ff29a232133a';
 await host.getByRole('button',{name:'Partager ma boutique',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.shared?.url)).toBe(url);
 await host.getByRole('button',{name:'Copier le lien',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.copied)).toBe(url);
 await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('denied');};});
 await host.getByRole('button',{name:'Copier le lien',exact:true}).click();
 await expect(host.getByLabel('Lien public de la boutique (facultatif)',{exact:true})).toHaveValue(url);
});

test('boutique et produits en images sans deuxième bouton de création',async({page})=>{
 await page.goto('/index.html');await page.evaluate(async()=>{
  const {proSpace}=await import('/assets/business/pro-space.mjs');const {imageSelection}=await import('/assets/business/ui.mjs');
  const host=document.createElement('section');host.id='visual-pro';document.body.append(host);
  const data={professionnels:[{id:'p',statut:'Actif',payload:{nom:'Pro',type:'Commerçant'}}],boutiques:[{id:'b',parent_id:'p',statut:'Actif',payload:{nom:'Boutique test',photos:['shop-photo']}}],produits:[{id:'x',parent_id:'b',statut:'Disponible',payload:{nom:'Assiette',prix:1500,stock:8,photos:['product-photo']}},{id:'other',parent_id:'elsewhere',statut:'Disponible',payload:{nom:'Autre boutique',prix:1,stock:1}}],services:[]};
  await proSpace(host,{mine:async k=>data[k],localites:async()=>[],image:async()=>'/favicon.ico',user:{},pending:()=>[]},document.createElement('p'),{imageSelection,upload:async()=>''});
 });
 const host=page.locator('#visual-pro');
 await expect(host.getByRole('img',{name:'Photo de Boutique test',exact:true})).toBeVisible();
 await expect(host.getByRole('img',{name:'Photo de Assiette',exact:true})).toBeVisible();
 await expect(host.getByRole('heading',{name:'Autre boutique',exact:true})).toHaveCount(0);
 await host.getByRole('button',{name:'Mes boutiques (1)',exact:true}).click();
 await expect(host.getByRole('button',{name:'Ajouter une boutique',exact:true})).toHaveCount(0);
 await expect(host.getByRole('img',{name:'Photo de Assiette',exact:true})).toBeVisible();
 await host.getByRole('button',{name:'Modifier le produit',exact:true}).click();
 await expect(host.getByLabel('Nom du produit',{exact:true})).toHaveValue('Assiette');
});
