// Lieux de la carte gérés dans Koki Connect Admin : contrat commun, fusion avec la carte intégrée, accueil et recherche.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const crypto = require('node:crypto');
require('../assets/portail/lieu-contract.js');
const L = globalThis.KokiLieuContract;
const carte = JSON.parse(fs.readFileSync('assets/koki-carte.json', 'utf8'));
const html = require('./_aide.cjs').accueil();
const portail = fs.readFileSync('assets/portail/app.js', 'utf8');
const runtime = fs.readFileSync('assets/business/runtime.mjs', 'utf8');
const catalogue = fs.readFileSync('assets/business/catalogue.mjs', 'utf8');
// Empreintes vérifiées aussi dans l'admin (tests/lieux-admin.test.js).
const EMPREINTE = 'c5c581043dc9116c1b03abe5aa5ce36260cffe8c58535fa766ad1092c956107e', REFERENCE = '8763e5d4991b0f287b2e171a65e5db09e98d098daf720a92ba402b5dc6500320';
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const row = (titre, v, extra = {}) => ({ id: 'id-' + titre, type: 'Informations utiles', categorie: 'Lieux de la carte', titre, resume: 'r', lieu: 'Koki', statut: 'publié', publication: '2026-10-01T00:00:00Z', texte: L.encode(v), ...extra });

test('contrat Lieux et lieux de référence : identiques à l’administration', () => {
  assert.equal(sha(fs.readFileSync('assets/portail/lieu-contract.js')), EMPREINTE);
  const ref = carte.lieux.map(({ id, nom, categorie, latitude, longitude }) => ({ id, nom, categorie, latitude, longitude }));
  assert.equal(sha(JSON.stringify(ref)), REFERENCE, 'carte modifiée : régénérer src/carte-reference.js dans l’admin et mettre à jour les deux empreintes');
});

test('fusion : un lieu ajouté (Services publics), une correction, un masquage', () => {
  const [a, b] = carte.lieux;
  const lieux = L.fusionner(carte.lieux, [
    row('Mairie de Koki', { genre: 'Services publics', latitude: 15.506, longitude: -15.992 }),
    row('Château d’eau principal', { genre: 'Eau', latitude: a.latitude, longitude: a.longitude, remplace: a.id }),
    row(b.nom, { genre: 'Eau', latitude: b.latitude, longitude: b.longitude, remplace: b.id, masque: true })]);
  assert.equal(lieux.length, carte.lieux.length);
  const mairie = lieux.find(l => l.nom === 'Mairie de Koki');
  assert.equal(mairie.categorie, 'Services publics'); assert.equal(mairie.position, 'Lieu publié par Koki Connect');
  assert.equal(lieux.find(l => l.id === a.id).nom, 'Château d’eau principal');
  assert.ok(!lieux.some(l => l.id === b.id));
});

test('carte, Autour de moi et Transport utilisent les mêmes lieux fusionnés', () => {
  assert.match(html, /const lieux = lieuxAvecPublications\(donnees\.lieux, await contenusPublies\(\)\);/);
  assert.match(html, /const lieux = L \? L\.fusionner\(reference, rows\) : \[\.\.\.reference\];/);
  assert.match(html, /return \(flux\.contenus \|\| \[\]\)\.filter\(x => !C \|\| C\.visible\(x\)\);\n\s+\} catch \(_\) \{ return \[\]; \}/, 'sans serveur, la carte intégrée reste affichée');
  const i = html.indexOf('assets/portail/lieu-contract.js'), j = html.indexOf('assets/portail/sante-contract.js'), k = html.indexOf('assets/portail/app.js"');
  assert.ok(i > 0 && j > i && k > j, 'contrats chargés avant le portail');
  assert.match(html, /if \(lieu\.description\) \{ const d = document\.createElement\('p'\); d\.textContent = lieu\.description;/);
});

test('accueil : les lieux ne sont pas des publications ; recherche : commerces validés du serveur', () => {
  assert.match(portail, /!\(x\.type==='Informations utiles'&&x\.categorie==='Lieux de la carte'\)/);
  assert.match(portail, /KokiBusiness\.catalogueRecherche\(\)\.catch\(\(\)=>\[\]\)/);
  assert.match(portail, /ouvrir:\(\)=>KokiBusiness\.ouvrirFiche\(x\.id\)/);
  assert.match(runtime, /indexCatalogue\(await api\.catalog\(\)\)\.liste/);
  assert.match(runtime, /if\(!api\?\.enabled\|\|modules\.commerce===false\)return \[\];/);
  assert.match(runtime, /window\.KokiBusiness=\{show,catalogueRecherche,ouvrirFiche,/);
  assert.match(catalogue, /ouvrir:id=>\{if\(idx\?\.get\(id\)\)go\('fiche',\{id\}\);\}/);
});
