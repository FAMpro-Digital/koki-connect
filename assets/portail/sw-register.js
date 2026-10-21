// Enregistrement du service worker (sorti de index.html pour permettre une CSP sans 'unsafe-inline').
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='127.0.0.1'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
