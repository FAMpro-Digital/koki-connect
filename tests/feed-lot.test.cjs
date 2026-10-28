'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const BASE = 'https://qsbmzzbiztfqysstepxm.supabase.co';
const contenus = [1, 2, 3].map((n) => ({ id: String(n), titre: 'T' + n, resume: 'R', statut: 'publié', image_path: `1111/000${n}.jpg` }));

function creer(lotOk) {
  const calls = [];
  const ctx = {
    URL, AbortSignal,
    fetch: async (url, options = {}) => {
      calls.push({ url, body: options.body });
      const json = (v) => ({ ok: true, json: async () => v });
      if (url.endsWith('backend.json')) return json({ url: BASE, publishableKey: 'sb_publishable_test' });
      if (url.endsWith('koki_public_feed')) return json({ version: 1, contenus });
      if (url.endsWith('/object/sign/koki-media')) {
        if (!lotOk) return { ok: false };
        const { paths } = JSON.parse(options.body);
        return json(paths.map((p) => (p.endsWith('0002.jpg') ? { path: p, error: 'x', signedURL: null } : { path: p, signedURL: `/object/sign/koki-media/${p}?token=t` })));
      }
      return json({ signedURL: `/object/sign/koki-media/${url.split('koki-media/')[1]}?token=t` });
    },
  };
  vm.runInNewContext(fs.readFileSync('assets/portail/feed.js', 'utf8'), ctx);
  return { ctx, calls };
}

test('les images du flux sont signées en une seule requête', async () => {
  const { ctx, calls } = creer(true);
  const feed = await ctx.KokiPublicFeed.charger();
  assert.equal(calls.filter((c) => c.url.includes('/object/sign/')).length, 1);
  assert.ok(feed.contenus[0].image && feed.contenus[2].image);
  assert.equal(feed.contenus[1].image, null, 'un chemin refusé n\'affiche pas d\'image');
});

test('repli image par image si la signature par lot échoue', async () => {
  const { ctx, calls } = creer(false);
  const feed = await ctx.KokiPublicFeed.charger();
  assert.equal(calls.filter((c) => /\/object\/sign\/koki-media\/1111/.test(c.url)).length, 3);
  assert.ok(feed.contenus.every((c) => c.image));
});

test('hors ligne : le dernier flux public réussi est affiché, sans images temporaires', async () => {
  const stockage = new Map();
  const { ctx } = creer(true);
  ctx.localStorage = { getItem: (k) => (stockage.has(k) ? stockage.get(k) : null), setItem: (k, v) => stockage.set(k, v) };
  const frais = await ctx.KokiPublicFeed.charger();
  assert.equal(frais.horsLigne, undefined);
  assert.ok(frais.contenus[0].image);
  ctx.fetch = async () => ({ ok: false });
  const copie = await ctx.KokiPublicFeed.charger();
  assert.equal(copie.horsLigne, true);
  assert.equal(copie.contenus.length, 3);
  assert.ok(copie.contenus.every((c) => c.image === null && c.statut === 'publié'));
});

test('hors ligne sans copie : l\'erreur est conservée ; copie altérée ou non publiée refusée', async () => {
  const { ctx } = creer(true);
  ctx.localStorage = { getItem: () => JSON.stringify({ version: 1, contenus: [{ id: '1', statut: 'brouillon' }] }), setItem() {} };
  ctx.fetch = async () => ({ ok: false });
  await assert.rejects(ctx.KokiPublicFeed.charger());
});

test('les liens valides sont réutilisés puis renouvelés après expiration', async () => {
  const { ctx, calls } = creer(false);
  let now = 1000;
  ctx.Date = { now: () => now };
  await ctx.KokiPublicFeed.charger();
  const count = () => calls.filter(c => c.url.includes('/object/sign/')).length;
  const initial = count();
  await ctx.KokiPublicFeed.charger();
  assert.equal(count(), initial);
  now += 111000;
  await ctx.KokiPublicFeed.charger();
  assert.ok(count() > initial);
});

test('actualisation : conserve le DOM si seuls les liens changent, affiche les modifications et retraits', async () => {
  const { ctx } = creer(true);
  let renders = 0;
  ctx.document = { hidden: false };
  ctx.$ = () => null;
  ctx.fusion = () => {};
  ctx.accueil = () => { renders++; };
  ctx.contenusSource = [{ id: '1', titre: 'Initial', image: 'old' }];
  let next = [{ id: '1', titre: 'Initial', image: 'new' }];
  ctx.KokiPublicFeed.charger = async () => ({ contenus: next });
  const source = fs.readFileSync('assets/portail/app.js', 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('let actualisation=false;'), source.indexOf('setInterval(actualiser')), ctx);
  await ctx.actualiser();
  assert.equal(renders, 0);
  next = [{ id: '1', titre: 'Modifié', image: 'new' }];
  await ctx.actualiser();
  assert.equal(renders, 1);
  next = [];
  await ctx.actualiser();
  assert.equal(renders, 2);
});
