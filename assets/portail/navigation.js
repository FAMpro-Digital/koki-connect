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
  function marquerNavigation() {
    document.querySelectorAll('nav[aria-label="Navigation principale"] button').forEach(b => {
      const actif = (courante === null && /Accueil/.test(b.textContent)) || (courante === 'vue-carte' && /Carte/.test(b.textContent)) ||
        (courante === 'vue-portail' && /Profil|Favoris/.test(b.textContent) && titre.textContent.startsWith(b.textContent.replace(/[^A-Za-zÀ-ÿ]/g, '')));
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

  try { history.replaceState({ ...(history.state || {}), kokiVue: 0, kokiPas: 0 }, ''); } catch (_) {}
  marquerNavigation();
  window.KokiNavigation = Object.freeze({ profondeur: () => pile.length, retour: () => history.back() });
})();
