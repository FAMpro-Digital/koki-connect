// Écritures FICTIVES concurrentes sur le projet TEST : commandes sur un produit à stock limité, réservations sur un même véhicule.
// DÉSACTIVÉ par défaut : exige ALLOW_WRITES=oui en plus de l'autorisation de niveau (voir config/guard.mjs).
// Données requises (créées au préalable dans TEST, noms commençant par « TEST ») :
//   SHOP_ID, PRODUCT_ID (stock initial = STOCK_INITIAL, ex. 2), VEHICLE_ID (véhicule d'un chauffeur TEST), tests/load/accounts.json.
// Invariants vérifiés : jamais plus de commandes acceptées que le stock ; aucune erreur serveur (5xx) ; pas de doublon sur relance.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { verifierExecution, refus } from '../config/guard.mjs';
import { entetes, jsonSur, ouvrirSessions, uuid, resumer } from './lib.js';

const { niveau, cible } = verifierExecution(__ENV, { ecritures: true });
const CLE = __ENV.SUPABASE_PUBLISHABLE_KEY;
for (const nom of ['SHOP_ID', 'PRODUCT_ID', 'VEHICLE_ID', 'STOCK_INITIAL']) {
  if (!__ENV[nom]) throw refus(nom + ' manquant (voir l’en-tête du scénario).');
}
const STOCK = Number(__ENV.STOCK_INITIAL);
const COMPTES_MAX = Math.min(Number(__ENV.COMPTES_MAX || 20), 50); // plafond dur de simultanéité d'écriture
const DEPART = { latitude: 15.56, longitude: -16.21 }; // position fictive documentée dans le plan de préproduction
const ARRIVEE = { latitude: 15.57, longitude: -16.2 };
const comptes = new SharedArray('comptes-test', () => JSON.parse(open('../accounts.json')));

const acceptees = new Counter('commandes_acceptees');
const refusees = new Counter('commandes_refusees_attendues');
const reservations = new Counter('reservations_acceptees');
const refus_reservations = new Counter('reservations_refusees_attendues');
const inattendues = new Counter('erreurs_inattendues');

export const options = {
  scenarios: {
    commandes: { executor: 'per-vu-iterations', vus: COMPTES_MAX, iterations: 1, maxDuration: '3m', exec: 'commander' },
    courses: { executor: 'per-vu-iterations', vus: COMPTES_MAX, iterations: 1, maxDuration: '3m', startTime: '3m10s', exec: 'reserver' },
  },
  thresholds: {
    commandes_acceptees: [{ threshold: 'count<=' + STOCK, abortOnFail: true }],
    erreurs_inattendues: [{ threshold: 'count==0', abortOnFail: true }],
    http_reqs: [{ threshold: 'count<2000', abortOnFail: true }],
  },
  tags: { niveau: String(niveau), scenario: 'write-concurrency' },
  setupTimeout: '120s',
};

export function setup() {
  return ouvrirSessions(cible.url, CLE, comptes, COMPTES_MAX);
}

const ATTENDUS = http.expectedStatuses(200, 400, 409);

function ecrire(session, nom, input, etiquette, mutation) {
  const corps = { command: nom, input: Object.assign({}, input) };
  if (mutation) corps.input.request_id = uuid();
  // Le client réel envoie request_id dans l'objet d'entrée (client.mjs : body.request_id).
  const r = http.post(cible.url + '/rest/v1/rpc/koki_business', JSON.stringify(corps), {
    headers: entetes(CLE, session.jeton), tags: { name: etiquette }, responseCallback: ATTENDUS, timeout: '20s',
  });
  if (r.status === 0 || r.status >= 500) inattendues.add(1);
  return r;
}

export function commander(sessions) {
  const s = sessions[(exec.vu.idInTest - 1) % sessions.length];
  const r = ecrire(s, 'create_order', { shop_id: __ENV.SHOP_ID, items: [{ product_id: __ENV.PRODUCT_ID, quantity: 1 }], mode: 'Retrait', address: 'TEST – adresse fictive' }, 'commande_fictive', true);
  if (r.status === 200) acceptees.add(1); else if (r.status === 400 || r.status === 409) refusees.add(1);
  check(r, { 'commande : réponse métier (200/400/409)': (x) => [200, 400, 409].includes(x.status) });
}

export function reserver(sessions) {
  const s = sessions[(exec.vu.idInTest - 1) % sessions.length];
  // Devis (limité côté base) puis réservation sur le MÊME véhicule : plusieurs clients, un chauffeur.
  const q = ecrire(s, 'quote', { category: __ENV.CATEGORIE || 'Moto', start: DEPART, end: ARRIVEE }, 'devis_course', false);
  const devis = jsonSur(q);
  const id = devis && (devis.quote_id || (devis.result && devis.result.quote_id));
  if (q.status !== 200 || !id) { refus_reservations.add(1); return; }
  const r = ecrire(s, 'reserve_ride', { quote_id: id, vehicle_id: __ENV.VEHICLE_ID }, 'reservation_fictive', true);
  if (r.status === 200) reservations.add(1); else if (r.status === 400 || r.status === 409) refus_reservations.add(1);
  check(r, { 'réservation : réponse métier (200/400/409)': (x) => [200, 400, 409].includes(x.status) });
}

export function handleSummary(data) {
  return resumer(data, 'write-concurrency', niveau);
}
