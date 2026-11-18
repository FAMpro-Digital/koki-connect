'use strict';
// Séparation des environnements : la copie de test ne peut jamais viser la production.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

function preparer(env) {
  try {
    return { ok: true, out: execFileSync(process.execPath, ['scripts/prepare-preview.mjs'], { env: { ...process.env, ...env }, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) { return { ok: false, out: String(e.stderr) }; }
}

test('test : la base de production et FAMpro Évents sont refusées', () => {
  for (const ref of ['qsbmzzbiztfqysstepxm', 'paegdthtusbwxuarhacb']) {
    const r = preparer({ KOKI_ENV: 'test', KOKI_TEST_URL: `https://${ref}.supabase.co`, KOKI_TEST_PUBLISHABLE_KEY: 'sb_publishable_x' });
    assert.equal(r.ok, false); assert.match(r.out, /production est interdite/);
  }
});

test('test : clé secrète ou adresse invalide refusées', () => {
  assert.match(preparer({ KOKI_ENV: 'test', KOKI_TEST_URL: 'https://euvxtwmyoihnutifshay.supabase.co', KOKI_TEST_PUBLISHABLE_KEY: 'sb_secret_x' }).out, /publishable/);
  assert.match(preparer({ KOKI_ENV: 'test', KOKI_TEST_URL: 'http://example.com', KOKI_TEST_PUBLISHABLE_KEY: 'sb_publishable_x' }).out, /supabase\.co/);
  assert.match(preparer({ KOKI_ENV: 'preprod' }).out, /KOKI_ENV/);
});

test('test : la copie publiable ne contient plus aucune référence de production', () => {
  const r = preparer({ KOKI_ENV: 'test', KOKI_TEST_URL: 'https://euvxtwmyoihnutifshay.supabase.co', KOKI_TEST_PUBLISHABLE_KEY: 'sb_publishable_x' });
  assert.equal(r.ok, true, r.out);
  for (const f of ['dist/assets/portail/backend.json', 'dist/vercel.json']) assert.ok(!fs.readFileSync(f, 'utf8').includes('qsbmzzbiztfqysstepxm'), f);
  assert.equal(JSON.parse(fs.readFileSync('dist/assets/portail/backend.json', 'utf8')).url, 'https://euvxtwmyoihnutifshay.supabase.co');
});

test('le dépôt garde la configuration de production (aucun changement pour le site en ligne)', () => {
  assert.equal(JSON.parse(fs.readFileSync('assets/portail/backend.json', 'utf8')).url, 'https://qsbmzzbiztfqysstepxm.supabase.co');
  assert.equal(preparer({ KOKI_ENV: 'production' }).ok, true);
});
