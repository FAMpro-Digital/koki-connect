'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const etat = () => import('../assets/business/business-state.js');

const catalogue = [
  { id: 'b1', kind: 'boutiques', nom: 'Boutique Un', adresse: 'Koki centre' },
  { id: 'b2', kind: 'boutiques', nom: 'Boutique Deux', adresse: 'Marché' },
  { id: 'p1', kind: 'produits', parent_id: 'b1', nom: 'Riz parfumé', categorie: 'Alimentation', stock: 5 },
  { id: 'p2', kind: 'produits', parent_id: 'b1', nom: 'Huile', categorie: 'Alimentation', stock: 0 },
  { id: 'p3', kind: 'produits', parent_id: 'b2', nom: 'Thé', categorie: 'Boissons', stock: 3 },
];
function stockage() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
}

test('panier : ne garde que identifiant et quantité (ni prix, ni adresse, ni secret)', async () => {
  const { createCartStore } = await etat();
  const s = stockage();
  const store = createCartStore(s, 'u1');
  assert.equal(store.save([{ id: 'p1', quantity: 2, price: 999, adresse: 'privée', token: 'secret' }]), true);
  const brut = JSON.parse(s.m.get('koki.cart.v1.u1'));
  assert.deepEqual(brut.items, [{ id: 'p1', quantity: 2 }]);
  assert.doesNotMatch(s.m.get('koki.cart.v1.u1'), /999|privée|secret/);
});

test('panier : restauration depuis le catalogue serveur (stock, une seule boutique, doublons, quantités)', async () => {
  const { createCartStore } = await etat();
  const s = stockage();
  const store = createCartStore(s, 'u1');
  store.save([{ id: 'p1', quantity: 99 }, { id: 'p1', quantity: 1 }, { id: 'p2', quantity: 1 }, { id: 'p3', quantity: 1 }, { id: 'inconnu', quantity: 1 }, { id: 'p1', quantity: 0 }]);
  const lignes = store.restore(catalogue);
  assert.deepEqual(lignes.map((l) => [l.id, l.quantity]), [['p1', 5]], 'plafonné au stock ; rupture, doublon, autre boutique et inconnu ignorés');
});

test('panier : expiration à 7 jours, version, contenu altéré ou volumineux', async () => {
  const { createCartStore } = await etat();
  let maintenant = 1_000_000;
  const s = stockage();
  const store = createCartStore(s, 'u1', { now: () => maintenant });
  store.save([{ id: 'p1', quantity: 1 }]);
  maintenant += 7 * 86400000 - 1;
  assert.equal(store.restore(catalogue).length, 1);
  maintenant += 1;
  assert.deepEqual(store.restore(catalogue), []);
  for (const brut of ['pas du json', '{"version":2,"expires":9e15,"items":[]}', '{"version":1,"expires":9e15,"items":"x"}', 'x'.repeat(20001), 'null']) {
    s.m.set('koki.cart.v1.u1', brut);
    assert.deepEqual(store.restore(catalogue), [], brut.slice(0, 20));
  }
});

test('panier : séparé par compte, effacé à la demande, stockage indisponible sans erreur', async () => {
  const { createCartStore } = await etat();
  const s = stockage();
  const a = createCartStore(s, 'A'), b = createCartStore(s, 'B');
  a.save([{ id: 'p1', quantity: 1 }]);
  assert.deepEqual(b.restore(catalogue), []);
  a.clear();
  assert.equal(s.m.size, 0);
  const casse = createCartStore({ setItem() { throw Error('plein'); }, getItem() { throw Error('x'); }, removeItem() { throw Error('x'); } }, 'A');
  assert.equal(casse.save([{ id: 'p1', quantity: 1 }]), false);
  assert.deepEqual(casse.restore(catalogue), []);
  casse.clear();
  assert.equal(createCartStore(null, 'A').save([]), false);
});

test('observateur de statuts : signale uniquement les changements', async () => {
  const { createStatusObserver } = await etat();
  const o = createStatusObserver();
  assert.deepEqual(o.observe([{ id: '1', kind: 'courses', statut: 'En attente' }]), []);
  assert.deepEqual(o.observe([{ id: '1', kind: 'courses', statut: 'Acceptée' }, { id: '2', kind: 'commandes', statut: 'Commande reçue' }]), [{ id: '1', kind: 'courses', status: 'Acceptée' }]);
  assert.deepEqual(o.observe([{ id: '1', kind: 'courses', statut: 'Acceptée' }]), []);
  o.reset();
  assert.deepEqual(o.observe([{ id: '1', kind: 'courses', statut: 'Terminée' }]), []);
});

test('étapes de suivi : course, commande livrée ou retrait, demande de service', async () => {
  const { statusSteps } = await etat();
  assert.equal(statusSteps({ kind: 'courses' }).at(-1), 'Terminée');
  assert.equal(statusSteps({ kind: 'commandes', payload: { mode: 'retrait' } }).at(-1), 'Retirée');
  assert.equal(statusSteps({ kind: 'commandes', payload: { mode: 'livraison' } }).at(-1), 'Livrée');
  assert.equal(statusSteps({ kind: 'demandes_services' })[0], 'Demande envoyée');
});

test('recherche : sans accent ni casse, filtre par catégorie et disponibilité', async () => {
  const { searchText, searchCatalogue, catalogueCategories, filterBusinessRows, searchDrivers } = await etat();
  assert.equal(searchText('  Thé À la MENTHE '), 'the a la menthe');
  assert.equal(searchText(null), '');
  assert.deepEqual(searchCatalogue(catalogue, { query: 'the' }).map((p) => p.id), ['p3']);
  assert.deepEqual(searchCatalogue(catalogue, { query: 'boutique un' }).map((p) => p.id), ['p1', 'p2'], 'recherche aussi par boutique');
  assert.deepEqual(searchCatalogue(catalogue, { available: true, category: 'Alimentation' }).map((p) => p.id), ['p1']);
  assert.deepEqual(catalogueCategories(catalogue, 'produits'), ['Alimentation', 'Boissons']);
  const rows = [{ id: 'x1', statut: 'Actif', payload: { nom: 'Épicerie', immatriculation: 'DK-1' } }, { id: 'x2', statut: 'Suspendu', payload: { nom: 'Taxi' } }];
  assert.deepEqual(filterBusinessRows(rows, 'épic').map((r) => r.id), ['x1']);
  assert.deepEqual(filterBusinessRows(rows, '', 'Suspendu').map((r) => r.id), ['x2']);
  assert.deepEqual(searchDrivers([{ name: 'Moussa', category: 'Taxi', proximity: 'À proximité' }, { name: 'Awa', category: 'Moto' }], 'taxi prox').map((d) => d.name), ['Moussa']);
});

test('supervision : comptage par état', async () => {
  const { supervision } = await etat();
  const s = supervision([{ statut: 'En attente' }, { statut: 'Acceptée' }, { statut: 'Livrée' }, { statut: 'Annulée' }, { statut: 'Actif' }]);
  assert.deepEqual(s, { loaded: 5, waiting: 1, active: 2, finished: 1, stopped: 1 });
});
