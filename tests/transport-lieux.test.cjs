const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const carte = JSON.parse(fs.readFileSync('assets/koki-carte.json', 'utf8'));
const app = fs.readFileSync('assets/transport/app.js', 'utf8');
const css = fs.readFileSync('assets/transport/style.css', 'utf8');

test('lieux de transport : noms uniques, sans faute, avec coordonnées dans la zone de Koki', () => {
  const noms = carte.lieux.map(l => l.nom);
  assert.equal(new Set(noms).size, noms.length);
  for (const l of carte.lieux) {
    assert.ok(l.nom && l.nom.trim() === l.nom, l.id);
    assert.ok(l.latitude > 15.2 && l.latitude < 15.8 && l.longitude > -16.3 && l.longitude < -15.7, l.nom);
    assert.doesNotMatch(l.nom, /Ecole|élémenatire|^(Lieu de culte|Château d’eau|Marché|Bureau de poste)$/);
    if (l.nomCalcule) assert.ok(l.nomOSM !== undefined);
  }
});

test('listes regroupées par catégorie et triées, structures de santé publiées ajoutées', () => {
  assert.match(app, /document\.createElement\('optgroup'\)/);
  assert.match(app, /localeCompare\(b\.nom, 'fr'\)/);
  assert.match(app, /lieuxTransport\.get\(valeur\)/);
  assert.match(app, /KokiSanteContract\.decode\(row\)/);
  assert.match(app, /v\.latitude == null \|\| v\.longitude == null/);
});

test('« Placer sur la carte » amène la carte à l’écran avec une consigne annulable', () => {
  assert.match(app, /zone\.scrollIntoView\(/);
  assert.match(app, /tr-consigne/);
  assert.match(app, /cree\('button', 'Annuler'\)/);
  assert.match(app, /consigneCarte\(null\)/);
  assert.match(css, /\.tr-consigne \{/);
  assert.match(css, /tr-mode-placement/);
});

test('tous les lieux proposés sont à l’intérieur de la limite de Koki', () => {
  const poly = carte.limite.coordinates[0];
  const dedans = (lon, lat) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [x1, y1] = poly[i], [x2, y2] = poly[j]; if ((y1 > lat) !== (y2 > lat) && lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1) c = !c; } return c; };
  for (const l of carte.lieux) assert.ok(dedans(l.longitude, l.latitude), l.nom + ' est hors de Koki');
  assert.ok(!carte.lieux.some(l => / à \d+(,\d)? km au /.test(l.nom)));
});
