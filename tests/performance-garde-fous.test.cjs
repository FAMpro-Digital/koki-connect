'use strict';
// Garde-fous de la suite de performance (tests/load, tests/e2e). Fonctionne hors ligne, sans k6 ni Playwright :
// vérifie que les protections contre la production, les dépenses et les interdictions de Vercel Hobby ne peuvent pas être retirées par erreur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const racine = path.join(__dirname, '..');
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8');
const importer = (p) => import(pathToFileURL(path.join(racine, p)).href);
const REF_TEST = 'abcdefghij0123456789';
const URL_TEST = 'https://' + REF_TEST + '.supabase.co';
const CLE = 'sb_publishable_exemple';
const base = (extra) => ({ NIVEAU: '100', SUPABASE_URL: URL_TEST, KOKI_TEST_PROJECT_REF: REF_TEST, SUPABASE_PUBLISHABLE_KEY: CLE, AUTORISATION_CHARGE: 'OUI-100-' + REF_TEST, ...extra });

function fichiers(dossier, motif) {
  const sortie = [];
  for (const nom of fs.readdirSync(path.join(racine, dossier), { withFileTypes: true })) {
    if (nom.name === 'node_modules' || nom.name === 'test-results' || nom.name === 'playwright-report') continue;
    const rel = path.posix.join(dossier, nom.name);
    if (nom.isDirectory()) sortie.push(...fichiers(rel, motif)); else if (motif.test(nom.name)) sortie.push(rel);
  }
  return sortie;
}

test('garde-fou : la production et les projets bloqués sont toujours refusés', async () => {
  const { verifierExecution, cibleSupabase } = await importer('tests/load/config/guard.mjs');
  for (const ref of ['qsbmzzbiztfqysstepxm', 'paegdthtusbwxuarhacb']) {
    const url = 'https://' + ref + '.supabase.co';
    assert.throws(() => cibleSupabase({ SUPABASE_URL: url, KOKI_TEST_PROJECT_REF: ref }), /REFUS KOKI/);
    assert.throws(() => verifierExecution(base({ SUPABASE_URL: url, KOKI_TEST_PROJECT_REF: ref, AUTORISATION_CHARGE: 'OUI-100-' + ref })), /REFUS KOKI/);
  }
  // Une référence TEST déclarée ne doit pas servir à viser la production.
  assert.throws(() => verifierExecution(base({ SUPABASE_URL: 'https://qsbmzzbiztfqysstepxm.supabase.co' })), /REFUS KOKI/);
});

test('garde-fou : seul le projet TEST déclaré, avec autorisation propre au niveau, est accepté', async () => {
  const { verifierExecution, autorisationAttendue } = await importer('tests/load/config/guard.mjs');
  assert.equal(autorisationAttendue(500, REF_TEST), 'OUI-500-' + REF_TEST);
  assert.equal(verifierExecution(base()).niveau, 100);
  assert.throws(() => verifierExecution(base({ AUTORISATION_CHARGE: undefined })), /autorisation/);
  assert.throws(() => verifierExecution(base({ AUTORISATION_CHARGE: 'OUI-500-' + REF_TEST })), /autorisation/); // autre niveau
  assert.throws(() => verifierExecution(base({ AUTORISATION_CHARGE: 'OUI-100-zzzzzzzzzzzzzzzzzzzz' })), /autorisation/); // autre projet
  assert.throws(() => verifierExecution(base({ KOKI_TEST_PROJECT_REF: undefined })), /KOKI_TEST_PROJECT_REF/);
  assert.throws(() => verifierExecution(base({ KOKI_TEST_PROJECT_REF: 'zzzzzzzzzzzzzzzzzzzz' })), /ne correspond pas/);
  assert.throws(() => verifierExecution(base({ SUPABASE_URL: 'https://exemple.com' })), /REFUS KOKI/);
  assert.throws(() => verifierExecution(base({ NIVEAU: '777' })), /NIVEAU/);
});

