'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const lire = (f) => fs.readFileSync(f, 'utf8');

test('Leaflet est chargé à la demande et non au démarrage', () => {
  const html = lire('index.html');
  assert.doesNotMatch(html, /assets\/leaflet\/leaflet\.(js|css)/);
  assert.match(html, /<script src="assets\/leaflet\/chargeur\.js"><\/script>/);
  assert.match(lire('assets/transport/app.js'), /KokiLeaflet\.charger\(\)/);
});

test('le chargeur Leaflet ne charge la bibliothèque qu\'une fois et retente après échec', async () => {
  const ajoutes = [];
  const document = {
    head: { append(el) { ajoutes.push(el); if (el.tag === 'script') ctx.L = { map() {} }; setTimeout(() => (el.fail ? el.onerror() : el.onload()), 0); } },
    createElement(tag) { return { tag, remove() {} }; },
  };
  const ctx = { document, setTimeout, Promise, Error, Object };
  ctx.L = undefined;
  ctx.globalThis = ctx;
  vm.runInNewContext(lire('assets/leaflet/chargeur.js'), ctx);
  const L = await ctx.KokiLeaflet.charger();
  assert.ok(L.map);
  assert.equal(ajoutes.length, 2);
  await ctx.KokiLeaflet.charger();
  assert.equal(ajoutes.length, 2, 'aucun nouveau téléchargement');
});

test('les feuilles de rubrique différées sont activées par un script externe (compatible CSP)', () => {
  const html = lire('index.html');
  const differes = html.match(/<link rel="stylesheet" href="[^"]+" media="print" data-differe>/g) || [];
  assert.equal(differes.length, 5);
  assert.doesNotMatch(html, /onload="this\.media/);
  assert.match(html, /<script defer src="assets\/portail\/styles-differes\.js"><\/script>/);
  const liens = [];
  const l = { sheet: null, media: 'print', addEventListener(e, f) { liens.push([e, f]); } };
  const ctx = { document: { querySelectorAll: () => [l] } };
  vm.runInNewContext(lire('assets/portail/styles-differes.js'), ctx);
  assert.equal(l.media, 'print');
  liens.find(([e]) => e === 'load')[1]();
  assert.equal(l.media, 'all');
});

test('le module métier s\'exécute après les scripts différés', () => {
  const html = lire('index.html');
  assert.ok(html.indexOf('styles-differes.js') < html.indexOf('assets/business/runtime.mjs'));
});

test('l\'image d\'accueil est en WebP avec dimensions et chargement différé', () => {
  const html = lire('index.html');
  assert.match(html, /<img src="assets\/fampro-digital\.webp" width="720" height="360" loading="lazy"/);
  assert.ok(fs.statSync('assets/fampro-digital.webp').size < 50 * 1024);
});
