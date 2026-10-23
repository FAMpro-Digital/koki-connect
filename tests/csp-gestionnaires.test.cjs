'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');

test('index.html ne contient plus de script ni de gestionnaire inline', () => {
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, 'aucun <script> inline');
  assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i, 'aucun attribut onclick/onchange/…');
  assert.doesNotMatch(html, /href\s*=\s*["']javascript:/i);
});

test('chaque action référencée dans la page existe dans le registre', () => {
  const ctx = { document: { addEventListener() {} } };
  ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync('assets/portail/actions.js', 'utf8'), ctx);
  const { ACTIONS } = ctx.KokiActions;
  const attrs = { clic: 'data-clic', change: 'data-change', saisie: 'data-saisie', envoi: 'data-envoi' };
  let total = 0;
  for (const [nom, attr] of Object.entries(attrs)) {
    for (const m of html.matchAll(new RegExp(attr + '="([^"]*)"', 'g'))) {
      const cle = m[1].replace(/&amp;/g, '&');
      assert.equal(typeof ACTIONS[nom][cle], 'function', `${attr}="${cle}" absent du registre`);
      total++;
    }
  }
  assert.equal(total, 89); // + bouton Urgences de l’accueil
});

test('le registre exécute la même instruction qu\'avant (this, event, repli)', () => {
  const appels = [];
  const ctx = {
    document: { addEventListener() {} },
    KokiPortail: { liste: (x) => appels.push(['liste', x]), lieux: (x) => appels.push(['lieux', x]), rechercher: (x) => appels.push(['rechercher', x]) },
    filtrerOpportunites: (x) => appels.push(['filtre', x]),
  };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync('assets/portail/actions.js', 'utf8'), ctx);
  const { ACTIONS } = ctx.KokiActions;
  ACTIONS.clic['KokiPortail.liste(Actualités)']({}, {});
  ACTIONS.clic['filtrerOpportunites(this.dataset.filtre)']({ dataset: { filtre: 'Emploi' } }, {});
  ACTIONS.saisie['KokiPortail.rechercher(this.value)']({ value: 'riz' }, {});
  ACTIONS.clic['window.KokiSante?KokiSante.ouvrir():KokiPortail.lieux(Santé)']({}, {});
  assert.deepEqual(appels, [['liste', 'Actualités'], ['filtre', 'Emploi'], ['rechercher', 'riz'], ['lieux', 'Santé']]);
});

test('la délégation appelle l\'action de l\'élément le plus proche et bloque l\'envoi natif', () => {
  const ecouteurs = {};
  const document = { addEventListener: (e, f) => { ecouteurs[e] = f; } };
  const appels = [];
  const ctx = { document, KokiCommerce: { sauverProfil: () => appels.push('sauver') } };
  ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync('assets/portail/actions.js', 'utf8'), ctx);
  let bloque = false;
  const form = { getAttribute: () => 'KokiCommerce.sauverProfil()' };
  ecouteurs.submit({ target: { closest: (s) => (s === '[data-envoi]' ? form : null) }, preventDefault: () => { bloque = true; } });
  assert.deepEqual(appels, ['sauver']);
  assert.equal(bloque, true);
  ecouteurs.click({ target: { closest: () => null } }); // clic hors action : sans effet
});

test('vercel.json : CSP actuelle inchangée + politique stricte en Report-Only (sans unsafe-inline pour les scripts)', () => {
  const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const h = Object.fromEntries(v.headers[0].headers.map((x) => [x.key, x.value]));
  const script = (s) => (s.match(/script-src[^;]*/) || [''])[0];
  assert.match(script(h['Content-Security-Policy']), /unsafe-inline/, 'la politique appliquée ne change pas dans cette PR');
  assert.equal(script(h['Content-Security-Policy-Report-Only']), "script-src 'self'");
  assert.equal(h['Content-Security-Policy-Report-Only'].replace(script(h['Content-Security-Policy-Report-Only']), ''), h['Content-Security-Policy'].replace(script(h['Content-Security-Policy']), ''), 'seules les directives de script diffèrent');
});
