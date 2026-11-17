// Détection de l'application native (iOS / Android via Capacitor). Sur le site web, rien ne change :
// estApp() vaut false et siteUrl() renvoie l'adresse de la page. Dans l'application, les liens partagés
// pointent toujours vers www.kokiconnect.com (jamais capacitor://localhost) et les fichiers s'ouvrent
// dans la visionneuse du téléphone.
(function (root) {
  'use strict';
  var SITE = 'https://www.kokiconnect.com';
  function cap() { try { return root.Capacitor || null; } catch (_) { return null; } }
  function estApp() {
    try { var c = cap(); return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()); } catch (_) { return false; }
  }
  function plateforme() {
    try { return estApp() && typeof cap().getPlatform === 'function' ? String(cap().getPlatform()) : 'web'; } catch (_) { return 'web'; }
  }
  function estIOS() { return plateforme() === 'ios'; }
  function siteUrl() {
    try { var l = root.location; if (!estApp() && l && /^https?:$/.test(l.protocol) && l.host) return l.origin; } catch (_) { /* adresse officielle */ }
    return SITE;
  }
  function base64(blob) {
    return new Promise(function (ok, ko) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { ko(r.error); };
      r.readAsDataURL(blob);
    });
  }
  // Ouvre un fichier (PDF, EPUB, audio) dans la visionneuse native, qui propose aussi « Enregistrer dans Fichiers ».
  // Renvoie false hors de l'application ou si les extensions natives manquent : l'appelant garde alors le lecteur web.
  async function ouvrirFichier(blob, nom) {
    var c = cap(), P = (c && c.Plugins) || {}, FS = P.Filesystem, FO = P.FileOpener;
    if (!estApp() || !FS || !FO || !blob) return false;
    var propre = String(nom || 'document').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'document';
    var ecrit = await FS.writeFile({ path: 'livres/' + propre, data: await base64(blob), directory: 'CACHE', recursive: true });
    await FO.openFile({ path: ecrit.uri, mimeType: blob.type || undefined });
    return true;
  }
  var api = { SITE: SITE, estApp: estApp, plateforme: plateforme, estIOS: estIOS, siteUrl: siteUrl, ouvrirFichier: ouvrirFichier };
  root.KokiNatif = api;
  try { if (estApp()) root.document.documentElement.classList.add('koki-app', 'koki-app-' + plateforme()); } catch (_) { /* sans DOM */ }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
