import {test,expect} from '@playwright/test';
test('invitation facultative, permission après clic et report persistant',async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/');
 await page.evaluate(async()=>{
  window.permissionCalls=0;
  Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'default',requestPermission(){window.permissionCalls++;return Promise.resolve('default');}}});
  window.PushManager=class {};
  const {mountNotificationPrompt}=await import('/assets/business/notification-prompt.mjs');
  await mountNotificationPrompt({signedIn:()=>true,activate:async(key,permission)=>(await permission)==='granted',openAccount(){}});
 });
 const box=page.locator('#koki-notification-prompt');
 await expect(box).toBeVisible();
 expect(await page.evaluate(()=>window.permissionCalls)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await box.getByRole('button',{name:'Activer les notifications'}).click();
 await expect(box).toHaveCount(0);
 expect(await page.evaluate(()=>window.permissionCalls)).toBe(1);
 expect(await page.evaluate(()=>Number(localStorage.getItem('koki.notifications.remind-after'))>Date.now())).toBe(true);
 await page.reload();
 await page.waitForTimeout(4500);
 await expect(box).toHaveCount(0);
});
