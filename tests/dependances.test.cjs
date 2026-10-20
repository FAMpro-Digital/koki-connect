'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');

const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');

test('bibliothèques embarquées : empreintes connues (toute modification doit être volontaire et documentée)', () => {
  assert.equal(sha('assets/leaflet/leaflet.js'), 'db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a');
  assert.equal(sha('assets/leaflet/leaflet.css'), 'a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6');
  assert.equal(sha('assets/business/vendor/supabase-2.117.3.js'), 'd6a5c4414a5d4ce646d9c1de223aa7067d3ff664c15394ffeb7fcffc763354a3');
  assert.match(fs.readFileSync('assets/leaflet/leaflet.js', 'utf8').slice(0, 120), /Leaflet 1\.9\.4/);
});

test('package.json : outils de développement uniquement, le déploiement Vercel reste statique', () => {
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(p.private, true);
  assert.equal(p.dependencies, undefined, 'aucune dépendance de production');
  for (const interdit of ['build', 'vercel-build', 'start', 'dev', 'postinstall', 'install', 'prepare']) assert.equal(p.scripts[interdit], undefined, interdit);
  for (const [nom, version] of Object.entries(p.devDependencies)) assert.match(version, /^\d+\.\d+\.\d+$/, nom + ' : version épinglée exactement');
});

test('tout fichier du site référencé par index.html existe', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const manquants = [...html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)].map((m) => m[1]).filter((f) => !fs.existsSync(f));
  assert.deepEqual(manquants, []);
});

test('vercel.json : aucune installation de dépendances au déploiement (les outils de développement ne sont jamais installés)', () => {
  const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.match(v.installCommand, /^echo /);
  assert.equal(v.buildCommand, undefined, 'la commande de build éventuelle reste celle de Vercel (non modifiée ici)');
});
