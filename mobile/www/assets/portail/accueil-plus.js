// Accueil : carte « Reprendre » (course ou commande en cours), bandeau « À la une » qui défile, blocs rapides masqués pendant une recherche.
// Aucune donnée n'est envoyée : la carte « Reprendre » relit l'activité du compte connecté (mêmes appels que l'écran Activité)
// et seulement si une session existe sur l'appareil.
(function () {
  'use strict';
  var calme = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function el(id) { return document.getElementById(id); }
  function n(tag, texte, cls) { var e = document.createElement(tag); if (texte !== undefined && texte !== null) e.textContent = texte; if (cls) e.className = cls; return e; }

  // ----- Recherche : les blocs rapides s'effacent pendant la saisie -----
  var champ = document.querySelector('.search input[type="search"]'), rapide = el('accueil-rapide');
  if (champ && rapide) champ.addEventListener('input', function () { rapide.hidden = champ.value.trim().length > 0; });

  // ----- Reprendre -----
  var carte = el('carte-reprendre'), enCours = false;
  function sessionPresente() { try { return !!localStorage.getItem('koki-public-auth'); } catch (e) { return false; } }
  function accueilVisible() { var t = el('tableau-de-bord'); return !!t && !t.hidden && !document.hidden; }
  async function majReprendre() {
    if (!carte || enCours || !sessionPresente() || !window.KokiBusiness || typeof window.KokiBusiness.activite !== 'function') return;
    enCours = true;
    try {
      var a = await window.KokiBusiness.activite();
      var r = window.KokiActivite && window.KokiActivite.enCours ? window.KokiActivite.enCours(a) : null;
      carte.replaceChildren();
      if (!r) { carte.hidden = true; return; }
      var texte = n('div', null, 'reprendre-texte');
      texte.append(n('small', 'À reprendre'), n('strong', r.titre), n('span', r.statut + (r.detail ? ' · ' + r.detail : '')));
      var bouton = n('button', 'Suivre');
      bouton.type = 'button';
      bouton.setAttribute('aria-label', 'Suivre : ' + r.titre);
      bouton.addEventListener('click', function () {
        if (r.type === 'course' && typeof window.afficherTransport === 'function') window.afficherTransport();
        else if (window.KokiActivite) window.KokiActivite.ouvrir();
      });
      carte.append(n('span', r.icone, 'reprendre-icone'), texte, bouton);
      carte.hidden = false;
    } catch (e) { carte.hidden = true; } finally { enCours = false; }
  }
  (function attendre(essais) {
    if (window.KokiBusiness && typeof window.KokiBusiness.activite === 'function') { majReprendre(); return; }
    if (essais < 150) setTimeout(function () { attendre(essais + 1); }, 100);
  })(0);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) majReprendre(); });
  window.addEventListener('online', majReprendre);
  window.addEventListener('koki-business-status', majReprendre);
  setInterval(function () { if (accueilVisible()) majReprendre(); }, 90000);

  // ----- À la une : bandeau qui défile -----
  var une = el('portail-une'), points = null, pause = 0;
  function pas() { var c = une && une.children[1]; var a = une && une.children[0]; return c && a ? c.offsetLeft - a.offsetLeft : (a ? a.offsetWidth + 12 : 0); }
  function indexCourant() { var p = pas(); return p ? Math.round(une.scrollLeft / p) : 0; }
  function majPoints() {
    if (!une) return;
    var nb = une.children.length;
    if (!points) { points = n('div', null, 'une-points'); points.setAttribute('aria-hidden', 'true'); une.insertAdjacentElement('afterend', points); }
    points.hidden = nb < 2;
    if (points.children.length !== nb) { points.replaceChildren(); for (var i = 0; i < nb; i++) points.append(n('span')); }
    var cur = indexCourant();
    for (var j = 0; j < points.children.length; j++) { if (j === cur) points.children[j].setAttribute('aria-current', 'true'); else points.children[j].removeAttribute('aria-current'); }
  }
  if (une) {
    var attente = false;
    une.addEventListener('scroll', function () { if (attente) return; attente = true; requestAnimationFrame(function () { attente = false; majPoints(); }); }, { passive: true });
    ['pointerdown', 'touchstart', 'focusin', 'wheel'].forEach(function (nom) { une.addEventListener(nom, function () { pause = Date.now() + 20000; }, { passive: true }); });
    document.addEventListener('koki-une', function () { majPoints(); });
    setInterval(function () {
      var nb = une.children.length;
      if (nb < 2 || calme.matches || document.hidden || Date.now() < pause || !une.offsetParent) return;
      var suivant = (indexCourant() + 1) % nb;
      une.scrollTo({ left: suivant * pas(), behavior: 'smooth' });
    }, 5500);
    majPoints();
  }
})();