test('garde-fou : clé secrète refusée, écritures désactivées par défaut', async () => {
  const { verifierExecution } = await importer('tests/load/config/guard.mjs');
  assert.throws(() => verifierExecution(base({ SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.service_role' })), /publishable/);
  assert.throws(() => verifierExecution(base(), { ecritures: true }), /ALLOW_WRITES/);
  assert.equal(verifierExecution(base({ ALLOW_WRITES: 'oui' }), { ecritures: true }).niveau, 100);
});

test('garde-fou : aucun test de charge distant sur le site statique (Vercel Hobby)', async () => {
  const { verifierExecution } = await importer('tests/load/config/guard.mjs');
  for (const cible of ['https://koki-connect.vercel.app', 'https://koki-connect-admin.vercel.app', 'https://exemple.vercel.app', 'https://exemple.com']) {
    assert.throws(() => verifierExecution(base({ BASE_URL: cible })), /BASE_URL/);
  }
  assert.equal(verifierExecution(base({ BASE_URL: 'http://127.0.0.1:4173' })).niveau, 100);
});

test('garde-fou : base locale (boucle locale) acceptée sans autorisation distante', async () => {
  const { verifierExecution } = await importer('tests/load/config/guard.mjs');
  const env = { NIVEAU: '100', SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_PUBLISHABLE_KEY: CLE };
  assert.equal(verifierExecution(env).cible.local, true);
});

test('niveaux : 100, 500, 1 000 et 5 000 utilisateurs virtuels, montée progressive, plafonds de dépense', async () => {
  const { NIVEAUX_CONFIG, NIVEAU_PRECEDENT } = await importer('tests/load/config/levels.mjs');
  const { NIVEAUX } = await importer('tests/load/config/guard.mjs');
  assert.deepEqual(NIVEAUX, [100, 500, 1000, 5000]);
  let precedentMax = 0;
  for (const n of NIVEAUX) {
    const c = NIVEAUX_CONFIG[n];
    const cibles = c.etapes.map((e) => e.target);
    assert.equal(Math.max(...cibles), n, 'pic = niveau ' + n);
    assert.equal(cibles.at(-1), 0, 'descente finale à 0');
    const minutes = parseInt(c.etapes[0].duration, 10);
    assert.ok(/m$/.test(c.etapes[0].duration) && minutes >= 2, 'la première montée dure au moins 2 minutes (départ à 0, jamais de saut au maximum)');
    assert.ok(c.maxRequetes > 0 && c.budgetSortieMo > 0);
    assert.ok(c.maxRequetes > precedentMax, 'plafond croissant');
    precedentMax = c.maxRequetes;
  }
  assert.deepEqual(NIVEAU_PRECEDENT, { 100: null, 500: 100, 1000: 500, 5000: 1000 });
});

test('seuils : arrêt automatique sur erreurs, latence extrême, volume, requêtes et itérations perdues', async () => {
  const { seuils } = await importer('tests/load/thresholds/thresholds.mjs');
  for (const n of [100, 500, 1000, 5000]) {
    const s = seuils(n);
    for (const metrique of ['http_req_failed', 'checks', 'http_reqs', 'data_received', 'dropped_iterations']) {
      assert.ok(s[metrique].some((t) => typeof t === 'object' && t.abortOnFail === true), metrique + ' doit pouvoir arrêter le test (niveau ' + n + ')');
    }
    assert.ok(s.http_req_duration.some((t) => typeof t === 'object' && t.abortOnFail === true));
  }
});

test('scénarios : chacun appelle les garde-fous avant toute requête, sans clé secrète', () => {
  for (const f of fichiers('tests/load/scenarios', /\.js$/)) {
    const code = lire(f);
    if (!/lib\.js$/.test(f)) assert.match(code, /verifierExecution\(__ENV/, f + ' doit appeler verifierExecution');
    assert.doesNotMatch(code, /service_role|SERVICE_ROLE|secret/i, f + ' ne doit contenir aucune clé secrète');
  }
  assert.match(lire('tests/load/scenarios/write-concurrency.js'), /ecritures: true/);
});

test('références de production : uniquement dans les listes de blocage et le serveur de test local', () => {
  const autorises = new Set(['tests/load/config/guard.mjs', 'tests/e2e/helpers/isolation.mjs', 'tests/e2e/serve-static.mjs']);
  for (const f of [...fichiers('tests/load', /\.(m?js|json)$/), ...fichiers('tests/e2e', /\.(m?js|json)$/)]) {
    if (autorises.has(f)) continue;
    assert.doesNotMatch(lire(f), /qsbmzzbiztfqysstepxm|paegdthtusbwxuarhacb/, f + ' ne doit pas citer la production');
  }
  assert.doesNotMatch(lire('tests/e2e/helpers/isolation.mjs').replace(/REFERENCES_INTERDITES = \[[^\]]*\]/, ''), /qsbmzzbiztfqysstepxm/);
});

test('e2e : les sélecteurs utilisés existent dans index.html', () => {
  const html = lire('index.html');
  for (const id of ['vue-portail', 'vue-transport', 'vue-commerce']) assert.match(html, new RegExp('id="' + id + '"'), id);
  for (const nom of ['accueil', 'transport', 'boutique', 'activite', 'profil']) assert.match(html, new RegExp('data-nav="' + nom + '"'), nom);
  assert.match(html, /aria-label="Navigation principale"/);
  assert.match(html, /aria-label="Que recherchez-vous à Koki \?"/);
  assert.match(html, /class="raccourci"[^>]*data-recherche="Transport"|data-recherche="Transport"[^>]*class="raccourci"/);
  assert.match(html, /<title>Koki Connect[^<]*<\/title>/);
});

test('workflow performance : déclenchement manuel uniquement, validation par environnement protégé, actions épinglées', () => {
  const y = lire('.github/workflows/performance.yml');
  const declencheurs = y.slice(y.indexOf('\non:'), y.indexOf('\npermissions:'));
  assert.match(declencheurs, /workflow_dispatch/);
  assert.doesNotMatch(declencheurs, /\b(push|pull_request|schedule|pull_request_target|workflow_run)\b/);
  assert.match(y, /environment:\s*koki-performance-test/);
  assert.match(y, /permissions:\s*\n\s*contents: read/);
  for (const m of y.matchAll(/uses:\s*([^\s#]+)/g)) assert.match(m[1], /@[0-9a-f]{40}$/, 'action non épinglée : ' + m[1]);
  assert.doesNotMatch(y, /vercel\.app|qsbmzzbiztfqysstepxm|paegdthtusbwxuarhacb/);
});

test('vercel.json : la branche de performance ne déclenche aucun aperçu relié à la production', () => {
  const v = JSON.parse(lire('vercel.json'));
  assert.equal(v.git.deploymentEnabled['test/koki-connect-performance'], false);
});

test('les fichiers locaux sensibles ne sont pas versionnables', () => {
  const gi = lire('.gitignore');
  assert.match(gi, /tests\/load\/accounts\.json/);
  assert.match(gi, /tests\/load\/reports\/\*\.json/);
});
