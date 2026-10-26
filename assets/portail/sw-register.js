// Une mise à jour propose un rechargement sans effacer le formulaire en cours.
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='127.0.0.1'||location.hostname==='localhost')){
 const dejaControle=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!dejaControle||document.getElementById('koki-update'))return;
  const button=document.createElement('button');button.id='koki-update';button.type='button';button.textContent='Nouvelle version disponible — Actualiser';button.style.cssText='position:fixed;bottom:90px;left:16px;right:16px;z-index:10000;padding:14px;background:#fff;color:#24583e;border:2px solid #24583e;border-radius:12px;font-weight:700';button.onclick=()=>location.reload();document.body.append(button);
 });
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
}
