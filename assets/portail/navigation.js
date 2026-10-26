// Navigation façon application : chaque page ouverte (rubrique, détail, profil, carte…) crée une étape d'historique.
// La touche Retour du téléphone (ou le geste retour) ramène à la page précédente, telle qu'elle était (contenu et
// position), au lieu de quitter l'application. « Accueil » ramène à l'accueil en remontant toutes les étapes.
// Les pages gardent leur fonctionnement : ce module observe seulement quelle page est visible.
(function () {
  'use strict';
  const PAGES = ['opportunites-jeunes', 'vue-rubrique', 'vue-notifications', 'vue-menu', 'vue-carte', 'vue-transport', 'vue-commerce', 'vue-portail'];
  const $ = id => document.getElementById(id);
  const titre = $('portail-titre'), vue = $('portail-vue');
  if (!titre || !vue || !window.history || !window.MutationObserver) return;

  // Chaque étape d'historique (pages, mais aussi vues internes de la boutique et de l'espace pro) porte un numéro :
  // « Accueil » sait ainsi exactement de combien d'étapes revenir.
  let pas = 0;
  const pousser = history.pushState.bind(history);
  history.pushState = function (etat, t, u) { pas++; return pousser({ ...(etat || {}), kokiPas: pas }, t, u); };

  const pile = [];              // pages précédentes : { id, noeuds, titre, scroll, pas }
  let courante = visible(), restauration = false, ignorerPop = 0, scrollCourant = window.scrollY;

  function visible() { return PAGES.find(id => { const e = $(id); return e && !e.hidden; }) || null; }
  function sections() { return [...document.querySelectorAll('body > .section')]; }
  function animer(elements, classe) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const e of elements) {
      e.classList.remove('page-entree', 'page-retour'); void e.offsetWidth; e.classList.add(classe);
      e.addEventListener('animationend', () => e.classList.remove(classe), { once: true });
    }
  }
  // Page ouverte en plein écran : la bannière de l'accueil, la recherche et la ligne d'état disparaissent ;
  // une barre fixe en haut porte le bouton Retour et le titre de la page. La barre du bas reste affichée.
  const TITRES = { 'vue-transport': '🚕 Transport', 'vue-carte': '📍 Carte de Koki' };
  const barre = document.createElement('div'); barre.className = 'barre-page'; barre.hidden = true;
  const retourBarre = document.createElement('button'); retourBarre.type = 'button'; retourBarre.className = 'barre-retour'; retourBarre.setAttribute('aria-label', 'Retour');
  retourBarre.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const titreBarre = document.createElement('p'); titreBarre.className = 'barre-titre'; titreBarre.setAttribute('aria-hidden', 'true');
  barre.append(retourBarre, titreBarre); document.body.prepend(barre);
  retourBarre.onclick = () => { if (pile.length) history.back(); else if (typeof window.fermerOpportunites === 'function') window.fermerOpportunites(); };
  function titrePage() {
    if (!courante) return '';
    if (TITRES[courante]) return TITRES[courante];
    if (courante === 'vue-portail') return titre.textContent.trim() || 'Koki Connect';
    const h = $(courante) && $(courante).querySelector('h2'); return (h && h.textContent.trim()) || 'Koki Connect';
  }
  function pleinEcran() {
    const ouverte = courante !== null;
    document.body.classList.toggle('page-pleine', ouverte); barre.hidden = !ouverte; titreBarre.textContent = titrePage();
  }
  let ongletCourant = '';
  function marquerNavigation() {
    pleinEcran();
    // Onglet actif de la barre du bas : Accueil, Transport, Boutique, Activité (et ce qu'elle regroupe), Profil.
    const t = titre.textContent;
    const onglet = courante === null ? 'accueil' : courante === 'vue-transport' ? 'transport' : courante === 'vue-commerce' ? 'boutique'
      : courante === 'vue-notifications' || (courante === 'vue-portail' && /^(Activité|Favoris|📥 Mes livres)/.test(t)) ? 'activite'
      : courante === 'vue-portail' && /^Profil/.test(t) ? 'profil' : '';
    ongletCourant = onglet;
    document.querySelectorAll('nav[aria-label="Navigation principale"] button').forEach(b => {
      const actif = b.dataset.nav === onglet;
      if (actif) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  window.addEventListener('scroll', () => { if (!restauration) scrollCourant = window.scrollY; }, { passive: true });

  const observateur = new MutationObserver(enregistrements => {
    if (restauration) return;
    const maintenant = visible();
    const titreRemplace = enregistrements.find(r => r.target === titre && r.type === 'childList' && r.removedNodes.length);
    const changement = maintenant !== courante || (maintenant === 'vue-portail' && !!titreRemplace);
    if (!changement) return;
    // Même page portail réaffichée (appui répété sur l'onglet Profil, Activité…) : le titre ne change pas, donc aucune
    // nouvelle étape d'historique ; la page reprend simplement le haut de l'écran.
    if (maintenant === 'vue-portail' && courante === 'vue-portail' && titreRemplace && titreRemplace.removedNodes[0]
      && titreRemplace.removedNodes[0].textContent === titre.textContent) {
      scrollCourant = 0; requestAnimationFrame(() => window.scrollTo(0, 0)); return;
    }
    if (maintenant === null) { retourAccueil(); return; }
    // Page portail quittée : on garde ses éléments (avec leurs actions) pour la réafficher au retour.
    let noeuds = null, ancienTitre = null;
    if (courante === 'vue-portail') {
      if (maintenant === 'vue-portail') {
        const retires = enregistrements.find(r => r.target === vue && r.removedNodes.length);
        noeuds = retires ? [...retires.removedNodes] : null;
        ancienTitre = titreRemplace ? titreRemplace.removedNodes[0].textContent : null;
      } else { noeuds = [...vue.childNodes]; ancienTitre = titre.textContent; }
    }
    pile.push({ id: courante, noeuds, titre: ancienTitre, scroll: scrollCourant, pas });
    courante = maintenant;
    try { history.pushState({ ...(history.state || {}), kokiVue: pile.length }, ''); } catch (_) {}
    animer([$(maintenant)], 'page-entree');
    marquerNavigation();
    requestAnimationFrame(() => { if (!document.querySelector('#vue-transport:not([hidden]) .tr-mode-placement')) window.scrollTo(0, 0); });
  });
  for (const id of PAGES) { const e = $(id); if (e) observateur.observe(e, { attributes: true, attributeFilter: ['hidden'] }); }
  observateur.observe(titre, { childList: true });
  observateur.observe(vue, { childList: true });

  // « Accueil » (bouton ou barre du bas) : on remonte toutes les étapes, sans en créer de nouvelle.
  function retourAccueil() {
    const n = pas;
    pile.length = 0; courante = null;
    animer(sections().filter(s => !s.hidden), 'page-retour');
    marquerNavigation();
    if (n > 0) { ignorerPop++; pas = 0; try { history.go(-n); } catch (_) { ignorerPop--; } }
  }

  window.addEventListener('popstate', e => {
    pas = (e.state && e.state.kokiPas) || 0;
    if (ignorerPop > 0) { ignorerPop--; return; }
    const cible = (e.state && e.state.kokiVue) || 0;
    if (cible >= pile.length) return;            // retour interne d'une page (boutique, espace pro) : géré par la page
    const etape = pile[cible];
    pile.length = cible;
    restauration = true;
    try {
      if (etape.id === null) {
        if (typeof window.fermerOpportunites === 'function') window.fermerOpportunites();
        animer(sections().filter(s => !s.hidden), 'page-retour');
      } else {
        const recherche = document.querySelector('.search'); if (recherche) recherche.hidden = true;
        sections().forEach(s => { s.hidden = s.id !== etape.id; });
        if (etape.id === 'vue-portail' && etape.noeuds) { vue.replaceChildren(...etape.noeuds); if (etape.titre != null) titre.textContent = etape.titre; }
        animer([$(etape.id)], 'page-retour');
        const h = $(etape.id).querySelector('[tabindex="-1"]'); if (h) h.focus({ preventScroll: true });
      }
      courante = etape.id;
      requestAnimationFrame(() => { window.scrollTo(0, etape.scroll || 0); scrollCourant = etape.scroll || 0; });
    } finally {
      observateur.takeRecords(); restauration = false;   // ces changements ne créent pas de nouvelle étape
    }
    marquerNavigation();
  });

  // Glisser le doigt à gauche ou à droite passe à l'onglet voisin de la barre du bas (Accueil → Transport → Boutique
  // → Activité → Profil). Seulement sur les pages des onglets ; jamais sur la carte, un rayon ou une liste qui
  // défile sur le côté, un champ de saisie, ni depuis les bords de l'écran (geste retour du téléphone).
  const ORDRE_ONGLETS = ['accueil', 'transport', 'boutique', 'activite', 'profil'];
  function defileSurLeCote(e) {
    for (let x = e; x && x !== document.body; x = x.parentElement) {
      if (x.matches && x.matches('input, select, textarea, .leaflet-container, [data-sans-glisser], .tr-carte-zone')) return true;
      const st = getComputedStyle(x);
      if (/(auto|scroll)/.test(st.overflowX) && x.scrollWidth > x.clientWidth + 4) return true;
    }
    return false;
  }
  let depart = null;
  document.addEventListener('touchstart', e => {
    depart = null;
    if (e.touches.length !== 1 || !ongletCourant) return;
    const t = e.touches[0];
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24 || defileSurLeCote(e.target)) return;
    depart = { x: t.clientX, y: t.clientY, temps: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!depart || !e.changedTouches.length) return;
    const t = e.changedTouches[0], dx = t.clientX - depart.x, dy = t.clientY - depart.y, duree = Date.now() - depart.temps;
    depart = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || duree > 700) return;
    const i = ORDRE_ONGLETS.indexOf(ongletCourant), j = i + (dx < 0 ? 1 : -1);
    if (i < 0 || j < 0 || j >= ORDRE_ONGLETS.length) return;
    const bouton = document.querySelector('nav[aria-label="Navigation principale"] [data-nav="' + ORDRE_ONGLETS[j] + '"]');
    if (!bouton) return;
    document.body.dataset.glisse = dx < 0 ? 'gauche' : 'droite';
    bouton.click();
    setTimeout(() => { delete document.body.dataset.glisse; }, 400);
  }, { passive: true });
  document.addEventListener('touchcancel', () => { depart = null; }, { passive: true });

  try { history.replaceState({ ...(history.state || {}), kokiVue: 0, kokiPas: 0 }, ''); } catch (_) {}
  marquerNavigation();
  window.KokiNavigation = Object.freeze({ profondeur: () => pile.length, retour: () => history.back() });
})();
