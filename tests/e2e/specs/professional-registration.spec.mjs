import {test,expect} from '../helpers/isolation.mjs';

for(const type of ['Commerçant','Prestataire de services','Chauffeur']){
 test(type+' : dossier complet avant confirmation, reprise des données et de la photo',async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(async type=>{
   const {accountPanel}=await import('/assets/business/ui.mjs');
   const {createBusinessClient}=await import('/assets/business/client.mjs');
   const host=document.createElement('section');host.id='registration-test';document.body.append(host);
   window.registrationCalls=[];window.rejectRegistration=false;
   const api=createBusinessClient({auth:{getUser:async()=>({error:{message:'Non connecté'}}),signUp:async payload=>{
    window.registrationCalls.push(payload);
    return {error:window.rejectRegistration?{code:'over_email_send_rate_limit',status:429}:null};
   }}},{enabled:true});
   accountPanel(host,api,async()=>{},{intention:()=>type,retour:()=>location.href});
  },type);
  const host=page.locator('#registration-test');
  const send=()=>host.getByRole('button',{name:'Créer mon compte professionnel',exact:true}).click();
  await send();
  await host.getByLabel('Adresse e-mail',{exact:true}).fill('pro@example.invalid');
  await host.getByLabel('Mot de passe (8 caractères minimum)',{exact:true}).fill('Mot-de-passe-test');
  await host.getByLabel('Confirmer le mot de passe',{exact:true}).fill('Mot-de-passe-test');
  await send();expect(await page.evaluate(()=>window.registrationCalls.length)).toBe(0);
  await host.getByLabel(type==='Chauffeur'?'Nom du chauffeur':'Nom de la boutique ou du prestataire',{exact:true}).fill('TEST Activité');
  await host.getByLabel('Numéro de téléphone',{exact:true}).fill('771234567');
  if(type==='Chauffeur')await host.getByLabel('Type de transport',{exact:true}).selectOption('Taxi');
  else{
   await host.getByLabel('Domaine d’activité',{exact:true}).fill('Couture');
   await host.getByLabel('Village ou localité',{exact:true}).selectOption('Coki');
  }
  await host.getByLabel('Adresse ou quartier',{exact:true}).fill('Koki centre');
  await host.getByLabel('Présentation de votre activité',{exact:true}).fill('Présentation de test');
  await send();expect(await page.evaluate(()=>window.registrationCalls.length)).toBe(0);
  const photo=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=16;c.height=16;c.getContext('2d').fillRect(0,0,16,16);return c.toDataURL('image/png').split(',')[1];
  });
  await host.locator('input[type=file]').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
  await page.evaluate(()=>window.rejectRegistration=true);await send();
  await expect(host.getByRole('status').first()).toContainText('Patientez');
  await expect(host.getByLabel('Adresse ou quartier',{exact:true})).toHaveValue('Koki centre');
  await expect(host.getByLabel('Mot de passe (8 caractères minimum)',{exact:true})).toHaveValue('');
  await page.evaluate(()=>window.rejectRegistration=false);
  await host.getByLabel('Mot de passe (8 caractères minimum)',{exact:true}).fill('Mot-de-passe-test');
  await host.getByLabel('Confirmer le mot de passe',{exact:true}).fill('Mot-de-passe-test');await send();
  await expect(host.getByText(/Dossier renseigné/)).toBeVisible();
  const payload=await page.evaluate(()=>window.registrationCalls.at(-1));
  expect(payload.options.data.professional_registration).toMatchObject({type,name:'TEST Activité',phone:'+221771234567',address:'Koki centre',description:'Présentation de test'});
  expect(payload.options.data.professional_registration.category).toBe(type==='Chauffeur'?'Taxi':'Couture');
  if(type!=='Chauffeur')expect(payload.options.data.professional_registration.village).toBe('Coki');
  expect(payload.options.data.professional_registration.password).toBeUndefined();
  await page.reload();
  const restored=await page.evaluate(async payload=>{
   const {registrationPhoto}=await import('/assets/business/registration-photo.mjs');
   const file=await registrationPhoto({email:payload.email,user_metadata:payload.options.data});return !!file?.size;
  },payload);expect(restored).toBe(true);
 });
}
