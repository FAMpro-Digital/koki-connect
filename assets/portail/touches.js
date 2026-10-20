// Koki Connect : animation au toucher des boutons (onde qui part du doigt), aux couleurs Koki.
// L'onde est dessinée dans un calque fixe posé au-dessus du bouton : le bouton lui-même n'est jamais modifié
// (ni position, ni overflow), donc aucune mise en page existante n'est touchée.
// Désactivée quand le téléphone demande moins d'animations, et sur les éléments désactivés.
(function () {
  'use strict';
  if (window.KokiTouches) return;
  var CIBLES = 'button, a[href], summary, [role="button"], [role="tab"], .portail-card, label.business-choice, .pro-choix-carte';
  var calme = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var VERT = 'rgba(8,122,61,.22)', BLANC = 'rgba(255,255,255,.42)';

  // Couleur de fond réelle (premier ancêtre non transparent) pour choisir une onde visible.
  function fond(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      var c = getComputedStyle(e).backgroundColor;
      var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || '');
      if (m && (m[4] === undefined || parseFloat(m[4]) > 0.3)) return [+m[1], +m[2], +m[3]];
    }
    return [255, 255, 255];
  }
  function sombre(rgb) { return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) < 150; }

  function onde(el, x, y) {
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight) return null;
    var st = getComputedStyle(el);
    var calque = document.createElement('span');
    calque.className = 'koki-touche';
    calque.setAttribute('aria-hidden', 'true');
    calque.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border-radius:' + st.borderRadius + ';';
    var rond = document.createElement('span');
    var cx = (x === undefined ? r.width / 2 : x - r.left), cy = (y === undefined ? r.height / 2 : y - r.top);
    // Diamètre juste suffisant pour couvrir le bouton depuis le point touché (coin le plus éloigné).
    var dx = Math.max(cx, r.width - cx), dy = Math.max(cy, r.height - cy);
    var d = Math.ceil(Math.sqrt(dx * dx + dy * dy)) * 2;
    rond.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (cx - d / 2) + 'px;top:' + (cy - d / 2) + 'px;background:' + (sombre(fond(el)) ? BLANC : VERT) + ';';
    calque.appendChild(rond);
    document.body.appendChild(calque);
    return calque;
  }
  function retirer(calque) {
    if (!calque || calque.dataset.fin) return;
    calque.dataset.fin = '1';
    calque.classList.add('koki-touche-fin');
    setTimeout(function () { calque.remove(); }, 420);
  }

  var actif = null;
  function appui(ev) {
    if (calme.matches || (ev.button !== undefined && ev.button !== 0)) return;
    var el = ev.target && ev.target.closest ? ev.target.closest(CIBLES) : null;
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('.leaflet-container')) return;
    retirer(actif);
    actif = onde(el, ev.clientX, ev.clientY);
    // Onde complète même pour un appui très bref.
    if (actif) { var c = actif; c.dataset.debut = Date.now(); }
  }
  function relache() {
    var c = actif; actif = null;
    if (!c) return;
    var reste = 260 - (Date.now() - (+c.dataset.debut || 0));
    setTimeout(function () { retirer(c); }, Math.max(0, reste));
  }
  document.addEventListener('pointerdown', appui, { passive: true });
  document.addEventListener('pointerup', relache, { passive: true });
  document.addEventListener('pointercancel', relache, { passive: true });
  // Le défilement annule l'appui : l'onde disparaît aussitôt.
  window.addEventListener('scroll', function () { retirer(actif); actif = null; }, { passive: true, capture: true });
  // Clavier (Entrée / Espace) : onde depuis le centre.
  document.addEventListener('keydown', function (ev) {
    if (calme.matches || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    var el = ev.target && ev.target.closest ? ev.target.closest(CIBLES) : null;
    if (el && !el.disabled) { var c = onde(el); if (c) setTimeout(function () { retirer(c); }, 260); }
  });

  window.KokiTouches = Object.freeze({ cibles: CIBLES, sombre: sombre });
})();
