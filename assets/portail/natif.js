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
  // Notifications de l'application iPhone (APNs, extension @capacitor/push-notifications). Le jeton de l'appareil est
  // gardé sur le téléphone pour pouvoir le retirer du compte à la désactivation ou à la déconnexion.
  var CLE_JETON = 'koki.apns.jeton';
  function push() { var c = cap(); return (estIOS() && c && c.Plugins && c.Plugins.PushNotifications) || null; }
  function lireJeton() { try { return root.localStorage.getItem(CLE_JETON) || ''; } catch (_) { return ''; } }
  function ecrireJeton(v) { try { if (v) root.localStorage.setItem(CLE_JETON, v); else root.localStorage.removeItem(CLE_JETON); } catch (_) { /* stockage indisponible */ } }
  function notificationsDisponibles() { return !!push(); }
  function notificationsActives() { return !!push() && !!lireJeton(); }
  // Demande l'autorisation (une seule fois par iOS), récupère le jeton et l'enregistre sur le compte via « enregistrer ».
  async function activerNotifications(enregistrer) {
    var P = push(); if (!P) return false;
    var perm = await P.checkPermissions();
    if (perm.receive !== 'granted') perm = await P.requestPermissions();
    if (perm.receive !== 'granted') throw new Error('Notifications refusées. Autorisez-les dans Réglages › Koki Connect › Notifications.');
    var jeton = await new Promise(function (ok, ko) {
      var fini = false, poignees = [];
      function stop() { fini = true; poignees.forEach(function (h) { Promise.resolve(h).then(function (x) { if (x && x.remove) x.remove(); }); }); }
      poignees.push(P.addListener('registration', function (t) { if (!fini) { stop(); ok(String(t && t.value || '')); } }));
      poignees.push(P.addListener('registrationError', function () { if (!fini) { stop(); ko(new Error('Inscription aux notifications impossible. Réessayez plus tard.')); } }));
      setTimeout(function () { if (!fini) { stop(); ko(new Error('Le téléphone ne répond pas. Vérifiez la connexion puis réessayez.')); } }, 15000);
      Promise.resolve(P.register()).catch(function (e) { if (!fini) { stop(); ko(e); } });
    });
    if (!/^[0-9a-fA-F]{64,200}$/.test(jeton)) throw new Error('Jeton de notification invalide.');
    await enregistrer(jeton.toLowerCase());
    ecrireJeton(jeton.toLowerCase());
    return true;
  }
  // Retire le jeton du compte (via « retirer ») puis du téléphone. Sans effet hors de l'application.
  async function desactiverNotifications(retirer) {
    var P = push(), jeton = lireJeton(); if (!P) return false;
    try { if (jeton && retirer) await retirer(jeton); } finally { ecrireJeton(''); try { await P.unregister(); } catch (_) { /* déjà désinscrit */ } }
    return true;
  }
  var api = { SITE: SITE, estApp: estApp, plateforme: plateforme, estIOS: estIOS, siteUrl: siteUrl, ouvrirFichier: ouvrirFichier,
    notificationsDisponibles: notificationsDisponibles, notificationsActives: notificationsActives, activerNotifications: activerNotifications, desactiverNotifications: desactiverNotifications };
  root.KokiNatif = api;
  try { if (estApp()) root.document.documentElement.classList.add('koki-app', 'koki-app-' + plateforme()); } catch (_) { /* sans DOM */ }
  // Liens « kokiconnect://ecran/<boutique|transport|activite|profil|accueil> » : ouvrent directement une rubrique
  // de l'application (raccourcis, et captures d'écran automatiques pour l'App Store). L'écran de bienvenue est fermé.
  var ECRANS = ['accueil', 'transport', 'boutique', 'activite', 'profil'];
  function ecranDuLien(url) {
    var m = /^kokiconnect:\/\/ecran\/([a-z]+)\/?$/.exec(String(url || ''));
    return m && ECRANS.indexOf(m[1]) >= 0 ? m[1] : null;
  }
  function ouvrirLien(url) {
    var ecran = ecranDuLien(url), doc = root.document; if (!ecran || !doc) return false;
    try { root.localStorage.setItem('koki.bienvenue.v1', 'vu'); } catch (_) { /* stockage indisponible */ }
    var accueil = doc.getElementById('bienvenue'); if (accueil) accueil.remove();
    var bouton = doc.querySelector('[data-nav="' + ecran + '"]'); if (bouton) bouton.click();
    return !!bouton;
  }
  function ecouterLiens() {
    var c = cap(), A = c && c.Plugins && c.Plugins.App; if (!estApp() || !A) return;
    try { A.addListener('appUrlOpen', function (e) { ouvrirLien(e && e.url); }); } catch (_) { /* extension absente */ }
    try { Promise.resolve(A.getLaunchUrl && A.getLaunchUrl()).then(function (r) { if (r && r.url) setTimeout(function () { ouvrirLien(r.url); }, 800); }); } catch (_) { /* pas de lien au lancement */ }
  }
  // Barre d'état iPhone : fond vert foncé Koki Connect (texte blanc) au lieu du noir par défaut.
  function colorerBarreEtat() {
    var c = cap(), S = c && c.Plugins && c.Plugins.StatusBar; if (!estIOS() || !S) return;
    try { Promise.resolve(S.setBackgroundColor && S.setBackgroundColor({ color: '#0b5a3c' })).catch(function () {}); } catch (_) { /* extension absente */ }
  }
  api.ecranDuLien = ecranDuLien; api.ouvrirLien = ouvrirLien;
  try { if (root.document && root.document.readyState !== 'loading') { ecouterLiens(); colorerBarreEtat(); } else if (root.document) root.document.addEventListener('DOMContentLoaded', function () { ecouterLiens(); colorerBarreEtat(); }); } catch (_) { /* sans DOM */ }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
