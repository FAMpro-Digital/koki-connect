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
