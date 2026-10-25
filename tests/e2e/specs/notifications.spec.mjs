import {test,expect} from '@playwright/test';
test('notifications personnelles : lecture, absence de HTML injecté et effacement à la déconnexion',async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/');
 await page.evaluate(async()=>{
  const {renderNotifications}=await import('/assets/business/notifications.mjs');
  const host=document.createElement('section');host.id='notification-test';document.body.replaceChildren(host);
  const row={id:'one',title:'Votre commande',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-25T12:00:00Z',read_at:null};
  const db={auth:{getUser:async()=>({data:{user:{id:'u'}}}),onAuthStateChange(fn){window.changeNotificationUser=fn;return {data:{subscription:{unsubscribe(){}}}};}},from(){return {select(){return this;},eq(){return this;},order(){return this;},limit:async()=>({data:[row]}),update(value){row.read_at=value.read_at;return this;},then(resolve){return Promise.resolve({error:null}).then(resolve);}};}};
  await renderNotifications(host,db);
 });
 await expect(page.getByText('Votre commande',{exact:true})).toBeVisible();
 await expect(page.locator('#notification-test img')).toHaveCount(0);
 await page.getByRole('button',{name:'Marquer comme lue'}).click();
 await expect(page.getByText('0 notification(s) non lue(s).',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>window.changeNotificationUser('SIGNED_OUT',null));
 await expect(page.getByText('Votre commande',{exact:true})).toHaveCount(0);
});
