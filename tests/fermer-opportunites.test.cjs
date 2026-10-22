'use strict';
// Régression : fermerOpportunites() cherchait encore [onclick="afficherOpportunites()"], attribut remplacé par data-clic
// (CSP stricte). Le sélecteur ne trouvait rien, .focus() levait une exception et window.scrollTo(0, 0) n'était jamais appelé.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/portail/accueil.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const SELECTEUR_OUVERTURE = '[data-clic="afficherOpportunites()"]';
const PAGES_MASQUEES = ['opportunites-jeunes', 'vue-rubrique', 'vue-notifications', 'vue-menu', 'vue-carte', 'vue-transport', 'vue-commerce', 'vue-portail'];

// Extrait la vraie fonction du fichier livré (pas une copie) et l'exécute dans un document simulé.
function fermerOpportunites() {
  const m = /function fermerOpportunites\(\) \{[\s\S]*?\n\}/.exec(source);
  assert.ok(m, 'fermerOpportunites() introuvable dans accueil.js');
  return m[0];
}

// Document minimal : seuls les sélecteurs réellement attendus répondent ; tout autre sélecteur ne trouve rien (comme le vrai DOM).
function simuler({ ouvertures = () => [], idsSections = [...PAGES_MASQUEES, 'accueil-utiles', 'accueil-opportunites'] } = {}) {
  const journal = { scrolls: [], focus: [] };
  const recherche = { hidden: true };
  const sections = idsSections.map((id) => ({ id, hidden: false }));
  const document = {
    querySelector: (sel) => (sel === '.search' ? recherche : null),
    querySelectorAll: (sel) => (sel === 'body > .section' ? sections : sel === SELECTEUR_OUVERTURE ? ouvertures(journal) : []),
  };
  const contexte = vm.createContext({ document, window: { scrollTo: (...a) => journal.scrolls.push(a) }, Array });
  vm.runInContext(fermerOpportunites() + '\nthis.fermer = fermerOpportunites;', contexte);
  return { appeler: () => contexte.fermer(), journal, recherche, sections };
}

// Élément simulé : visible, ou à l'intérieur d'une page masquée (closest('[hidden]') le retrouve).
const bouton = (nom, journal, masque = false) => ({ nom, focus: () => journal.focus.push(nom), closest: (sel) => (sel === '[hidden]' && masque ? {} : null) });

test('fermerOpportunites() : aucune exception quand aucun bouton d’ouverture n’existe, et la page remonte en haut', () => {
  const monde = simuler();
  assert.doesNotThrow(() => monde.appeler());
  assert.deepEqual(monde.journal.scrolls, [[0, 0]], 'window.scrollTo(0, 0) doit toujours être appelé (il était sauté par l’exception)');
  assert.deepEqual(monde.journal.focus, []);
});

test('fermerOpportunites() : le bouton d’ouverture visible reçoit le focus (accessibilité clavier)', () => {
  const monde = simuler({ ouvertures: (j) => [bouton('visible', j)] });
  assert.doesNotThrow(() => monde.appeler());
  assert.deepEqual(monde.journal.focus, ['visible']);
  assert.deepEqual(monde.journal.scrolls, [[0, 0]]);
});

test('fermerOpportunites() : un bouton situé dans une page masquée ne reçoit pas le focus, sans exception', () => {
  const monde = simuler({ ouvertures: (j) => [bouton('dans-le-menu-masque', j, true)] });
  assert.doesNotThrow(() => monde.appeler());
  assert.deepEqual(monde.journal.focus, []);
  assert.deepEqual(monde.journal.scrolls, [[0, 0]]);
});

test('fermerOpportunites() : parmi plusieurs boutons, le premier affiché reçoit le focus', () => {
  const monde = simuler({ ouvertures: (j) => [bouton('masque', j, true), bouton('affiche-1', j), bouton('affiche-2', j)] });
  monde.appeler();
  assert.deepEqual(monde.journal.focus, ['affiche-1']);
});

test('fermerOpportunites() : le comportement d’affichage est inchangé (accueil visible, pages masquées, recherche affichée)', () => {
  const monde = simuler();
  monde.appeler();
  assert.equal(monde.recherche.hidden, false);
  for (const s of monde.sections) assert.equal(s.hidden, PAGES_MASQUEES.includes(s.id), s.id);
});

test('plus aucun sélecteur [onclick=…] dans le JavaScript de l’accueil ; le sélecteur data-clic existe dans index.html', () => {
  assert.doesNotMatch(source, /\[onclick/, 'accueil.js ne doit plus chercher d’attribut onclick');
  assert.equal(/ onclick=/.test(index), false, 'index.html ne contient plus d’attribut onclick (CSP stricte)');
  assert.ok(index.includes('data-clic="afficherOpportunites()"'), 'au moins un bouton déclenche afficherOpportunites() par data-clic');
});

test('le gestionnaire data-clic exécute bien afficherOpportunites() et fermerOpportunites()', () => {
  const actions = fs.readFileSync('assets/portail/actions.js', 'utf8');
  assert.match(actions, /"afficherOpportunites\(\)":function\(el,event\)\{afficherOpportunites\(\)\}/);
  assert.match(actions, /"fermerOpportunites\(\)":function\(el,event\)\{fermerOpportunites\(\)\}/);
});
