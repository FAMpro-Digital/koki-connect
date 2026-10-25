const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('push : contenu générique et destination interne même si le message fournit une URL hostile',async()=>{
 const events={};let notification,opened;const self={location:{origin:'https://koki.test'},registration:{scope:'https://koki.test/',showNotification:async(t,o)=>{notification={t,...o};}},addEventListener:(n,f)=>events[n]=f,clients:{matchAll:async()=>[],openWindow:async u=>{opened=u;}}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self,URL});
 let pending;events.push({data:{json:()=>({body:'secret',url:'https://evil.test',tag:'abc'})},waitUntil:p=>pending=p});await pending;
 assert.equal(notification.body.includes('secret'),false);assert.equal(notification.data.url,'https://koki.test/?notifications=1');
 events.notificationclick({notification:{close(){}},waitUntil:p=>pending=p});await pending;assert.equal(opened,'https://koki.test/?notifications=1');
});
