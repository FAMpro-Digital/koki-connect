// Utilisateurs connectés (comptes FICTIFS du projet TEST) : consultation de leur espace, sans aucune écriture.
// Prérequis : tests/load/accounts.json (copie de accounts.example.json, jamais versionné) avec des comptes TEST créés au préalable.
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { verifierExecution } from '../config/guard.mjs';
import { NIVEAUX_CONFIG } from '../config/levels.mjs';
import { seuils } from '../thresholds/thresholds.mjs';
import { pause, commande, lectureTable, sondeFlux, ouvrirSessions, resumer } from './lib.js';

const { niveau, cible } = verifierExecution(__ENV);
const CLE = __ENV.SUPABASE_PUBLISHABLE_KEY;
const COMPTES_MAX = Number(__ENV.COMPTES_MAX || 20);
const comptes = new SharedArray('comptes-test', () => JSON.parse(open('../accounts.json')));

export const options = {
  scenarios: {
    espace_connecte: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: NIVEAUX_CONFIG[niveau].etapes,
      gracefulRampDown: '30s',
    },
  },
  thresholds: seuils(niveau),
  tags: { niveau: String(niveau), scenario: 'authenticated-read' },
  setupTimeout: '120s',
};

export function setup() {
  sondeFlux(cible.url, CLE, niveau, 0.2);
  return ouvrirSessions(cible.url, CLE, comptes, COMPTES_MAX);
}

export default function (sessions) {
  const s = sessions[(__VU - 1) % sessions.length];

  const cat = commande(cible.url, CLE, s.jeton, 'catalog', {}, 'catalogue_connecte');
  check(cat, { 'catalogue connecté : 200': (r) => r.status === 200 });
  pause();

  const courses = commande(cible.url, CLE, s.jeton, 'history', { kind: 'courses' }, 'historique_courses');
  check(courses, { 'historique courses : 200': (r) => r.status === 200 });
  pause();

  const commandes = commande(cible.url, CLE, s.jeton, 'history', { kind: 'commandes' }, 'historique_commandes');
  check(commandes, { 'historique commandes : 200': (r) => r.status === 200 });
  pause();

  // Espace professionnel : fiches dont le compte est propriétaire (politique RLS « owner_id »).
  if (Math.random() < 0.3) {
    const mes = lectureTable(cible.url, CLE, 'koki_records?select=*&kind=eq.boutiques&owner_id=eq.' + s.uid + '&order=updated_at.desc&limit=100', s.jeton, 'mes_boutiques');
    check(mes, { 'mes fiches : 200': (r) => r.status === 200 });
    pause();
  }
}

export function handleSummary(data) {
  return resumer(data, 'authenticated-read', niveau);
}
