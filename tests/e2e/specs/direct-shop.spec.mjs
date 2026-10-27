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
