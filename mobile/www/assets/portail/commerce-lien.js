// Lien de partage d'une fiche Commerces & Services : https://…/?fiche=<identifiant> ouvre directement la fiche.
// Le paramètre est retiré de l'adresse après ouverture (pas de réouverture au rechargement).
(function () {
  'use strict';
  var id;
  try { id = new URLSearchParams(location.search).get('fiche'); } catch (e) { return; }
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return;
  function ouvrir() {
    var essais = 0;
    (function attendre() {
      if (window.KokiBusiness && typeof window.KokiBusiness.ouvrirFiche === 'function') {
        try {
          var u = new URL(location.href); u.searchParams.delete('fiche');
          history.replaceState(history.state, '', u.pathname + u.search + u.hash);
        } catch (e) { /* adresse inchangée */ }
        window.KokiBusiness.ouvrirFiche(id);
        return;
      }
      if (++essais < 100) setTimeout(attendre, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ouvrir); else ouvrir();
})();
