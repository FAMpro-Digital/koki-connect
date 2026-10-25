const {test}=require('node:test');
const assert=require('node:assert/strict');
test('notification invitation respects consent, snooze, capability and session',async()=>{
 const {promptMode}=await import('../assets/business/notification-prompt.mjs');
 const ready={enabled:true,supported:true,signedIn:true,permission:'default',now:1000};
 assert.equal(promptMode(ready),'activate');
 assert.equal(promptMode({...ready,signedIn:false}),'login');
 for(const option of [{enabled:false},{permission:'denied'},{subscribed:true},{remindAfter:1001},{supported:false}])assert.equal(promptMode({...ready,...option}),'hidden');
 assert.equal(promptMode({...ready,remindAfter:999}),'activate');
 assert.equal(promptMode({...ready,ios:true,standalone:false,supported:false}),'install');
 assert.equal(promptMode({...ready,ios:true,standalone:true}),'activate');
});
