'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ORIGINE = 'https://koki.example';
class Reponse {
  constructor(corps, { ok = true, type = 'basic', headers = {} } = {}) { this.corps = corps; this.ok = ok; this.type = type; this.headers = new Map(Object.entries(headers)); this.headers.has = this.headers.has.bind(this.headers); }
  clone() { return new Reponse(this.corps, { ok: this.ok, type: this.type, headers: Object.fromEntries(this.headers) }); }
  async text() { return this.corps; }
  static error() { return new Reponse('erreur', { ok: false, type: 'error' }); }
}
class Requete { constructor(url, o = {}) { this.url = new URL(url, ORIGINE + '/').href; this.method = o.method || 'GET'; this.mode = o.mode || 'cors'; } }

function creer({ reseau }) {
  const magasin = new Map(); // nom -> Map(url -> reponse)
  const cle = (r) => (typeof r === 'string' ? new URL(r, ORIGINE + '/').href : r.url);
  const ouvrir = (nom) => { if (!magasin.has(nom)) magasin.set(nom, new Map()); const m = magasin.get(nom); return {
    put: async (r, rep) => { m.set(cle(r), rep); },
    add: async (r) => { const rep = await ctx.fetch(r); if (!rep.ok) throw Error('échec'); m.set(cle(r), rep); },
    match: async (r) => m.get(cle(r)), keys: async () => [...m.keys()].map((u) => new Requete(u)), delete: async (r) => m.delete(cle(r)) }; };
  const caches = { open: async (n) => ouvrir(n), keys: async () => [...magasin.keys()], delete: async (n) => magasin.delete(n),
    match: async (r) => { for (const m of magasin.values()) { const h = m.get(cle(r)); if (h) return h; } } };
  const ecouteurs = {};
  const self = { location: { origin: ORIGINE }, addEventListener: (e, f) => { ecouteurs[e] = f; }, skipWaiting() {}, clients: { claim: async () => {} } };
  const appels = [];
  const ctx = { self, caches, URL, Request: Requete, Response: Reponse, Promise, Error, Set, Map, Math, fetch: async (r) => { const u = new URL(typeof r === 'string' ? r : r.url, ORIGINE + '/'); appels.push(u.pathname); return reseau(u.pathname, r); } };
  vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), ctx);
  const attendre = async (type, ev = {}) => { const att = []; ev.waitUntil = (p) => att.push(p); ecouteurs[type](ev); await Promise.all(att); };
  const requete = async (req) => { let rep; const att = []; await ecouteurs.fetch({ request: req, respondWith: (p) => { rep = p; }, waitUntil: (p) => att.push(p) }); const r = rep ? await rep : undefined; await Promise.all(att); return r; };
  return { magasin, attendre, requete, appels };
}
const HTML = '<link rel="stylesheet" href="assets/a.css"><script defer src="assets/a.js"></script><img src="assets/logo.webp"><a href="https://autre.example/x">';

test('installation : les fichiers de index.html sont installés d\'avance, un fichier manquant ne bloque rien', async () => {
  const sw = creer({ reseau: async (p) => (p.endsWith('/index.html') ? new Reponse(HTML) : p.endsWith('/a.css') ? new Reponse('', { ok: false }) : new Reponse('x')) });
  await sw.attendre('install');
  const shell = sw.magasin.get('koki-shell-v3');
  for (const u of ['index.html', 'assets/a.js', 'assets/logo.webp', 'manifest.webmanifest', 'assets/leaflet/leaflet.js', 'assets/leaflet/leaflet.css'])
    assert.ok(shell.has(new URL(u, ORIGINE + '/').href), u);
  assert.ok(!shell.has(new URL('assets/a.css', ORIGINE + '/').href), 'le fichier en échec est ignoré, sans erreur');
});

test('jamais gardé : autre origine, backend.json, config, réponses privées ou avec cookie, échecs', async () => {
  const sw = creer({ reseau: async (p) => (p.includes('prive') ? new Reponse('x', { headers: { 'cache-control': 'private' } }) : p.includes('cookie') ? new Reponse('x', { headers: { 'set-cookie': 'a=b' } }) : p.includes('erreur') ? new Reponse('x', { ok: false }) : new Reponse('ok')) });
  await sw.requete(new Requete('https://qsbmzzbiztfqysstepxm.supabase.co/rest/v1/rpc/koki_public_feed', { method: 'POST' }));
  assert.equal(sw.appels.length, 0, 'une requête hors du site n\'est pas interceptée');
  for (const chemin of ['assets/portail/backend.json', 'assets/transport/config.json', 'assets/prive.js', 'assets/cookie.js', 'assets/erreur.js']) await sw.requete(new Requete(chemin));
  const gardes = [...sw.magasin.values()].flatMap((m) => [...m.keys()]);
  assert.deepEqual(gardes, []);
  await sw.requete(new Requete('assets/public.js'));
  assert.equal([...sw.magasin.get('koki-runtime-v3').keys()].length, 1);
});

test('cache runtime borné : les plus anciennes entrées sont retirées', async () => {
  const sw = creer({ reseau: async () => new Reponse('ok') });
  for (let i = 0; i < 135; i++) await sw.requete(new Requete(`assets/f${i}.js`));
  const cles = [...sw.magasin.get('koki-runtime-v3').keys()];
  assert.equal(cles.length, 120);
  assert.ok(!cles.some((u) => u.endsWith('/f0.js')) && cles.some((u) => u.endsWith('/f134.js')));
});

test('hors ligne : la page et les fichiers gardés restent disponibles, navigation de repli sur index.html', async () => {
  let enLigne = true;
  const sw = creer({ reseau: async (p) => { if (!enLigne) throw Error('hors ligne'); return p.endsWith('/index.html') ? new Reponse(HTML) : new Reponse('contenu ' + p); } });
  await sw.attendre('install');
  await sw.requete(new Requete('assets/a.js'));
  enLigne = false;
  assert.equal((await sw.requete(new Requete('assets/a.js'))).corps, 'contenu /assets/a.js');
  assert.equal((await sw.requete(new Requete('/rubrique/inconnue', { mode: 'navigate' }))).corps, HTML);
  assert.equal((await sw.requete(new Requete('assets/jamais-vu.js'))).ok, false);
});

test('un fichier du shell mis à jour en ligne remplace la copie d\'origine (pas de version périmée)', async () => {
  let version = 1;
  const sw = creer({ reseau: async (p) => (p.endsWith('/index.html') ? new Reponse(HTML) : new Reponse('v' + version)) });
  await sw.attendre('install');
  version = 2;
  await sw.requete(new Requete('assets/a.js'));
  assert.equal((await sw.magasin.get('koki-shell-v3').get(new URL('assets/a.js', ORIGINE + '/').href)).corps, 'v2');
});

test('activation : anciennes versions de caches supprimées, cache des livres conservé', async () => {
  const sw = creer({ reseau: async () => new Reponse('ok') });
  for (const n of ['koki-shell-v1', 'koki-runtime-v1', 'koki-livres-v1', 'koki-shell-v3']) sw.magasin.set(n, new Map());
  await sw.attendre('activate');
  assert.deepEqual([...sw.magasin.keys()].sort(), ['koki-livres-v1', 'koki-shell-v3']);
});
